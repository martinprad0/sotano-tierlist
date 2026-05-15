// PATH: sotano-tierlist/server/index.ts

import express from 'express';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const db = createClient({ url: 'file:server/sotano.db' });

// =====================
// SCHEMA
// =====================
await db.execute(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, verified INTEGER DEFAULT 0,
  verify_token TEXT, shadow_banned INTEGER DEFAULT 0,
  session_token TEXT, created_at TEXT DEFAULT (datetime('now'))
)`);

await db.execute(`CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, abbr TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'D', category TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
)`);

await db.execute(`INSERT OR IGNORE INTO classes (id, name, abbr, tier) VALUES ('none', 'None', 'NONE', 'NONE')`);

await db.execute(`CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL, voter_id TEXT NOT NULL,
  voter_name TEXT NOT NULL, date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'stay', shadow_banned INTEGER DEFAULT 0
)`);

await db.execute(`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
)`);

await db.execute(`INSERT OR IGNORE INTO settings (key, value) VALUES ('voting_blocked', '0')`);

// =====================
// SEED
// =====================
const seedUsers = ['m.prado1','m.prado2','m.prado3','m.prado4','m.prado5'];
for (const prefix of seedUsers) {
  try {
    await db.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash, verified) VALUES (?, ?, ?, ?, 1)',
      args: [crypto.randomUUID(), `${prefix}@uniandes.edu.co`, prefix, await bcrypt.hash('pipipopo', 10)]
    });
  } catch {}
}
try {
  await db.execute({
    sql: 'INSERT INTO users (id, email, name, password_hash, verified) VALUES (?, ?, ?, ?, 1)',
    args: [crypto.randomUUID(), 'm.prado@uniandes.edu.co', 'm.prado', await bcrypt.hash('pipipopo', 10)]
  });
} catch {}

// =====================
// HELPERS
// =====================
function getToday() {
  const now = new Date(Date.now() - 5 * 3600000);
  return now.toISOString().slice(0, 10);
}

async function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No autorizado' });
  const token = header.replace('Bearer ', '');
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE session_token = ?', args: [token] });
  const user = result.rows[0];
  if (!user) return res.status(401).json({ message: 'Sesión inválida' });
  if ((user as any).shadow_banned) return res.status(403).json({ message: 'Has sido baneado' });
  req.user = user;
  next();
}

function adminMiddleware(req: any, res: any, next: any) {
  const email = (req.user as any).email as string;
  if (!email.startsWith('m.prado@') || email.match(/m\.prado\d/)) return res.status(403).json({ message: 'Solo admin' });
  next();
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'mistarobert1@gmail.com', pass: process.env.GMAIL_APP_PASSWORD }
});

// =====================
// END OF DAY CRON
// =====================
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

async function processEndOfDay() {
  const today = getToday();
  console.log(`[CRON] Processing end-of-day for ${today}`);

  const classesResult = await db.execute(`SELECT * FROM classes WHERE tier != 'NONE'`);
  for (const cls of classesResult.rows as any[]) {
    const votesResult = await db.execute({
      sql: `SELECT * FROM votes WHERE class_id = ? AND date = ? AND shadow_banned = 0`,
      args: [cls.id, today]
    });
    const votes = votesResult.rows as any[];
    if (votes.length === 0) continue;

    const up = votes.filter(v => v.type === 'up').length;
    const down = votes.filter(v => v.type === 'down').length;
    const stay = votes.filter(v => v.type === 'stay').length;
    const total = votes.length;

    let direction = 0;
    if (up > down && up > stay) direction = -1;
    else if (down > up && down > stay) direction = 1;
    if (up === down && up > stay) direction = 0;

    const double = total >= 3 && (
      (direction === -1 && up === total) ||
      (direction === 1 && down === total)
    );
    const steps = double ? 2 : direction !== 0 ? 1 : 0;

    const tidx = TIER_ORDER.indexOf(cls.tier);
    const newIdx = Math.max(0, Math.min(TIER_ORDER.length - 1, tidx + direction * steps));
    const newTier = TIER_ORDER[newIdx];

    if (newTier !== cls.tier) {
      await db.execute({ sql: 'UPDATE classes SET tier = ? WHERE id = ?', args: [newTier, cls.id] });
      console.log(`[CRON] ${cls.name}: ${cls.tier} → ${newTier}`);
    }
  }
}

// Schedule cron for 12pm Colombia (UTC-5 = 17:00 UTC)
function scheduleCron() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(17, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next.getTime() - now.getTime();
  console.log(`[CRON] Next run in ${Math.round(delay / 60000)} minutes`);
  setTimeout(async () => {
    await processEndOfDay();
    setInterval(processEndOfDay, 24 * 60 * 60 * 1000);
  }, delay);
}
scheduleCron();

// =====================
// AUTH ROUTES
// =====================
app.post('/api/register', async (req, res) => {
  const { prefix, password, name } = req.body;
  if (!prefix || !password || !name) return res.status(400).json({ message: 'Faltan campos' });
  const email = `${prefix}@uniandes.edu.co`;
  const token = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  try {
    await db.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash, verify_token) VALUES (?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), email, name, hash, token]
    });
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ message: 'Este correo ya está registrado' });
    return res.status(500).json({ message: 'Error interno' });
  }
  const link = `http://localhost:5173/verify?token=${token}`;
  await transporter.sendMail({
    from: '"Sótano Tierlist" <mistarobert1@gmail.com>', to: email,
    subject: 'Confirma tu cuenta — Sótano Tierlist',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#080808;color:#e8e8e8;">
      <h1 style="font-size:28px;letter-spacing:4px;color:#fff;">SÓTANO<span style="color:#555">.</span></h1>
      <p style="margin:24px 0;">Hola <strong>${name}</strong>, confirma tu cuenta:</p>
      <a href="${link}" style="display:inline-block;background:#fff;color:#080808;padding:12px 28px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Verificar cuenta</a>
    </div>`
  });
  res.json({ message: 'ok' });
});

app.post('/api/login', async (req, res) => {
  const { prefix, password } = req.body;
  const email = `${prefix}@uniandes.edu.co`;
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
  const user = result.rows[0] as any;
  if (!user) return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
  if (!user.verified) return res.status(403).json({ message: 'Debes verificar tu correo primero' });
  if (user.shadow_banned) return res.status(403).json({ message: 'Has sido baneado' });
  const ok = await bcrypt.compare(password, user.password_hash as string);
  if (!ok) return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({ sql: 'UPDATE users SET session_token = ? WHERE id = ?', args: [token, user.id] });
  res.json({ token, name: user.name });
});

app.get('/api/verify', async (req, res) => {
  const token = req.query.token as string;
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE verify_token = ?', args: [token] });
  const user = result.rows[0] as any;
  if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });
  await db.execute({ sql: 'UPDATE users SET verified = 1, verify_token = NULL WHERE id = ?', args: [user.id] });
  res.json({ message: 'ok', name: user.name });
});

// =====================
// VOTING STATUS
// =====================
app.get('/api/voting-status', authMiddleware, async (req, res) => {
  const result = await db.execute({ sql: `SELECT value FROM settings WHERE key = 'voting_blocked'`, args: [] });
  res.json({ blocked: (result.rows[0] as any).value === '1' });
});

app.post('/api/admin/voting-block', authMiddleware, adminMiddleware, async (req, res) => {
  const { blocked } = req.body;
  await db.execute({ sql: `UPDATE settings SET value = ? WHERE key = 'voting_blocked'`, args: [blocked ? '1' : '0'] });
  res.json({ message: 'ok' });
});

// =====================
// CLASS ROUTES
// =====================
app.get('/api/classes', authMiddleware, async (req, res) => {
  const result = await db.execute(`SELECT * FROM classes WHERE tier != 'NONE' ORDER BY tier, name`);
  res.json(result.rows);
});

app.post('/api/classes', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, abbr } = req.body;
  if (!name || !abbr) return res.status(400).json({ message: 'Faltan campos' });
  const id = crypto.randomUUID();
  await db.execute({ sql: `INSERT INTO classes (id, name, abbr, tier) VALUES (?, ?, ?, 'D')`, args: [id, name, abbr] });
  const result = await db.execute({ sql: 'SELECT * FROM classes WHERE id = ?', args: [id] });
  res.json(result.rows[0]);
});

app.patch('/api/classes/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, abbr, tier, category } = req.body;
  if (name !== undefined) await db.execute({ sql: 'UPDATE classes SET name = ? WHERE id = ?', args: [name, id] });
  if (abbr !== undefined) await db.execute({ sql: 'UPDATE classes SET abbr = ? WHERE id = ?', args: [abbr, id] });
  if (tier !== undefined) await db.execute({ sql: 'UPDATE classes SET tier = ? WHERE id = ?', args: [tier, id] });
  if (category !== undefined) await db.execute({ sql: 'UPDATE classes SET category = ? WHERE id = ?', args: [category, id] });
  res.json({ message: 'ok' });
});

app.delete('/api/classes/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  await db.execute({ sql: `UPDATE classes SET tier = 'NONE' WHERE id = ?`, args: [id] });
  await db.execute({ sql: `UPDATE votes SET class_id = 'none' WHERE class_id = ?`, args: [id] });
  res.json({ message: 'ok' });
});

app.post('/api/classes/randomize', authMiddleware, adminMiddleware, async (req, res) => {
  const tiers = ['S', 'A', 'B', 'C', 'D'];
  const result = await db.execute(`SELECT id FROM classes WHERE tier != 'NONE'`);
  for (const row of result.rows) {
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    await db.execute({ sql: 'UPDATE classes SET tier = ? WHERE id = ?', args: [tier, row.id] });
  }
  // Delete all vote history
  await db.execute(`DELETE FROM votes`);
  res.json({ message: 'ok' });
});

app.get('/api/classes/:id/days', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const datesResult = await db.execute({ sql: 'SELECT DISTINCT date FROM votes WHERE class_id = ? ORDER BY date DESC', args: [id] });
  const days = [];
  for (const row of datesResult.rows) {
    const votes = await db.execute({ sql: 'SELECT * FROM votes WHERE class_id = ? AND date = ?', args: [id, row.date] });
    days.push({ date: row.date, votes: votes.rows });
  }
  res.json(days);
});

app.get('/api/classes/:id/today', authMiddleware, async (req, res) => {
  const today = getToday();
  const result = await db.execute({ sql: 'SELECT * FROM votes WHERE class_id = ? AND date = ?', args: [req.params.id, today] });
  res.json({ votes: result.rows, date: today });
});

// =====================
// VOTE ROUTES
// =====================
app.get('/api/votes/mine', authMiddleware, async (req, res) => {
  const today = getToday();
  const result = await db.execute({
    sql: `SELECT * FROM votes WHERE voter_id = ? AND date = ? AND class_id != 'none'`,
    args: [(req as any).user.id, today]
  });
  res.json(result.rows);
});

app.post('/api/votes', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const today = getToday();

  const blocked = await db.execute({ sql: `SELECT value FROM settings WHERE key = 'voting_blocked'`, args: [] });
  if ((blocked.rows[0] as any).value === '1') return res.status(403).json({ message: 'Votación bloqueada' });

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM votes WHERE voter_id = ? AND date = ? AND class_id != 'none'`,
    args: [user.id, today]
  });
  if (((countResult.rows[0] as any).count as number) >= 3) return res.status(400).json({ message: 'Ya usaste tus 3 votos de hoy' });

  const dupResult = await db.execute({
    sql: 'SELECT id FROM votes WHERE voter_id = ? AND class_id = ? AND date = ?',
    args: [user.id, req.body.class_id, today]
  });
  if (dupResult.rows.length > 0) return res.status(400).json({ message: 'Ya votaste por esta clase hoy' });

  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO votes (id, class_id, voter_id, voter_name, date, type) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, req.body.class_id, user.id, user.name, today, req.body.type]
  });
  res.json({ id });
});

