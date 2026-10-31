import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import {WebSocket} from 'ws';
import {hashPassword} from '../auth.js';
test('legacy room identity, member-only mapping, local entities, WebSocket authentication and sender identity',{skip:process.env.SYNCSPACE_INTEGRATION!=='1'},async()=>{
 const pool=new pg.Pool(),legacy='room-test-'+crypto.randomBytes(10).toString('hex'),local=crypto.randomUUID(),emails=[0,1,2].map(n=>`${legacy}-${n}@example.invalid`),password=crypto.randomBytes(24).toString('hex'),code=crypto.randomBytes(16).toString('hex');
 const base=process.env.SYNCSPACE_TEST_API||'http://127.0.0.1:4000',sockets=[];
 async function request(path,method='GET',body,token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 async function connect(token){const ws=new WebSocket(base.replace(/^http/,'ws')+'/rt?space='+legacy,{origin:'http://127.0.0.1:3003'});sockets.push(ws);ws.events=[];ws.on('message',raw=>ws.events.push(JSON.parse(raw)));ws.on('error',()=>{});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});ws.send(JSON.stringify({type:'auth',token}));return ws}
 async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,30))}throw Error('Expected signaling event did not arrive')}
 try{
  const ids=[];for(const email of emails)ids.push((await pool.query('INSERT INTO app.accounts(email,password_hash) VALUES($1,$2) RETURNING id',[email,await hashPassword(password)])).rows[0].id);
  await pool.query('INSERT INTO app.shared_spaces(id,name,invite_code,created_by) VALUES($1,$2,$3,$4)',[local,'Fixture',code,ids[0]]);
  for(const id of ids.slice(0,2))await pool.query('INSERT INTO app.shared_space_members(space_id,account_id,display_name) VALUES($1,$2,$3)',[local,id,'Fixture']);
  await pool.query('INSERT INTO app.legacy_space_mappings VALUES($1,$2)',[legacy,local]);
  await pool.query("INSERT INTO migration.imported_records(entity_type,source_id,original_row) VALUES('Space',$1,$2)",[legacy,{member_emails:emails.slice(0,2)}]);
  const tokens=[];for(const email of emails)tokens.push((await request('/auth/login','POST',{email,password})).data.token);
  const spaces=(await request('/spaces','GET',undefined,tokens[0])).data.spaces;assert.equal(spaces.length,1);assert.equal(spaces[0].id,legacy);assert.equal(spaces[0].encryption_space_id,legacy);assert.ok(spaces[0].invite_code===code);
  const envelope={iv:Buffer.alloc(12).toString('base64'),cipher:Buffer.alloc(32).toString('base64'),clientId:crypto.randomUUID()};
  assert.equal((await request('/spaces/'+legacy+'/messages','POST',envelope,tokens[0])).status,201);
  assert.equal((await pool.query('SELECT space_id::text FROM app.messages WHERE account_id=$1',[ids[0]])).rows[0].space_id,local);
  assert.equal((await request('/spaces/'+local+'/messages','GET',undefined,tokens[1])).data.messages.length,1);
  const endpoint='/spaces/'+legacy+'/entities/Note';
  assert.equal((await request(endpoint,'POST',{text:'plaintext'},tokens[0])).status,400);
  const note=await request(endpoint,'POST',{...envelope,author_id:'spoofed'},tokens[0]);assert.equal(note.status,201);assert.equal(note.data.author_id,String(ids[0]));
  assert.equal((await request(endpoint,'GET',undefined,tokens[2])).status,404);
  assert.equal((await request(endpoint+'/'+note.data.id,'DELETE',undefined,tokens[1])).status,409);
  assert.equal((await request(endpoint+'/'+note.data.id,'DELETE',undefined,tokens[0])).status,200);
  const denied=await connect(tokens[2]);await until(()=>denied.readyState===3);assert.equal(denied.events.length,0);
  const a=await connect(tokens[0]),b=await connect(tokens[1]);await until(()=>a.events.some(e=>e.type==='presence'&&e.users.length===2)&&b.events.some(e=>e.type==='you'));
  const seatA=a.events.find(e=>e.type==='you').seat,seatB=b.events.find(e=>e.type==='you').seat;
  a.send(JSON.stringify({type:'signal',to:seatB,from:999,data:{kind:'join'}}));await until(()=>b.events.some(e=>e.type==='signal'));assert.equal(b.events.find(e=>e.type==='signal').from,seatA);
  await request('/auth/logout','POST',{},tokens[0]);await until(()=>a.readyState===3);
  await pool.query('DELETE FROM app.shared_space_members WHERE space_id=$1 AND account_id=$2',[local,ids[1]]);
  assert.equal((await request('/spaces/'+legacy+'/messages','GET',undefined,tokens[1])).status,404);
 }finally{
  for(const ws of sockets)ws.terminate();await new Promise(r=>setTimeout(r,80));
  await pool.query('DELETE FROM app.messages WHERE space_id::text=ANY($1)',[[local,legacy]]);await pool.query('DELETE FROM app.local_entities WHERE space_id=$1',[legacy]);await pool.query('DELETE FROM app.room_state WHERE space_id=$1',[legacy]);
  await pool.query("DELETE FROM migration.imported_records WHERE source_id=$1",[legacy]);await pool.query('DELETE FROM app.legacy_space_mappings WHERE legacy_space_id=$1',[legacy]);await pool.query('DELETE FROM app.shared_space_members WHERE space_id=$1',[local]);await pool.query('DELETE FROM app.shared_spaces WHERE id=$1',[local]);await pool.query('DELETE FROM app.accounts WHERE email=ANY($1)',[emails]);await pool.end();
 }
});
