import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'gcsd-policy-secret';
const DB_PATH = process.env.DB_PATH || join(__dirname, 'data.db');
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SQL = await initSqlJs({
  locateFile: (file) => join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
});
const db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();

// Debounced disk writes. sql.js keeps the whole database in memory and the
// only way to persist is to dump the entire thing to disk, so calling this on
// every single mutation (including the views++ on every page view) was the
// app's biggest write hotspot. We coalesce writes that happen within 500ms
// and force a synchronous flush on shutdown so nothing is lost.
const SAVE_DEBOUNCE_MS = 500;
let saveTimer = null;
let dbDirty = false;

function flushDb() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!dbDirty) return;
  dbDirty = false;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function saveDb() {
  dbDirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      flushDb();
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }, SAVE_DEBOUNCE_MS);
}

function shutdownAndFlush(signal) {
  try { flushDb(); } catch (err) { console.error('Flush on shutdown failed:', err); }
  if (signal) process.exit(0);
}
process.on('SIGINT', () => shutdownAndFlush('SIGINT'));
process.on('SIGTERM', () => shutdownAndFlush('SIGTERM'));
process.on('beforeExit', () => shutdownAndFlush(null));

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDb();
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

function initDatabase() {
  run(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL
    );`,
  );

  run(
    `CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0
    );`,
  );

  // Add views column to existing databases that predate this migration
  try { run('ALTER TABLE policies ADD COLUMN views INTEGER NOT NULL DEFAULT 0'); } catch (_) {}

  run(
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL DEFAULT '',
      name TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );`,
  );

  const catCount = get('SELECT COUNT(*) AS count FROM categories').count;
  if (catCount === 0) {
    const defaultCategories = [
      { id: 'cat-b', code: 'B', name: 'Board', description: 'Governance, meetings, officers, and superintendent relations' },
      { id: 'cat-c', code: 'C', name: 'Finance & Operations', description: 'Budgeting, procurement, transportation, and school facilities' },
      { id: 'cat-d', code: 'D', name: 'Personnel', description: 'Employment, conduct, benefits, leave, and evaluation' },
      { id: 'cat-e', code: 'E', name: 'Instruction', description: 'Curriculum, assessment, special programs, and graduation' },
      { id: 'cat-f', code: 'F', name: 'Students', description: 'Admission, health, activities, rights, and discipline' },
      { id: 'cat-g', code: 'G', name: 'Community Relations', description: 'Public records, community use, parent rights, and partnerships' },
    ];
    for (const cat of defaultCategories) {
      run('INSERT INTO categories (id, code, name, description) VALUES (?, ?, ?, ?)', [cat.id, cat.code, cat.name, cat.description]);
    }
  }

  run(
    `CREATE TABLE IF NOT EXISTS policy_forms (
      id TEXT PRIMARY KEY,
      policyId TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );`,
  );

  run(
    `CREATE TABLE IF NOT EXISTS policy_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policyId TEXT NOT NULL,
      versionNumber INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      authorId TEXT NOT NULL
    );`,
  );

  const userCount = get('SELECT COUNT(*) AS count FROM users', []).count;
  if (userCount === 0) {
    run('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)', [
      'user-admin',
      'admin',
      bcrypt.hashSync('admin-password', 10),
      'admin',
    ]);
    run('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)', [
      'user-editor',
      'editor',
      bcrypt.hashSync('editor-password', 10),
      'editor',
    ]);
    run('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)', [
      'user-viewer',
      'viewer',
      bcrypt.hashSync('viewer-password', 10),
      'viewer',
    ]);
  }

  const policyCount = get('SELECT COUNT(*) AS count FROM policies', []).count;
  if (policyCount === 0) {
    // Try to load from seed file
    const seedPath = join(__dirname, 'policySeed.json');
    let policies = null;
    if (fs.existsSync(seedPath)) {
      try {
        policies = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        console.log(`Loaded ${policies.length} policies from seed file.`);
      } catch (e) {
        console.warn('Could not parse policySeed.json:', e.message);
      }
    }
    // Fallback to default policies if no seed file
    if (!policies) {
      policies = [
        {
          id: 'policy-001',
          title: 'Public Records Request Policy',
          category: 'Transparency',
          summary: 'Defines procedures for responding to public records requests and handling disclosures.',
          content:
            'All public records requests must be logged, tracked, and fulfilled within the statutory response time. Requests should be directed to the Records Office, which will coordinate with departments and redact exempt information as required.',
        },
        {
          id: 'policy-002',
          title: 'Workplace Conduct and Harassment',
          category: 'Human Resources',
          summary: 'Sets expectations for professional conduct and the reporting process for harassment.',
          content:
            'Employees must maintain a respectful workplace. Any form of harassment, discrimination, or retaliation is prohibited. Report concerns anonymously or directly to HR using the standard complaint process.',
        },
        {
          id: 'policy-003',
          title: 'Records Retention and Disposal',
          category: 'Records Management',
          summary: 'Covers retention schedules and secure disposal for official documents and electronic records.',
          content:
            'Official records must be retained in accordance with the approved retention schedule. Destroy records only after the retention period expires, and use secure disposal methods for confidential materials.',
        },
      ];
    }

    const now = new Date().toISOString();
    for (const policy of policies) {
      run(
        'INSERT INTO policies (id, title, category, summary, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [policy.id, policy.title, policy.category, policy.summary, policy.content, now, now],
      );
      run(
        'INSERT INTO policy_versions (policyId, versionNumber, title, category, summary, content, createdAt, authorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [policy.id, 1, policy.title, policy.category, policy.summary, policy.content, now, 'user-admin'],
      );
    }
    console.log(`Seeded ${policies.length} policies.`);
  }

  // Flush schema migrations + seed data to disk before accepting requests.
  flushDb();
}