app.delete('/api/votes/:id', authMiddleware, async (req, res) => {
  const blocked = await db.execute({ sql: `SELECT value FROM settings WHERE key = 'voting_blocked'`, args: [] });
  if ((blocked.rows[0] as any).value === '1') return res.status(403).json({ message: 'Votación bloqueada' });
  await db.execute({
    sql: `UPDATE votes SET class_id = 'none' WHERE id = ? AND voter_id = ?`,
    args: [req.params.id, (req as any).user.id]
  });
  res.json({ message: 'ok' });
});

// =====================
// ADMIN ROUTES
// =====================
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const result = await db.execute(`SELECT id, email, name, shadow_banned FROM users WHERE email != 'm.prado@uniandes.edu.co' ORDER BY name`);
  res.json(result.rows);
});

app.get('/api/admin/users/:id/votes', authMiddleware, adminMiddleware, async (req, res) => {
  const result = await db.execute({
    sql: `SELECT v.*, c.name as class_name FROM votes v LEFT JOIN classes c ON v.class_id = c.id WHERE v.voter_id = ? AND v.class_id != 'none' ORDER BY v.date DESC`,
    args: [req.params.id]
  });
  res.json(result.rows);
});

app.get('/api/votes/history', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const datesResult = await db.execute({
    sql: `SELECT DISTINCT date FROM votes WHERE voter_id = ? AND class_id != 'none' ORDER BY date DESC`,
    args: [user.id]
  });
  const days = [];
  for (const row of datesResult.rows) {
    const votes = await db.execute({
      sql: `SELECT v.*, c.name as class_name FROM votes v LEFT JOIN classes c ON v.class_id = c.id WHERE v.voter_id = ? AND v.date = ? AND v.class_id != 'none'`,
      args: [user.id, row.date]
    });
    days.push({ date: row.date, votes: votes.rows });
  }
  res.json(days);
});

app.post('/api/admin/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
  const { banned } = req.body;
  await db.execute({ sql: 'UPDATE users SET shadow_banned = ? WHERE id = ?', args: [banned ? 1 : 0, req.params.id] });
  res.json({ message: 'ok' });
});

app.post('/api/admin/votes/:id/shadowban', authMiddleware, adminMiddleware, async (req, res) => {
  const { banned } = req.body;
  await db.execute({ sql: 'UPDATE votes SET shadow_banned = ? WHERE id = ?', args: [banned ? 1 : 0, req.params.id] });
  res.json({ message: 'ok' });
});

app.listen(3001, () => console.log('API running on http://localhost:3001'));