import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:3001';
function client(){
 let cookie='';
 return async (method,body)=>{
  const url=base+'/api/sessions'+(method==='GET'?'?room='+body.room:'');
  const response=await fetch(url,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})});
  const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
  return {status:response.status,data:await response.json()};
 };
}
const host=client(),guest=client(),other=client(),host2=client();
const created=await host('POST',{action:'create',title:'確認用の研修会',question:'今の理解度は？'});
assert.equal(created.status,201);
const room=created.data.room;
const second=await host2('POST',{action:'create',title:'別の研修会',question:'別の質問'});
assert.notEqual(room,second.data.room);
assert.equal((await host('GET',{room})).data.isHost,true);
const first=await guest('GET',{room});
assert.equal(first.data.isHost,false);
assert.equal((await guest('POST',{action:'reset',room,revision:1})).status,403);
assert.equal((await guest('POST',{action:'open',room,open:false})).status,403);
assert.equal((await guest('POST',{action:'question',room,revision:1,question:'改ざん'})).status,403);
assert.equal((await host2('POST',{action:'reset',room,revision:1})).status,403);
assert.equal((await guest('POST',{action:'vote',room,revision:1,x:35.5,y:70.25})).status,200);
assert.equal((await other('GET',{room})).data.selected,null);
assert.equal((await other('GET',{room})).data.pins.length,0);
assert.equal((await guest('GET',{room})).data.selected.x,35.5);
assert.equal((await guest('POST',{action:'vote',room,revision:1,x:63,y:21,participantId:'forged'})).status,200);
assert.equal((await host('GET',{room})).data.pins.length,1);
assert.equal((await host2('GET',{room:second.data.room})).data.pins.length,0);
assert.equal((await guest('POST',{action:'vote',room,revision:1,x:101,y:40})).status,400);
await host('POST',{action:'open',room,open:false});
assert.equal((await guest('GET',{room})).data.open,false);
assert.equal((await guest('POST',{action:'vote',room,revision:1,x:50,y:50})).status,409);
assert.equal((await host('GET',{room})).data.pins.length,1);
await host('POST',{action:'open',room,open:true});
await host('POST',{action:'reset',room,revision:1});
assert.equal((await guest('GET',{room})).data.selected,null);
assert.equal((await guest('POST',{action:'vote',room,revision:1,x:50,y:50})).status,409);
assert.equal((await guest('POST',{action:'vote',room,revision:2,x:50,y:50})).status,200);
assert.equal((await host('POST',{action:'question',room,revision:2,question:'次の質問'})).status,200);
assert.equal((await host('GET',{room})).data.pins.length,0);
assert.equal((await host('GET',{room})).data.question,'次の質問');
console.log('PASS: separate rooms, owner-only controls, private participant answers, coordinate validation, replacement, close/reopen, reset, stale answers and question change.');