function createToken(user) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '8h',
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token.' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient role permissions.' });
    }
    next();
  };
}

function getUserByUsername(username) {
  return get('SELECT * FROM users WHERE username = ?', [username]);
}

function getUserById(id) {
  return get('SELECT id, username, role FROM users WHERE id = ?', [id]);
}

function getPolicyById(id) {
  const policy = get('SELECT * FROM policies WHERE id = ?', [id]);
  if (!policy) return null;
  policy.forms = all('SELECT id, title, url, sortOrder FROM policy_forms WHERE policyId = ? ORDER BY sortOrder', [id]);
  return policy;
}

function saveFormsForPolicy(policyId, forms = []) {
  run('DELETE FROM policy_forms WHERE policyId = ?', [policyId]);
  forms.forEach((f, i) => {
    const id = `form-${policyId}-${i}-${Date.now()}`;
    run('INSERT INTO policy_forms (id, policyId, title, url, sortOrder) VALUES (?, ?, ?, ?, ?)',
      [id, policyId, f.title?.trim() || 'Untitled', f.url?.trim() || '', i]);
  });
}

// Cached prompt payload for /ai-search. Rebuilt lazily on the next AI search
// after any policy create/update/delete. Held in module scope so prompt
// caching on the model side stays stable across requests.
let policiesContextCache = null;

function buildPoliciesContext() {
  const policies = all('SELECT id, title, category, summary FROM policies ORDER BY title');
  // Compact one-line-per-policy format. Less context = faster TTFT on the
  // first request of a prompt-cache window. Format: "[id] title (category): summary"
  return policies
    .map((p) => `[${p.id}] ${p.title} (${p.category}): ${p.summary}`)
    .join('\n');
}

function getPoliciesContext() {
  if (policiesContextCache === null) {
    policiesContextCache = buildPoliciesContext();
  }
  return policiesContextCache;
}

function invalidatePoliciesContextCache() {
  policiesContextCache = null;
}

function createVersion(policyId, policyData, authorId) {
  const countRow = get('SELECT COUNT(*) AS count FROM policy_versions WHERE policyId = ?', [policyId]);
  const nextVersion = (countRow?.count ?? 0) + 1;
  run(
    'INSERT INTO policy_versions (policyId, versionNumber, title, category, summary, content, createdAt, authorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [policyId, nextVersion, policyData.title, policyData.category, policyData.summary, policyData.content, new Date().toISOString(), authorId],
  );
}

initDatabase();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4173' }));
app.use(express.json());

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const user = getUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const token = createToken(user);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  res.json(user);
});

app.get('/users', requireAuth, requireRole(['admin']), (req, res) => {
  const users = all('SELECT id, username, role FROM users ORDER BY username');
  res.json(users);
});

