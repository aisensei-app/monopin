import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../lib/room-service.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const room='0123456789abcdef01234567';
async function load(backend){
 process.env.NEXT_PUBLIC_ROOM_BACKEND=backend;
 return import('data:text/javascript;base64,'+Buffer.from(code+'\n//'+backend).toString('base64'));
}
const cloud=await load('firebase');
global.window={location:{href:'https://example.github.io/monopin/?view=host&room='+room}};
assert.equal(cloud.roomUrl('join',room,true),'https://example.github.io/monopin/?view=join&room='+room);
assert.equal(cloud.roomUrl('home'),'https://example.github.io/monopin/');
window.location.href='https://example.github.io/host/?view=host&room='+room;
assert.equal(cloud.roomUrl('join',room),'https://example.github.io/host/?view=join&room='+room);
const local=await load('local');
process.env.NEXT_PUBLIC_JOIN_ORIGIN='http://192.168.1.2:3001';
window.location.href='http://127.0.0.1:3001/host?room='+room;
assert.equal(local.roomUrl('join',room,true),'http://192.168.1.2:3001/?view=join&room='+room);
assert.equal(local.roomUrl('join',room,false),'http://127.0.0.1:3001/?view=join&room='+room);
window.location.search='?room='+room;
assert.equal(local.roomFromLocation(),room);
window.location.href='http://localhost/?room=invalid';
window.location.search='?room=invalid';
assert.equal(local.roomFromLocation(),'');
console.log('PASS: GitHub subpaths, a repository named host, LAN sharing, same-PC testing and invalid room identifiers.');

