import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import {hashPassword} from '../auth.js';
test('authorization, pagination, durable retries, pins and reactions',{skip:process.env.SYNCSPACE_INTEGRATION!=='1'},async()=>{
 const pool=new pg.Pool(),space='test-'+crypto.randomBytes(12).toString('hex'),email=space+'@example.invalid',outsider='other-'+email,password=crypto.randomBytes(24).toString('hex');
 let accountId;const path='/spaces/'+space+'/messages';
 async function request(p,method='GET',body,token){const r=await fetch((process.env.SYNCSPACE_TEST_API||'http://127.0.0.1:4000')+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 try{
  accountId=(await pool.query('INSERT INTO app.accounts(email,password_hash) VALUES($1,$2) RETURNING id',[email,await hashPassword(password)])).rows[0].id;
  await pool.query('INSERT INTO app.accounts(email,password_hash) VALUES($1,$2)',[outsider,await hashPassword(password)]);
  await pool.query("INSERT INTO migration.imported_records VALUES('Space',$1,$2,now())",[space,{member_emails:JSON.stringify([email])}]);
  await pool.query(`INSERT INTO migration.imported_records(entity_type,source_id,original_row) SELECT 'Message',$1||'-'||n,jsonb_build_object('space_id',$1,'cipher','unchanged','iv','unchanged') FROM generate_series(1,505)n`,[space]);
  const login=await request('/auth/login','POST',{email,password});assert.equal(login.status,200);const token=login.data.token;
  const unauthorized=(await request('/auth/login','POST',{email:outsider,password})).data.token;
  assert.equal((await request(path)).status,401);
  for(const method of ['GET','POST'])assert.equal((await request(path,method,method==='POST'?{}:undefined,unauthorized)).status,404);
  const envelope={clientId:crypto.randomUUID(),iv:Buffer.alloc(12).toString('base64'),cipher:Buffer.alloc(32).toString('base64')};
  const created=await request(path,'POST',envelope,token);assert.equal(created.status,201);
  const retry=await request(path,'POST',envelope,token);assert.equal(retry.status,200);assert.equal(retry.data.id,created.data.id);
  assert.equal((await request(path,'POST',{...envelope,cipher:Buffer.alloc(32,1).toString('base64')},token)).status,409);
  assert.equal((await request(path,'POST',{...envelope,cipher:'!!!!'},token)).status,400);
  let cursor=null,all=[];do{const page=await request(path+(cursor?'?cursor='+encodeURIComponent(cursor):''),'GET',undefined,token);assert.equal(page.status,200);all.push(...page.data.messages);cursor=page.data.nextCursor}while(cursor);
  assert.equal(all.length,506);assert.equal(new Set(all.map(x=>x.id)).size,506);
  assert.equal((await request(path+'?cursor=bad','GET',undefined,token)).status,400);
  const item=path+'/'+created.data.id;
  assert.equal((await request(item+'/pin','PUT',{},unauthorized)).status,404);
  assert.equal((await request(item+'/pin','PUT',{},token)).status,200);
  for(let n=0;n<2;n++)assert.equal((await request(item+'/reactions','PUT',{emoji:'❤️'},token)).status,200);
  const saved=(await request(path,'GET',undefined,token)).data.messages.find(x=>x.id===created.data.id);
  assert.equal(saved.pinned,true);assert.deepEqual(saved.reactions,[{emoji:'❤️',count:1,mine:true}]);
  const separate=new pg.Pool();try{assert.equal((await separate.query('SELECT count(*)::int AS n FROM app.messages WHERE account_id=$1',[accountId])).rows[0].n,1)}finally{await separate.end()}
  assert.equal((await request(item+'/reactions','DELETE',{emoji:'❤️'},token)).status,200);
  assert.equal((await request(item+'/pin','DELETE',{},token)).status,200);
  const callPath='/spaces/'+space+'/call';
  assert.equal((await request(callPath)).status,401);
  assert.equal((await request(callPath,'GET',undefined,unauthorized)).status,404);
  assert.equal((await request('/spaces/'+space+'/rtc-config','GET',undefined,token)).status,200);
  const offered=await request(callPath,'POST',{action:'offer',description:{type:'offer',sdp:'synthetic-offer'}},token);assert.equal(offered.status,200);
  const callId=offered.data.call.id;
  assert.equal((await request(callPath,'POST',{action:'offer',description:{type:'offer',sdp:'another'}},token)).status,409);
  assert.equal((await request(callPath,'POST',{action:'answer',callId,description:{type:'answer',sdp:'synthetic-answer'}},token)).status,409);
  await pool.query("UPDATE migration.imported_records SET original_row=$2 WHERE entity_type='Space' AND source_id=$1",[space,{member_emails:JSON.stringify([email,outsider])}]);
  assert.equal((await request(callPath,'POST',{action:'answer',callId,description:{type:'answer',sdp:'synthetic-answer'}},unauthorized)).status,200);
  assert.equal((await request(callPath,'POST',{action:'candidate',callId,candidate:{candidate:'synthetic',sdpMid:'0',sdpMLineIndex:0}},token)).status,200);
  assert.equal((await request(callPath,'GET',undefined,unauthorized)).data.call.candidates.length,1);
  assert.equal((await request(callPath+'?after=1','GET',undefined,unauthorized)).data.call.candidates.length,0);
  assert.equal((await request(callPath,'POST',{action:'end',callId:'wrong'},token)).status,409);
  assert.equal((await request(callPath,'POST',{action:'end',callId},token)).status,200);
  assert.equal((await request(callPath,'GET',undefined,unauthorized)).data.call,null);
  await request('/auth/logout','POST',{},token);assert.equal((await request(path,'GET',undefined,token)).status,401);
 }finally{
  await pool.query('DELETE FROM app.message_reactions WHERE space_id=$1',[space]);await pool.query('DELETE FROM app.message_pins WHERE space_id=$1',[space]);await pool.query('DELETE FROM app.messages WHERE account_id=$1',[accountId||-1]);
  await pool.query('DELETE FROM app.accounts WHERE email=ANY($1)',[[email,outsider]]);
  await pool.query("DELETE FROM migration.imported_records WHERE (entity_type='Space' AND source_id=$1) OR (entity_type='Message' AND original_row->>'space_id'=$1)",[space]);await pool.end();
 }
});
