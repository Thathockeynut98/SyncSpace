const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
(async()=>{
 const suffix=crypto.randomBytes(10).toString('hex'),legacy='react-test-'+suffix,local=crypto.randomUUID(),email=suffix+'@example.invalid',partner='partner-'+email,password=crypto.randomBytes(24).toString('hex'),code=crypto.randomBytes(16).toString('hex');
 const compose=['compose','--project-name','syncspace-cloud','--env-file','/workspace/SyncSpace/.env','-f','/workspace/syncspace-cloud/compose.yaml','exec','-T','api','node','--input-type=module'];
 const {deriveKey,encryptMessage}=await import('../../preview/message-crypto.mjs');
 const envelope=await encryptMessage(await deriveKey(legacy,code),'Synthetic legacy hello');
 function db(script){const program=`import pg from 'pg';import {hashPassword} from './auth.js';const pool=new pg.Pool();try{${script}}finally{await pool.end()}`;
 if(process.env.SYNCSPACE_REACT_TEST_DB==='host')execFileSync(process.execPath,['--input-type=module'],{input:program,cwd:__dirname+'/..',stdio:['pipe','pipe','pipe']});
 else execFileSync('docker',compose,{input:program,stdio:['pipe','pipe','pipe']});}
 const fixture=JSON.stringify({legacy,local,email,partner,password,code,envelope});
 let browser;
 try{
 db(`const f=${fixture};
 for(const email of [f.email,f.partner])await pool.query('INSERT INTO app.accounts(email,password_hash) VALUES($1,$2)',[email,await hashPassword(f.password)]);
 const accounts=(await pool.query('SELECT id,email FROM app.accounts WHERE email=ANY($1)',[[f.email,f.partner]])).rows;
 await pool.query('INSERT INTO app.shared_spaces(id,name,invite_code,created_by) VALUES($1,$2,$3,$4)',[f.local,'Synthetic Original Room',f.code,accounts[0].id]);
 for(const a of accounts)await pool.query('INSERT INTO app.shared_space_members(space_id,account_id,display_name) VALUES($1,$2,$3)',[f.local,a.id,a.email===f.email?'Fixture One':'Fixture Two']);
 await pool.query('INSERT INTO app.legacy_space_mappings VALUES($1,$2)',[f.legacy,f.local]);
 await pool.query("INSERT INTO migration.imported_records(entity_type,source_id,original_row) VALUES('Space',$1,$2)",[f.legacy,{name:'Synthetic Original Room',member_emails:[f.email,f.partner],member_names:['Fixture One','Fixture Two']}]);
 for(let n=0;n<104;n++)await pool.query("INSERT INTO migration.imported_records(entity_type,source_id,original_row) VALUES('Message',$1,$2)",[f.legacy+'-'+n,{space_id:f.legacy,author_id:f.email,created_date:new Date(1700000000000+n*1000).toISOString(),...(n<100?f.envelope:{iv:'!!!!',cipher:'!!!!'})}]);`);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const failures=[];
 async function login(address){const context=await browser.newContext({viewport:{width:1100,height:850},permissions:['microphone','camera']});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>failures.push(e.message));await page.goto((process.env.SYNCSPACE_REACT_URL||'http://127.0.0.1:3003')+'/login');await page.getByLabel('Email',{exact:true}).fill(address);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.getByRole('heading',{name:'Synthetic Original Room',exact:true}).waitFor();return page;}
 const page=await login(email),second=await login(partner);
 await page.locator('nav:visible').getByRole('button',{name:'Our Chat',exact:true}).click();await page.locator('[data-chat-compact="false"]').waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('[data-testid=message-list] > .group').length===104);
 assert.equal(await page.getByText('Synthetic legacy hello',{exact:true}).count(),100);
 assert.equal(await page.getByText(/Encrypted message unavailable —/).count(),4);
 const input=page.getByPlaceholder(/^Message /).last();
 let failOnce=true;
 await page.route('**/api/spaces/**/messages',route=>{if(route.request().method()==='POST'&&failOnce){failOnce=false;return route.abort()}return route.continue()});
 await input.fill('Synthetic React send');await page.getByTitle('Send',{exact:true}).click();
 await page.getByText('Synthetic React send',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Retry message',exact:true}).waitFor();
 const stored=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.startsWith('syncspace:react-outbox:')).map(([,value])=>value));
 assert.ok(stored.length&&stored.every(value=>!value.includes('Synthetic React send')&&!value.includes(code)));
 await page.getByRole('button',{name:'Retry message',exact:true}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-testid=message-list] .group')].some(group=>group.textContent.includes('Synthetic React send')&&group.textContent.includes('Saved')));
 await page.getByText('Synthetic React send',{exact:true}).locator('xpath=../..').getByTitle('Heart this message').click();
 await page.getByText('Synthetic React send',{exact:true}).locator('xpath=../..').getByTitle('Pin this message').click();
 await page.getByRole('button',{name:'1 pinned',exact:true}).waitFor();
 await page.reload();await page.locator('nav:visible').getByRole('button',{name:'Our Chat',exact:true}).click();await page.locator('[data-chat-compact="false"]').waitFor();await page.getByText('Synthetic React send',{exact:true}).waitFor();await page.getByRole('button',{name:'1 pinned',exact:true}).waitFor();
 assert.equal(await page.getByText('Synthetic React send',{exact:true}).locator('xpath=../..').getByTitle('Take your heart back').getAttribute('aria-pressed'),'true');
 await page.getByTitle('Search our chat').click();await page.getByPlaceholder('Search what you two said…').fill('React send');await page.waitForFunction(()=>document.querySelectorAll('[data-testid=message-list] > .group').length===1);
 // Live authenticated sockets: a second browser sees typing and Call Studio rings.
 await page.locator('nav:visible').getByRole('button',{name:'Call',exact:true}).click();await second.locator('nav:visible').getByRole('button',{name:'Call',exact:true}).click();
 await page.getByRole('button',{name:'Start a call',exact:true}).click();
 await second.getByRole('button',{name:'Join the call',exact:true}).waitFor();await second.getByRole('button',{name:'Not right now',exact:true}).click();
 assert.deepEqual(failures,[]);
 console.log('PASS: original React design, mapped legacy room, 100 synthetic decryptions + 4 preserved placeholders, durable send/reaction/pin, reload, search, authenticated Call Studio ring/reject');
 console.log('NOT VERIFIED: the actual private 104 restored messages and remote media transport');
 }finally{
 if(browser)await browser.close();
 db(`const f=${fixture};await pool.query('DELETE FROM app.message_reactions WHERE space_id=$1',[f.legacy]);await pool.query('DELETE FROM app.message_pins WHERE space_id=$1',[f.legacy]);await pool.query('DELETE FROM app.messages WHERE space_id::text=ANY($1)',[[f.legacy,f.local]]);await pool.query('DELETE FROM app.local_entities WHERE space_id=$1',[f.legacy]);await pool.query('DELETE FROM app.room_state WHERE space_id=$1',[f.legacy]);await pool.query("DELETE FROM migration.imported_records WHERE source_id=$1 OR original_row->>'space_id'=$1",[f.legacy]);await pool.query('DELETE FROM app.legacy_space_mappings WHERE legacy_space_id=$1',[f.legacy]);await pool.query('DELETE FROM app.shared_space_members WHERE space_id=$1',[f.local]);await pool.query('DELETE FROM app.shared_spaces WHERE id=$1',[f.local]);await pool.query('DELETE FROM app.accounts WHERE email=ANY($1)',[[f.email,f.partner]]);`);
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
