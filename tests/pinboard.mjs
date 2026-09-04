import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../lib/pinboard.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { pointFromRect } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const small = pointFromRect(160, 100, {left:10,top:25,width:300,height:225}); assert.equal(small.x,50); assert.ok(Math.abs(small.y-100/3)<1e-10);
assert.deepEqual(pointFromRect(320, 200, {left:20,top:50,width:600,height:450}), small);
assert.deepEqual(pointFromRect(-1, 999, {left:0,top:0,width:300,height:225}), {x:0,y:100});
const base = process.argv[2] || 'http://127.0.0.1:3001';
const room = 'PINQA_' + Date.now();
async function read(participant='') {
  const r = await fetch(`${base}/api/pinboard?room=${room}&participant=${participant}`);
  assert.equal(r.status,200);
  return r.json();
}
async function post(body,status=200) {
  const r=await fetch(base+'/api/pinboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room,...body})});
  assert.equal(r.status,status,await r.text());
}
const initial=await read();
assert.equal(initial.pins.length,0);
const positions=[{x:33.25,y:48.125},{x:0,y:0},{x:100,y:100},{x:33.25,y:48.125}];
await Promise.all(positions.map((point,i)=>post({action:'vote',participantId:'p'+i,revision:initial.revision,...point})));
assert.equal((await read()).pins.length,4);
let mine=await read('p0');
assert.equal(mine.selected.x,33.25);
assert.equal(mine.selected.y,48.125);
await post({action:'vote',participantId:'p0',revision:initial.revision,x:72.875,y:60.25});
mine=await read('p0');
assert.equal(mine.pins.length,4);
assert.equal(mine.selected.x,72.875);
await post({action:'vote',participantId:'p0',revision:initial.revision,x:-1,y:50},400);
await post({action:'vote',participantId:'p0',revision:initial.revision,x:'50',y:50},400);
await post({action:'reset'});
const reset=await read('p0');
assert.equal(reset.pins.length,0);
assert.equal(reset.selected,null);
await post({action:'vote',participantId:'p0',revision:initial.revision,x:50,y:50},409);
await post({action:'vote',participantId:'p0',revision:reset.revision,x:50,y:50});
await post({action:'question',question:'どのあたりが気になりますか？'});
const changed=await read('p0');
assert.equal(changed.pins.length,0);
assert.equal(changed.selected,null);
assert.equal(changed.question,'どのあたりが気になりますか？');
console.log('PASS: proportional coordinates, corners, free positions, overlapping pins, four participants, repositioning without duplicates, reload, reset, stale submission rejection, question changes.');


