/**
 * Reformats all policy content from plain text to structured HTML using Claude.
 * Run with: node scripts/reformat-policies.js
 */
import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'server', 'data.db');
const CONCURRENCY = 8;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You convert school district policy plain text into clean, semantic HTML.

Rules:
- Remove the document header block. It always appears at the top and consists of: lines with "Created:" and "Modified:", the policy code (a short alphanumeric code like BA, BAA, BBD, etc.) on its own line, and 1–2 subtitle lines immediately after the code that form the document title (e.g. "Board Legal Status" or "Board Members:\nEligibility and Qualifications"). These subtitle lines are NOT section headings — they merely restate the policy title. Do NOT convert them to <h2>.
- Remove any repeated header blocks that appear mid-document (multi-page PDFs concatenate headers at page breaks).
- Remove page footer lines: any line containing "All Rights Reserved", "Utah School Boards Association", or "Page X of Y".
- Convert section headings — short phrases that end with an em-dash "—" and introduce a new topic — into <h2> elements. Keep the em-dash in the heading text.
- Convert sub-section headings (clearly secondary headings, indented, or nested under a main section) into <h3> elements.
- Convert numbered list items (lines starting with 1. 2. 3. or a. b. c.) into <ol><li> elements. Nest sub-lists appropriately.
- Convert bullet list items (lines starting with ● or similar bullets) into <ul><li> elements.
- Wrap legal citation lines (lines referencing "Utah Code §", "Utah Admin. Rules", "Utah Constitution", court cases like "X v. Y") in <p class="citation"> tags. Group consecutive citations into a single <p class="citation"> with <br> between them.
- Wrap all other body text paragraphs in <p> tags.
- Do NOT output html, head, or body tags — only the inner content HTML.
- Output valid HTML only, no markdown, no explanations.`;

async function reformatContent(policy) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Policy title: ${policy.title}\n\nPlain text content to convert:\n\n${policy.content}`,
      },
    ],
  });
  return response.content[0].text.trim().replace(/^```(?:html)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  });

  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const rows = db.exec('SELECT id, title, content FROM policies ORDER BY id');

  if (!rows.length || !rows[0].values.length) {
    console.log('No policies found.');
    return;
  }

  const policies = rows[0].values.map(([id, title, content]) => ({ id, title, content }));
  console.log(`Found ${policies.length} policies. Reformatting with Claude Haiku (concurrency=${CONCURRENCY})...\n`);

  let done = 0;
  const tasks = policies.map((policy) => async () => {
    try {
      const html = await reformatContent(policy);
      done++;
      process.stdout.write(`\r[${done}/${policies.length}] ${policy.id}${' '.repeat(20)}`);
      return { id: policy.id, html };
    } catch (err) {
      console.error(`\nFailed ${policy.id}:`, err.message);
      return { id: policy.id, html: null };
    }
  });

  const results = await runWithConcurrency(tasks, CONCURRENCY);
  console.log('\n');

  const stmt = db.prepare('UPDATE policies SET content = ? WHERE id = ?');
  let updated = 0;
  let failed = 0;
  for (const { id, html } of results) {
    if (html) {
      stmt.run([html, id]);
      updated++;
    } else {
      failed++;
    }
  }
  stmt.free();

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log(`Done. Updated: ${updated}, Failed: ${failed}`);
  console.log(`Database saved to ${DB_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
