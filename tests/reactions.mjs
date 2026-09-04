import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:3001';
const room = 'QA_' + Date.now();
async function read(participant = '') {
  const response = await fetch(`${base}/api/reactions?room=${room}&participant=${participant}`);
  assert.equal(response.status, 200);
  return response.json();
}
async function post(body, status = 200) {
  const response = await fetch(base + '/api/reactions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({room, ...body}) });
  assert.equal(response.status, status, await response.text());
}
const initial = await read();
assert.deepEqual(initial.counts, [0,0,0,0]);
await Promise.all([0,1,2,3].map(choice => post({action:'vote',participantId:'student-'+choice,choice,revision:initial.revision})));
assert.deepEqual((await read()).counts,[1,1,1,1]);
await post({action:'vote',participantId:'student-0',choice:3,revision:initial.revision});
assert.deepEqual((await read()).counts,[0,1,1,2]);
assert.equal((await read('student-0')).selected,3);
await post({action:'vote',participantId:'student-0',choice:3,revision:initial.revision});
assert.deepEqual((await read()).counts,[0,1,1,2]);
await post({action:'vote',participantId:'bad',choice:9,revision:initial.revision},400);
await post({action:'unknown'},400);
await post({action:'reset'});
const reset = await read('student-0');
assert.deepEqual(reset.counts,[0,0,0,0]);
assert.equal(reset.selected,null);
assert.equal(reset.revision,initial.revision+1);
await post({action:'vote',participantId:'student-0',choice:0,revision:initial.revision},409);
await post({action:'vote',participantId:'student-0',choice:0,revision:reset.revision});
assert.deepEqual((await read()).counts,[1,0,0,0]);
await post({action:'question',question:'次の内容は分かりましたか？'});
const changed = await read('student-0');
assert.equal(changed.question,'次の内容は分かりましたか？');
assert.equal(changed.selected,null);
assert.deepEqual(changed.counts,[0,0,0,0]);
console.log('PASS: 4 choices, concurrent participants, answer replacement, reload recovery, duplicate submission, invalid input, reset, stale vote rejection, new answer, question change.');

