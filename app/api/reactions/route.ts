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
    database().prepare('SELECT a.choice, COUNT(*) AS count FROM reaction_answers a JOIN reaction_sessions s ON s.code = a.room_code AND s.revision = a.revision WHERE s.code = ? GROUP BY a.choice').bind(code),
    database().prepare('SELECT a.choice FROM reaction_answers a JOIN reaction_sessions s ON s.code = a.room_code AND s.revision = a.revision WHERE s.code = ? AND a.participant_id = ?').bind(code, participant),
  ]);
  const counts = [0, 0, 0, 0];
  for (const row of results[1].results) counts[Number(row.choice)] = Number(row.count);
  return Response.json({ ...results[0].results[0], counts, selected: results[2].results[0]?.choice ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!raw || typeof raw !== 'object') return Response.json({ error: 'Invalid request' }, { status: 400 });
  const body = raw as { room?: unknown; action?: unknown; choice?: number; participantId?: string; revision?: number; question?: string };
  const code = roomCode(body.room);
  if (!code) return Response.json({ error: 'Invalid room' }, { status: 400 });
  if (body.action === 'vote') {
    if (typeof body.choice !== 'number' || !Number.isInteger(body.choice) || body.choice < 0 || body.choice > 3 || typeof body.participantId !== 'string' || !body.participantId || body.participantId.length > 80 || !Number.isInteger(body.revision)) {
      return Response.json({ error: 'Invalid answer' }, { status: 400 });
    }
    await ensureRoom(code);
    const result = await database().prepare(`INSERT INTO reaction_answers (room_code, participant_id, choice, revision)
      SELECT code, ?, ?, revision FROM reaction_sessions WHERE code = ? AND revision = ?
      ON CONFLICT(room_code, participant_id) DO UPDATE SET choice = excluded.choice, revision = excluded.revision`)
      .bind(body.participantId, body.choice, code, body.revision).run();
    if (!result.meta.changes) return Response.json({ error: 'Question reset' }, { status: 409 });
  } else if (body.action === 'reset' || body.action === 'question') {
    if (body.action === 'question' && (typeof body.question !== 'string' || !body.question.trim() || body.question.trim().length > 160)) return Response.json({ error: 'Invalid question' }, { status: 400 });
    await ensureRoom(code);
    await database().batch([
      body.action === 'question'
        ? database().prepare('UPDATE reaction_sessions SET question = ?, revision = revision + 1 WHERE code = ?').bind(String(body.question).trim(), code)
        : database().prepare('UPDATE reaction_sessions SET revision = revision + 1 WHERE code = ?').bind(code),
      database().prepare('DELETE FROM reaction_answers WHERE room_code = ?').bind(code),
    ]);
  } else return Response.json({ error: 'Invalid action' }, { status: 400 });
  return Response.json({ ok: true });
}

