const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 try{
 let active=null,sequence=0;const errors=[];
 async function pageFor(email){
  const context=await browser.newContext({permissions:['camera','microphone']});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;let data={};
   if(p.endsWith('/auth/login'))data={token:email,user:{email}};
   else if(p==='/api/spaces')data={spaces:[{id:'call-fixture',name:'Synthetic call'}]};
   else if(p.endsWith('/messages'))data={messages:[],nextCursor:null};
   else if(p.endsWith('/rtc-config'))data={iceServers:[],relayConfigured:false};
   else if(p.endsWith('/call')){
    if(req.method()==='POST'){
     const body=req.postDataJSON();
     if(body.action==='offer')active={id:'fixture-call',caller:email,offer:body.description,candidates:[]};
     else if(body.action==='answer'){active.answer=body.description;active.callee=email}
     else if(body.action==='candidate')active?.candidates.push({sender:email,candidate:body.candidate,sequence:++sequence});
     else if(['end','reject'].includes(body.action))active=null;
    }
    const after=Number(new URL(req.url()).searchParams.get('after')||0);
    data={call:active?{id:active.id,incoming:active.caller!==email,accepted:!!active.answer,offer:email!==active.caller?active.offer:undefined,answer:email===active.caller?active.answer:undefined,candidates:active.candidates.filter(c=>c.sender!==email&&c.sequence>after),sequence}:null};
   }else if(p.endsWith('/overview'))data={counts:{}};
   else if(p.endsWith('/inventory'))data={collections:[]};
   else if(p.endsWith('/vault'))data={initialized:false};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(process.env.SYNCSPACE_PREVIEW||'http://127.0.0.1:3002');await page.locator('#email').fill(email);await page.locator('#password').fill('synthetic-password');await page.locator('#form button').click();await page.locator('#app').waitFor({state:'visible'});await page.locator('#tabs button').nth(8).click();return page;
 }
 const caller=await pageFor('caller@example.invalid'),callee=await pageFor('callee@example.invalid');
 await caller.getByRole('button',{name:'Video call',exact:true}).click();
 await callee.getByRole('button',{name:'Accept incoming call',exact:true}).waitFor({state:'visible'});await callee.getByRole('button',{name:'Accept incoming call',exact:true}).click();
 if(process.env.SYNCSPACE_TEST_MEDIA==='1'){
  for(const page of [caller,callee])await page.waitForFunction(()=>document.querySelector('#call-controls [role=status]').textContent.includes('connected'));
  assert.ok(await callee.locator('#call-controls video').nth(1).evaluate(v=>v.srcObject.getVideoTracks().length===1&&v.srcObject.getAudioTracks().length===1));
 }
 await caller.getByRole('button',{name:'Mute microphone',exact:true}).click();assert.equal(await caller.locator('#call-controls video').first().evaluate(v=>v.srcObject.getAudioTracks()[0].enabled),false);
 await caller.getByRole('button',{name:'Disable camera',exact:true}).click();assert.equal(await caller.locator('#call-controls video').first().evaluate(v=>v.srcObject.getVideoTracks()[0].enabled),false);
 await caller.getByRole('button',{name:'End call',exact:true}).click();await callee.waitForFunction(()=>document.querySelector('#call-controls video').srcObject===null);
 assert.equal(active,null);assert.deepEqual(errors,[]);
 console.log('PASS: call UI offer/accept, local microphone/camera controls and termination');
 if(process.env.SYNCSPACE_TEST_MEDIA!=='1')console.log('NOT RUN: remote media/ICE connection (set SYNCSPACE_TEST_MEDIA=1 on a network allowing WebRTC or configure TURN)');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
