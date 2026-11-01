let token=null, selectedSpace=null, encryptedMessages=[], spaceKey=null, accountEmail=null;
const el=id=>document.getElementById(id);
const messageCrypto=import('/message-crypto.mjs');
let refreshing=false, generation=0, search='', pinnedOnly=false;
let pending=[];
function queueKey(){return 'syncspace:outbox:'+accountEmail+':'+selectedSpace.id}
function readQueue(){try{const q=JSON.parse(localStorage.getItem(queueKey())||'[]');return Array.isArray(q)?q.filter(x=>typeof x.clientId==='string'&&typeof x.cipher==='string'&&typeof x.iv==='string').slice(0,100):[]}catch{return []}}
function saveQueue(){localStorage.setItem(queueKey(),JSON.stringify(pending.map(({clientId,iv,cipher})=>({clientId,iv,cipher}))))}
async function call(path,opts={}) {
 const r=await fetch('/api'+path,{...opts,signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})}});
 if(!r.ok){const e=Error('Request failed ('+r.status+')');e.status=r.status;throw e}return r.json();
}
async function loadMessages(space) {
 const messages=[];let cursor=null;
 do{const result=await call('/spaces/'+encodeURIComponent(space.id)+'/messages'+(cursor?'?cursor='+encodeURIComponent(cursor):''));messages.push(...result.messages);cursor=result.nextCursor}while(cursor);
 return messages.sort((a,b)=>(Date.parse(a.createdDate)||0)-(Date.parse(b.createdDate)||0)||a.id.localeCompare(b.id));
}
async function chooseSpace(space){
 generation++;spaceKey=null;selectedSpace=space;encryptedMessages=[];pending=readQueue();
 el('messages').textContent='Loading conversation…';el('composer').hidden=true;
 const current=generation;
 const result=await loadMessages(space);if(current!==generation)return;
 encryptedMessages=result;el('space-title').textContent=(space.name||'Our Little Space')+' ✨';
 await renderMessages();loadOverview();window.dispatchEvent(new Event('syncspace:login'));
}
el('form').addEventListener('submit',async e=>{
 e.preventDefault();el('status').textContent='Signing in…';
 try{const login=await call('/auth/login',{method:'POST',body:JSON.stringify({email:el('email').value,password:el('password').value})});
 token=login.token;accountEmail=login.user.email;el('password').value='';
 const {spaces}=await call('/spaces');el('spaces').replaceChildren();
 const select=document.createElement('select');select.setAttribute('aria-label','Conversation');
 for(const space of spaces){const option=document.createElement('option');option.value=space.id;option.textContent=space.name||'Shared space';select.append(option)}
 select.addEventListener('change',()=>chooseSpace(spaces.find(s=>s.id===select.value)).catch(()=>{el('status').textContent='Unable to load conversation. Try again.'}));el('spaces').append(select);
 if(spaces.length)await chooseSpace(spaces[0]);else el('messages').textContent='No spaces linked to this account.';
 el('login').hidden=true;el('app').hidden=false;renderTabs();window.dispatchEvent(new Event('syncspace:login'));
 el('status').textContent='Signed in. Unlock the conversation with its original invitation code.';
 }catch{token=null;el('status').textContent='Sign-in or conversation loading failed. Please try again.'}
});
const controls=document.createElement('div');controls.className='chat-controls';
const searchBox=document.createElement('input');searchBox.type='search';searchBox.placeholder='Search unlocked messages';searchBox.setAttribute('aria-label','Search conversation');searchBox.addEventListener('input',()=>{search=searchBox.value.toLowerCase();renderMessages()});
const pinsButton=document.createElement('button');pinsButton.type='button';pinsButton.textContent='Show pinned';pinsButton.addEventListener('click',()=>{pinnedOnly=!pinnedOnly;pinsButton.textContent=pinnedOnly?'Show all':'Show pinned';renderMessages()});
controls.append(searchBox,pinsButton);el('messages').before(controls);
async function renderMessages(){
 const current=generation,key=spaceKey,box=el('messages'),nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80,top=box.scrollTop;
 const fragment=document.createDocumentFragment();let ok=0,bad=0;
 const cryptoApi=await messageCrypto;
 const items=[...encryptedMessages,...pending.filter(p=>!encryptedMessages.some(m=>m.clientId===p.clientId)).map(p=>({...p,id:p.clientId,pending:true,authorId:accountEmail}))];
 for(const msg of items){
  let content='Conversation locked',failed=false;
  if(key){try{content=await cryptoApi.decryptMessage(key,msg);ok++}catch{content='Encrypted message unavailable — invalid encoding, damaged data, or a different key.';failed=true;bad++}}
  if(current!==generation||key!==spaceKey)return;
  if((search&&!content.toLowerCase().includes(search))||(pinnedOnly&&!msg.pinned))continue;
  const item=document.createElement('div');item.className='message'+(failed?' failed':msg.authorId?.toLowerCase()===accountEmail?' own':' other');
  const text=document.createElement('p');text.textContent=content;item.append(text);
  const stamp=document.createElement('span');stamp.className='stamp';const date=new Date(msg.createdDate);stamp.textContent=Number.isNaN(+date)?'Timestamp unavailable':date.toLocaleString();item.append(stamp);
  if(msg.pending){const state=document.createElement('span');state.textContent=msg.sending?' Sending…':msg.error?' Send failed. ':' Queued offline. ';item.append(state);
   const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.disabled=!!msg.sending;retry.onclick=()=>flushQueue(true);item.append(retry);
  }else{if(msg.clientId){const delivered=document.createElement('span');delivered.textContent=' · Saved';item.append(delivered)}
   const pin=document.createElement('button');pin.type='button';pin.textContent=msg.pinned?'Unpin':'Pin';pin.onclick=()=>updateMessage(msg,'pin',msg.pinned?'DELETE':'PUT');item.append(pin);
   for(const emoji of ['❤️','👍','😂','😮','😢','🎉']){const reaction=(msg.reactions||[]).find(r=>r.emoji===emoji);const button=document.createElement('button');button.type='button';button.textContent=emoji+(reaction?' '+reaction.count:'');button.setAttribute('aria-pressed',String(!!reaction?.mine));button.onclick=()=>updateMessage(msg,'reactions',reaction?.mine?'DELETE':'PUT',{emoji});item.append(button)}
  }
  fragment.append(item);
 }
 if(current!==generation||key!==spaceKey)return;
 box.replaceChildren(fragment);box.scrollTop=nearBottom?box.scrollHeight:top;
 el('recovery').textContent=key?`${ok} decrypted · ${bad} unavailable · ${encryptedMessages.length} saved`:`${encryptedMessages.length} encrypted messages. Enter the original invitation code to unlock.`;
}
async function updateMessage(msg,action,method,body){try{await call('/spaces/'+encodeURIComponent(selectedSpace.id)+'/messages/'+encodeURIComponent(msg.id)+'/'+action,{method,body:body?JSON.stringify(body):undefined});await refreshMessages()}catch{el('status').textContent='Unable to save change. Please retry.'}}
el('decrypt').addEventListener('click',async()=>{
 if(!selectedSpace||!el('joincode').value)return;
 const current=generation;try{const api=await messageCrypto;const key=await api.deriveKey(selectedSpace.id,el('joincode').value);if(current!==generation)return;
 // A wrong code must never enable sending into an existing conversation.
 if(encryptedMessages.length){let verified=false;for(const msg of encryptedMessages){try{await api.decryptMessage(key,msg);verified=true;break}catch{}}if(!verified)throw Error('Unable to unlock any messages. Check the original invitation code.');}
 spaceKey=key;el('composer').hidden=false;await renderMessages();el('status').textContent='Conversation unlocked locally.';flushQueue();
 }catch(e){el('status').textContent=e.message}finally{el('joincode').value=''}
});
el('composer').addEventListener('submit',async e=>{
 e.preventDefault();if(!token||!selectedSpace||!spaceKey)return;
 const input=el('new-message'),text=input.value.trim();if(!text)return;
 if(pending.length>=100){el('status').textContent='Outbox full. Retry pending messages first.';return}
 const current=generation;try{const envelope=await(await messageCrypto).encryptMessage(spaceKey,text);if(current!==generation)return;
 if(envelope.cipher.length>7000)throw Error('Message is too long. Shorten it before sending.');
 const message={...envelope,clientId:crypto.randomUUID()};pending.push(message);
 try{saveQueue()}catch{pending.pop();throw Error('Unable to save encrypted outbox. Your draft has been kept.');}
 input.value='';await renderMessages();flushQueue();
 }catch(e){el('status').textContent=e.message}
});
let flushing=false;
async function flushQueue(manual=false){
 if(flushing||!token||!selectedSpace||!navigator.onLine)return;flushing=true;const current=generation,space=selectedSpace;
 try{for(const message of [...pending]){
  if(current!==generation)break;if(message.error&&!manual&&Date.now()<(message.retryAt||0))continue;
  message.sending=true;await renderMessages();
  try{await call('/spaces/'+encodeURIComponent(space.id)+'/messages',{method:'POST',body:JSON.stringify({clientId:message.clientId,iv:message.iv,cipher:message.cipher})});if(current!==generation)break;
   pending=pending.filter(p=>p.clientId!==message.clientId);saveQueue();
  }catch(e){if(current!==generation)break;message.error=true;message.retryAt=Date.now()+30000;if([400,401,403,404,409].includes(e.status))message.retryAt=Infinity;}
  finally{message.sending=false}
 }}finally{flushing=false;if(current===generation){await refreshMessages();await renderMessages()}}
}
async function refreshMessages(){
 if(refreshing||!token||!selectedSpace)return;refreshing=true;const current=generation,space=selectedSpace;
 try{const result=await loadMessages(space);if(current!==generation)return;encryptedMessages=result;pending=pending.filter(p=>!result.some(m=>m.clientId===p.clientId));saveQueue();await renderMessages();el('send-hint').textContent='Encrypted locally. Saved means accepted by the server, not read by your partner. Updates every 5 seconds.'}
 catch{if(current===generation)el('send-hint').textContent='Connection interrupted. Your unlocked conversation remains visible; retrying automatically.'}finally{refreshing=false}
}
setInterval(()=>{if(!document.hidden){refreshMessages();flushQueue()}},5000);
window.addEventListener('online',()=>{refreshMessages();flushQueue()});
window.addEventListener('syncspace:logout',()=>{generation++;pending=[];accountEmail=null;search='';searchBox.value='';pinnedOnly=false;});