app.post('/users', requireAuth, requireRole(['admin']), (req, res) => {
  const { username, password, role } = req.body;
  if (!username?.trim() || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required.' });
  }
  if (!['viewer', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be viewer, editor, or admin.' });
  }
  if (getUserByUsername(username.trim())) {
    return res.status(409).json({ message: 'A user with that username already exists.' });
  }
  const id = 'user-' + Date.now();
  run('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)', [
    id, username.trim(), bcrypt.hashSync(password, 10), role,
  ]);
  res.status(201).json({ id, username: username.trim(), role });
});

app.put('/users/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'User not found.' });
  }
  const { username, role, password } = req.body;
  if (!username?.trim() || !role) {
    return res.status(400).json({ message: 'Username and role are required.' });
  }
  if (!['viewer', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be viewer, editor, or admin.' });
  }
  const existing = getUserByUsername(username.trim());
  if (existing && existing.id !== req.params.id) {
    return res.status(409).json({ message: 'A user with that username already exists.' });
  }
  // Prevent removing the last admin
  if (target.role === 'admin' && role !== 'admin') {
    const adminCount = get('SELECT COUNT(*) AS count FROM users WHERE role = ?', ['admin']).count;
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last admin account.' });
    }
  }
  if (password) {
    run('UPDATE users SET username = ?, role = ?, passwordHash = ? WHERE id = ?', [
      username.trim(), role, bcrypt.hashSync(password, 10), req.params.id,
    ]);
  } else {
    run('UPDATE users SET username = ?, role = ? WHERE id = ?', [
      username.trim(), role, req.params.id,
    ]);
  }
  res.json(getUserById(req.params.id));
});

app.delete('/users/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (req.params.id === req.user.userId) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }
  if (target.role === 'admin') {
    const adminCount = get('SELECT COUNT(*) AS count FROM users WHERE role = ?', ['admin']).count;
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin account.' });
    }
  }
  run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.get('/categories', (req, res) => {
  const rows = all(
    `SELECT c.id, c.code, c.name, c.description,
            COUNT(p.id) AS policyCount
     FROM categories c
     LEFT JOIN policies p ON p.category = c.name
     GROUP BY c.id
     ORDER BY c.code, c.name`,
  );
  res.json(rows);
});

app.post('/categories', requireAuth, requireRole(['admin']), (req, res) => {
  const { code, name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: 'Category name is required.' });
  }
  if (get('SELECT id FROM categories WHERE name = ?', [name.trim()])) {
    return res.status(409).json({ message: 'A category with that name already exists.' });
  }
  const id = 'cat-' + Date.now();
  run('INSERT INTO categories (id, code, name, description) VALUES (?, ?, ?, ?)', [
    id, (code || '').trim(), name.trim(), (description || '').trim(),
  ]);
  res.status(201).json(get('SELECT * FROM categories WHERE id = ?', [id]));
});

app.put('/categories/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const cat = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!cat) return res.status(404).json({ message: 'Category not found.' });
  const { code, name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: 'Category name is required.' });
  }
  const existing = get('SELECT id FROM categories WHERE name = ?', [name.trim()]);
  if (existing && existing.id !== req.params.id) {
    return res.status(409).json({ message: 'A category with that name already exists.' });
  }
  if (cat.name !== name.trim()) {
    run('UPDATE policies SET category = ? WHERE category = ?', [name.trim(), cat.name]);
    invalidatePoliciesContextCache();
  }
  run('UPDATE categories SET code = ?, name = ?, description = ? WHERE id = ?', [
    (code || '').trim(), name.trim(), (description || '').trim(), req.params.id,
  ]);
  res.json(get('SELECT * FROM categories WHERE id = ?', [req.params.id]));
});

app.delete('/categories/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const cat = get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!cat) return res.status(404).json({ message: 'Category not found.' });
  const policyCount = get('SELECT COUNT(*) AS count FROM policies WHERE category = ?', [cat.name]).count;
  if (policyCount > 0) {
    return res.status(400).json({ message: `Cannot delete: ${policyCount} ${policyCount === 1 ? 'policy uses' : 'policies use'} this category. Reassign them first.` });
  }
  run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.get('/policies', (req, res) => {
  const policies = all('SELECT * FROM policies ORDER BY updatedAt DESC');
  res.json(policies);
});

app.get('/policies/top', (req, res) => {
  const top = all('SELECT * FROM policies ORDER BY views DESC, updatedAt DESC LIMIT 9');
  res.json(top);
});

app.get('/policies/:id', (req, res) => {
  const policy = getPolicyById(req.params.id);
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found.' });
  }
  run('UPDATE policies SET views = views + 1 WHERE id = ?', [req.params.id]);
  res.json(policy);
});

app.get('/policies/:id/versions', (req, res) => {
  const policy = getPolicyById(req.params.id);
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found.' });
  }
  const stmt = db.prepare(
    'SELECT pv.versionNumber, pv.title, pv.category, pv.summary, pv.content, pv.createdAt, u.username AS author FROM policy_versions pv JOIN users u ON pv.authorId = u.id WHERE pv.policyId = ? ORDER BY pv.versionNumber DESC',
  );
  stmt.bind([req.params.id]);
  const versions = [];
  while (stmt.step()) {
    versions.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(versions);
});

