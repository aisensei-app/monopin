import { env } from 'cloudflare:workers';

type Body = { action?: string; room?: string; title?: string; question?: string; revision?: number; x?: number; y?: number; open?: boolean };
function identity(request: Request) {
  const existing = request.headers.get('cookie')?.match(/(?:^|;\s*)monopin_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const uid = existing || crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  return { uid, fresh: !existing };
}
export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
async function handle(request: Request) {
  const { uid, fresh } = identity(request);
  const reply = (value: unknown, status = 200) => {
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (fresh) headers.set('Set-Cookie', `monopin_session=${uid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
    return Response.json(value, { status, headers });
  };
  if (request.method === 'POST' && request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: '操作元を確認できません。' }, 403);
  let body: Body = {};
  if (request.method === 'POST') {
    try { body = await request.json() as Body; } catch { return reply({ error: '入力内容を確認してください。' }, 400); }
    if (!body || typeof body !== 'object') return reply({ error: '入力内容を確認してください。' }, 400);
  }
  if (body.action === 'create') {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 80 || typeof body.question !== 'string' || !body.question.trim() || body.question.trim().length > 160) return reply({ error: '部屋名と質問を入力してください。' }, 400);
    const code = crypto.randomUUID().replaceAll('-', '').slice(0,24);
    await env.DB.prepare('INSERT INTO event_rooms (code, owner, title, question, revision, open) VALUES (?, ?, ?, ?, 1, 1)').bind(code, uid, body.title.trim(), body.question.trim()).run();
    return reply({ room: code }, 201);
  }
  const code = request.method === 'GET' ? new URL(request.url).searchParams.get('room') : body.room;
  if (typeof code !== 'string' || !/^[a-f0-9]{24}$/.test(code)) return reply({ error: '参加用のURLから開いてください。' }, 400);
  const room = await env.DB.prepare('SELECT code, owner, title, question, revision, open FROM event_rooms WHERE code = ?').bind(code).first<{ code: string; owner: string; title: string; question: string; revision: number; open: number }>();
  if (!room) return reply({ error: 'この部屋は見つかりません。参加用URLを確認してください。' }, 404);
  const isHost = room.owner === uid;
  if (request.method === 'GET') {
    const result = await env.DB.batch<Record<string, unknown>>([
      env.DB.prepare('SELECT title, question, revision, open FROM event_rooms WHERE code = ?').bind(code),
      env.DB.prepare('SELECT p.id, p.x, p.y FROM event_pins p JOIN event_rooms r ON r.code=p.room AND r.revision=p.revision WHERE p.room = ? AND (? = 1 OR p.participant = ?) ORDER BY p.id').bind(code, isHost ? 1 : 0, uid),
      env.DB.prepare('SELECT p.id, p.x, p.y FROM event_pins p JOIN event_rooms r ON r.code=p.room AND r.revision=p.revision WHERE p.room = ? AND p.participant = ?').bind(code,uid),
    ]);
    return reply({ ...result[0].results[0], open: !!result[0].results[0].open, isHost, pins: isHost ? result[1].results : [], selected: result[2].results[0] || null });
  }
  if (body.action === 'vote') {
    if (typeof body.x !== 'number' || !Number.isFinite(body.x) || body.x < 0 || body.x > 100 || typeof body.y !== 'number' || !Number.isFinite(body.y) || body.y < 0 || body.y > 100 || !Number.isInteger(body.revision)) return reply({ error: 'ピンの位置を確認してください。' }, 400);
    const result = await env.DB.prepare(`INSERT INTO event_pins (room, participant, x, y, revision)
      SELECT code, ?, ?, ?, revision FROM event_rooms WHERE code = ? AND revision = ? AND open = 1
      ON CONFLICT(room, participant) DO UPDATE SET x=excluded.x, y=excluded.y, revision=excluded.revision`)
      .bind(uid,body.x,body.y,code,body.revision).run();
    return result.meta.changes ? reply({ ok: true }) : reply({ error: '受付が終了したか、質問が更新されました。' },409);
  }
  if (!isHost) return reply({ error: 'この操作は主催者だけが利用できます。' },403);
  if (body.action === 'open' && typeof body.open === 'boolean') {
    await env.DB.prepare('UPDATE event_rooms SET open = ? WHERE code = ? AND owner = ?').bind(body.open ? 1 : 0,code,uid).run();
  } else if (body.action === 'reset' || body.action === 'question') {
    if (body.action === 'question' && (typeof body.question !== 'string' || !body.question.trim() || body.question.trim().length > 160)) return reply({ error: '質問を入力してください。' },400);
    if (!Number.isInteger(body.revision)) return reply({ error: '質問を再読み込みしてください。' },400);
    const result = await env.DB.batch([
      env.DB.prepare('UPDATE event_rooms SET question = ?, revision = revision + 1 WHERE code = ? AND owner = ? AND revision = ?').bind(body.action === 'question' ? body.question!.trim() : room.question,code,uid,body.revision),
      env.DB.prepare('DELETE FROM event_pins WHERE room = ? AND revision < (SELECT revision FROM event_rooms WHERE code = ?)').bind(code,code),
    ]);
    if (!result[0].meta.changes) return reply({ error: '別の画面で質問が更新されました。もう一度お試しください。' },409);
  } else return reply({ error: '操作を確認してください。' },400);
  return reply({ ok: true });
}

