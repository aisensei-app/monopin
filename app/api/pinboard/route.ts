import { env } from 'cloudflare:workers';
import { QUESTION } from '@/lib/reactions';

function database() { return env.DB; }
function roomCode(value: unknown) {
  return typeof value === 'string' && /^[A-Z0-9_-]{1,20}$/.test(value) ? value : null;
}
async function ensureRoom(code: string) {
  await database().prepare('INSERT OR IGNORE INTO reaction_sessions (code, question, revision) VALUES (?, ?, 1)').bind(code, QUESTION).run();
}
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = roomCode(params.get('room'));
  if (!code) return Response.json({ error: 'Invalid room' }, { status: 400 });
  await ensureRoom(code);
  const participant = (params.get('participant') || '').slice(0, 80);
  // A single snapshot keeps the question, counts and answer consistent during resets.
  const results = await database().batch<Record<string, unknown>>([
    database().prepare('SELECT question, revision FROM reaction_sessions WHERE code = ?').bind(code),
    database().prepare('SELECT a.id, a.x, a.y FROM board_pins a JOIN reaction_sessions s ON s.code = a.room_code AND s.revision = a.revision WHERE s.code = ? ORDER BY a.id').bind(code),
    database().prepare('SELECT a.id, a.x, a.y FROM board_pins a JOIN reaction_sessions s ON s.code = a.room_code AND s.revision = a.revision WHERE s.code = ? AND a.participant_id = ?').bind(code, participant),
  ]);


  return Response.json({ ...results[0].results[0], pins: results[1].results, selected: results[2].results[0] ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!raw || typeof raw !== 'object') return Response.json({ error: 'Invalid request' }, { status: 400 });
  const body = raw as { room?: unknown; action?: unknown; x?: number; y?: number; participantId?: string; revision?: number; question?: string };
  const code = roomCode(body.room);
  if (!code) return Response.json({ error: 'Invalid room' }, { status: 400 });
  if (body.action === 'vote') {
    if (typeof body.x !== 'number' || !Number.isFinite(body.x) || body.x < 0 || body.x > 100 || typeof body.y !== 'number' || !Number.isFinite(body.y) || body.y < 0 || body.y > 100 || typeof body.participantId !== 'string' || !body.participantId || body.participantId.length > 80 || !Number.isInteger(body.revision)) {
      return Response.json({ error: 'Invalid answer' }, { status: 400 });
    }
    await ensureRoom(code);
    const result = await database().prepare(`INSERT INTO board_pins (room_code, participant_id, x, y, revision)
      SELECT code, ?, ?, ?, revision FROM reaction_sessions WHERE code = ? AND revision = ?
      ON CONFLICT(room_code, participant_id) DO UPDATE SET x = excluded.x, y = excluded.y, revision = excluded.revision`)
      .bind(body.participantId, body.x, body.y, code, body.revision).run();
    if (!result.meta.changes) return Response.json({ error: 'Question reset' }, { status: 409 });
  } else if (body.action === 'reset' || body.action === 'question') {
    if (body.action === 'question' && (typeof body.question !== 'string' || !body.question.trim() || body.question.trim().length > 160)) return Response.json({ error: 'Invalid question' }, { status: 400 });
    await ensureRoom(code);
    await database().batch([
      body.action === 'question'
        ? database().prepare('UPDATE reaction_sessions SET question = ?, revision = revision + 1 WHERE code = ?').bind(String(body.question).trim(), code)
        : database().prepare('UPDATE reaction_sessions SET revision = revision + 1 WHERE code = ?').bind(code),
      database().prepare('DELETE FROM board_pins WHERE room_code = ?').bind(code),
    ]);
  } else return Response.json({ error: 'Invalid action' }, { status: 400 });
  return Response.json({ ok: true });
}