app.post('/policies', requireAuth, requireRole(['editor', 'admin']), (req, res) => {
  const { id, title, category, summary, content, forms } = req.body;
  if (!id || !title || !category || !summary || !content) {
    return res.status(400).json({ message: 'All policy fields are required.' });
  }

  if (getPolicyById(id)) {
    return res.status(409).json({ message: 'A policy with that ID already exists.' });
  }

  const now = new Date().toISOString();
  run(
    'INSERT INTO policies (id, title, category, summary, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, title, category, summary, content, now, now],
  );
  saveFormsForPolicy(id, forms);
  createVersion(id, { title, category, summary, content }, req.user.userId);
  invalidatePoliciesContextCache();
  res.status(201).json(getPolicyById(id));
});

app.put('/policies/:id', requireAuth, requireRole(['editor', 'admin']), (req, res) => {
  const policy = getPolicyById(req.params.id);
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found.' });
  }

  const { title, category, summary, content, forms } = req.body;
  if (!title || !category || !summary || !content) {
    return res.status(400).json({ message: 'All policy fields are required.' });
  }

  const now = new Date().toISOString();
  run(
    'UPDATE policies SET title = ?, category = ?, summary = ?, content = ?, updatedAt = ? WHERE id = ?',
    [title, category, summary, content, now, req.params.id],
  );
  saveFormsForPolicy(req.params.id, forms);
  createVersion(req.params.id, { title, category, summary, content }, req.user.userId);
  invalidatePoliciesContextCache();
  res.json(getPolicyById(req.params.id));
});

app.delete('/policies/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const policy = getPolicyById(req.params.id);
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found.' });
  }

  run('DELETE FROM policy_forms WHERE policyId = ?', [req.params.id]);
  run('DELETE FROM policy_versions WHERE policyId = ?', [req.params.id]);
  run('DELETE FROM policies WHERE id = ?', [req.params.id]);
  invalidatePoliciesContextCache();
  res.status(204).send();
});

app.post('/ai-search', async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) {
    return res.status(400).json({ message: 'Query is required.' });
  }
  if (!anthropic) {
    return res.status(503).json({ message: 'AI search is not configured. Set the ANTHROPIC_API_KEY environment variable.' });
  }

  const policiesContext = getPoliciesContext();

  // Server-Sent Events so the browser can render tokens as they arrive.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: `You are a helpful assistant for Garfield County School District's policy management system. Staff ask you questions about district policies and you help them find relevant policies.

Respond in TWO parts, in this exact order:
1. A 2-4 sentence plain-English answer to the staff question, naming the relevant policies inline.
2. On a new line at the very end, the literal token "POLICIES:" followed by a comma-separated list of relevant policy IDs (e.g. POLICIES: policy-001, policy-002). If no policies match, write "POLICIES:" with nothing after it.

Do not use markdown, code blocks, or JSON. Only include policy IDs that are directly relevant.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `District Policies:\n\n${policiesContext}`,
              cache_control: { type: 'ephemeral' },
            },
            {
              type: 'text',
              text: `Staff question: ${query.trim()}`,
            },
          ],
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta &&
        event.delta.type === 'text_delta' &&
        event.delta.text
      ) {
        send({ type: 'delta', text: event.delta.text });
      }
    }

    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('AI search error:', err);
    try {
      send({ type: 'error', message: 'AI search failed. Please try again.' });
    } catch (_) {}
    res.end();
  }
});

// Serve the built React app when dist exists
const distPath = join(__dirname, '..', 'dist');
const indexPath = join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {

  // Inject a fetch patch before the bundle runs so any hardcoded localhost:4001
  // URLs are rewritten to relative paths at runtime.
  const fetchPatch = `<script>
    (function(){
      var _f = window.fetch;
      window.fetch = function(u, o) {
        if (typeof u === 'string') u = u.replace('http://localhost:4001', '');
        return _f.call(this, u, o);
      };
    })();
  </script>`;

  function serveIndex(_req, res) {
    try {
      const html = fs.readFileSync(indexPath, 'utf8').replace('</head>', fetchPatch + '</head>');
      res.type('text/html').send(html);
    } catch {
      res.status(500).send('App not built.');
    }
  }

  app.use(express.static(distPath, { index: false }));
  app.get('*', serveIndex);
}

app.listen(PORT, () => {
  console.log(`Policy API server running on http://localhost:${PORT}`);
});
