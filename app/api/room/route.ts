import { env } from 'cloudflare:workers';

const defaultQuestion = '今の理解度はどのくらいですか？';

async function initialize() {
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, question TEXT NOT NULL, updated_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS pins (id INTEGER PRIMARY KEY AUTOINCREMENT, room_code TEXT NOT NULL, participant_id TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, created_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_pins_room_participant ON pins(room_code, participant_id)'),
  ]);
}

function roomCode(value: string | null) {
  return (value || 'DEMO').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20).toUpperCase() || 'DEMO';
}

export async function GET(request: Request) {
  await initialize();
  const code = roomCode(new URL(request.url).searchParams.get('room'));
  await env.DB.prepare('INSERT OR IGNORE INTO rooms (code, question, updated_at) VALUES (?, ?, ?)').bind(code, defaultQuestion, Date.now()).run();
  const room = await env.DB.prepare('SELECT code, question, updated_at AS updatedAt FROM rooms WHERE code = ?').bind(code).first();
  const result = await env.DB.prepare('SELECT id, x, y, created_at AS createdAt FROM pins WHERE room_code = ? ORDER BY created_at ASC').bind(code).all();
  return Response.json({ room, pins: result.results });
}

export async function POST(request: Request) {
  await initialize();
  const body = await request.json() as { action?: string; room?: string; question?: string; participantId?: string; x?: number; y?: number };
  const code = roomCode(body.room || null);
  await env.DB.prepare('INSERT OR IGNORE INTO rooms (code, question, updated_at) VALUES (?, ?, ?)').bind(code, defaultQuestion, Date.now()).run();

  if (body.action === 'question' && body.question?.trim()) {
    await env.DB.prepare('UPDATE rooms SET question = ?, updated_at = ? WHERE code = ?').bind(body.question.trim().slice(0, 160), Date.now(), code).run();
  } else if (body.action === 'pin' && body.participantId && Number.isFinite(body.x) && Number.isFinite(body.y)) {
    const x = Math.max(0, Math.min(100, Number(body.x)));
    const y = Math.max(0, Math.min(100, Number(body.y)));
    await env.DB.prepare('INSERT INTO pins (room_code, participant_id, x, y, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(room_code, participant_id) DO UPDATE SET x = excluded.x, y = excluded.y, created_at = excluded.created_at').bind(code, body.participantId.slice(0, 80), x, y, Date.now()).run();
  } else if (body.action === 'clear') {
    await env.DB.prepare('DELETE FROM pins WHERE room_code = ?').bind(code).run();
  }
  return Response.json({ ok: true });
}
