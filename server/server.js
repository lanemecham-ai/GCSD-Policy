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
const DB_PATH = join(__dirname, 'data.db');
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SQL = await initSqlJs({
  locateFile: (file) => join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
});
const db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

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
  return get('SELECT * FROM policies WHERE id = ?', [id]);
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
  const { id, title, category, summary, content } = req.body;
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
  createVersion(id, { title, category, summary, content }, req.user.userId);
  res.status(201).json(getPolicyById(id));
});

app.put('/policies/:id', requireAuth, requireRole(['editor', 'admin']), (req, res) => {
  const policy = getPolicyById(req.params.id);
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found.' });
  }

  const { title, category, summary, content } = req.body;
  if (!title || !category || !summary || !content) {
    return res.status(400).json({ message: 'All policy fields are required.' });
  }

  const now = new Date().toISOString();
  run(
    'UPDATE policies SET title = ?, category = ?, summary = ?, content = ?, updatedAt = ? WHERE id = ?',
    [title, category, summary, content, now, req.params.id],
  );
  createVersion(req.params.id, { title, category, summary, content }, req.user.userId);
  res.json(getPolicyById(req.params.id));
});

app.delete('/policies/:id', requireAuth, requireRole(['admin']), (req, res) => {
  const policy = getPolicyById(req.params.id);
  if (!policy) {
    return res.status(404).json({ message: 'Policy not found.' });
  }

  run('DELETE FROM policy_versions WHERE policyId = ?', [req.params.id]);
  run('DELETE FROM policies WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.post('/ai-search', requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) {
    return res.status(400).json({ message: 'Query is required.' });
  }
  if (!anthropic) {
    return res.status(503).json({ message: 'AI search is not configured. Set the ANTHROPIC_API_KEY environment variable.' });
  }

  const policies = all('SELECT id, title, category, summary, content FROM policies ORDER BY title');
  const policiesContext = policies
    .map((p) => `ID: ${p.id}\nTitle: ${p.title}\nSection: ${p.category}\nSummary: ${p.summary}\nContent: ${p.content}`)
    .join('\n\n---\n\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: `You are a helpful assistant for Garfield County School District's policy management system. Staff ask you questions about district policies and you help them find relevant policies.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{"summary":"2-4 sentence explanation addressing the question and describing which policies apply","policyIds":["id-of-relevant-policy-1","id-of-relevant-policy-2"]}

Only include policy IDs that are directly relevant to the question. If no policies match, return an empty policyIds array and explain that in the summary.`,
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

    const text = message.content[0].text.trim();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Unexpected response format from AI.');
      }
    }

    res.json({ summary: result.summary ?? '', policyIds: result.policyIds ?? [] });
  } catch (err) {
    console.error('AI search error:', err);
    res.status(500).json({ message: 'AI search failed. Please try again.' });
  }
});

// Serve the built React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  // Rewrite any hardcoded localhost:4001 references in JS bundles to relative URLs
  app.get('/assets/*.js', (req, res) => {
    const filePath = join(distPath, req.path);
    try {
      const content = fs.readFileSync(filePath, 'utf8').replaceAll('http://localhost:4001', '');
      res.type('application/javascript').send(content);
    } catch {
      res.status(404).end();
    }
  });
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Policy API server running on http://localhost:${PORT}`);
});
