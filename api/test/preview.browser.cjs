// Synthetic network fixtures only. No account or private content is used.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(10000);
 const failures=[];page.on('pageerror',e=>failures.push(e.message));
 const {deriveKey,encryptMessage}=await import('../../preview/message-crypto.mjs');
 const envelope=await encryptMessage(await deriveKey('browser-fixture','fixture-code'),'Synthetic hello');
 const messages=[{...envelope,id:'legacy-fixture',createdDate:'2026-01-01T12:00:00Z',authorId:'fixture@example.invalid'},{id:'bad-fixture',iv:'!!!!',cipher:'!!!!'}];
 let dropResponse=true,posts=0;
 await page.route('**/api/**',async route=>{
  const request=route.request(),p=new URL(request.url()).pathname.replace('/api',''),method=request.method();let data={};
  if(p==='/auth/login')data={token:'synthetic-session',user:{email:'fixture@example.invalid'}};
  else if(p==='/spaces')data={spaces:[{id:'browser-fixture',name:'Synthetic space'}]};
  else if(p.endsWith('/messages')&&method==='GET')data={messages,nextCursor:null};
  else if(p.endsWith('/messages')&&method==='POST'){
   posts++;const body=request.postDataJSON();if(dropResponse){dropResponse=false;await route.abort();return;}if(!messages.some(m=>m.clientId===body.clientId))messages.push({...body,id:'local-1',createdDate:new Date().toISOString(),authorId:'fixture@example.invalid'});
   data={id:'local-1'};
  }else if(p.endsWith('/pin')){messages.find(m=>p.includes(m.id)).pinned=method==='PUT';}
  else if(p.endsWith('/reactions')){const m=messages.find(m=>p.includes(m.id));m.reactions=method==='PUT'?[{emoji:request.postDataJSON().emoji,count:1,mine:true}]:[];}
  else if(p.endsWith('/vault'))data={initialized:false};
  else if(p.endsWith('/overview'))data={counts:{},newMessages:0};
  else if(p.endsWith('/inventory'))data={collections:[]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(process.env.SYNCSPACE_PREVIEW||'http://127.0.0.1:3002');
 await page.locator('#email').fill('fixture@example.invalid');await page.locator('#password').fill('synthetic-password');await page.locator('#form button').click();
 await page.locator('#app').waitFor({state:'visible'});await page.locator('#tabs button').nth(3).click();
 await page.locator('#joincode').fill('fixture-code');await page.locator('#decrypt').click();
 await page.getByText('Synthetic hello',{exact:true}).waitFor();await page.getByText(/Encrypted message unavailable/).waitFor();
 await page.locator('#new-message').fill('Synthetic retry message');await page.locator('#composer button').click();
 await page.getByRole('button',{name:'Retry',exact:true}).waitFor();await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.locator('#messages').getByText('· Saved',{exact:true}).waitFor();assert.equal(posts,2);assert.equal(messages.length,3);
 const stored=await page.evaluate(()=>Object.values(localStorage));assert.ok(stored.every(v=>!v.includes('Synthetic retry message')&&!v.includes('fixture-code')));
 await page.getByRole('searchbox').fill('hello');assert.equal(await page.locator('#messages .message').count(),1);
 await page.getByRole('searchbox').fill('');await page.locator('#messages .message').first().getByRole('button',{name:'Pin',exact:true}).click();
 await page.getByRole('button',{name:'Show pinned',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#messages .message').length===1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#messages').textContent(),'');assert.deepEqual(failures,[]);
 console.log('PASS: mobile preview unlock, corrupt-record placeholder, duplicate-safe retry, encrypted outbox, search, pins, logout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);console.error('Preview browser test failed (synthetic fixture); inspect locally without logging credentials.');process.exitCode=1});
