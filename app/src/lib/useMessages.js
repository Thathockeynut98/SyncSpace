import {useCallback,useEffect,useRef,useState} from 'react';
import {conversation,messageRequest,outboxKey,readOutbox,saveOutbox} from './messaging';
import {decryptText,encryptText,spaceKey} from './spaceCrypto';
export function useMessages(space,user,room){
 const [messages,setMessages]=useState([]),[ready,setReady]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState('');
 const scope=outboxKey(user.email,space.id),live=useRef(null),pending=useRef([]),records=useRef([]),key=useRef(null),loading=useRef(false),flushing=useRef(false),verified=useRef(false);
 const render=useCallback(async(current)=>{
  const merged=[...records.current,...pending.current.filter(p=>!records.current.some(r=>r.clientId===p.clientId)).map(p=>({...p,id:p.clientId,authorId:user.email,pending:true}))];
  const opened=await Promise.all(merged.map(async record=>{
   let body='Encrypted message unavailable — damaged encoding, data, or a different key.',unreadable=false;
   try{body=await decryptText(key.current,record.cipher,record.iv)}catch{unreadable=true}
   const heart=(record.reactions||[]).find(r=>r.emoji==='❤️');
   return {...record,body,unreadable,heartCount:heart?.count||0,hearted:!!heart?.mine,author_id:record.author_id??record.authorId,author_name:record.author_name??record.authorName,created_date:record.created_date??record.createdDate};
  }));
  if(live.current!==current)return;
  verified.current=!records.current.length||opened.some(m=>!m.pending&&!m.unreadable);
  setMessages(opened.sort((a,b)=>(Date.parse(a.created_date)||0)-(Date.parse(b.created_date)||0)||a.id.localeCompare(b.id)));
 },[user.email]);
 const load=useCallback(async()=>{
  if(loading.current||!live.current)return;loading.current=true;const current=live.current;
  try{const derived=key.current||await spaceKey(space);if(live.current!==current)return;key.current=derived;const result=await conversation(space.id);if(live.current!==current)return;
   records.current=result;pending.current=pending.current.filter(p=>!result.some(r=>r.clientId===p.clientId));saveOutbox(scope,pending.current);await render(current);if(live.current===current)setError('');
  }catch{if(live.current===current)setError('Conversation unavailable. Retrying automatically; your draft and encrypted outbox are kept.');}
  finally{loading.current=false;if(live.current===current)setReady(true)}
 },[space,scope,render]);
 const flush=useCallback(async(manual=false)=>{
  if(flushing.current||!live.current||!navigator.onLine)return;flushing.current=true;const current=live.current;
  try{for(const entry of [...pending.current]){
   if(live.current!==current)break;if(entry.retryAt>Date.now()&&!manual)continue;entry.sending=true;await render(current);
   try{await messageRequest(`/spaces/${encodeURIComponent(space.id)}/messages`,{method:'POST',body:JSON.stringify({clientId:entry.clientId,iv:entry.iv,cipher:entry.cipher})});if(live.current!==current)break;
    pending.current=pending.current.filter(p=>p.clientId!==entry.clientId);saveOutbox(scope,pending.current);room?.send({type:'messages-changed'});
   }catch(e){entry.failed=true;entry.retryAt=[400,401,403,404,409].includes(e.status)?Infinity:Date.now()+30000}
   finally{entry.sending=false}
  }}finally{flushing.current=false;if(live.current===current){await load();await render(current)}}
 },[space.id,scope,render,load,room?.send]);
 useEffect(()=>{
  const current={};live.current=current;records.current=[];pending.current=readOutbox(scope);key.current=null;verified.current=false;setMessages([]);setReady(false);
  load();const resume=()=>{load();flush()};const timer=setInterval(resume,5000);window.addEventListener('online',resume);window.addEventListener('focus',resume);const off=room?.on('messages-changed',load);
  return()=>{live.current=null;clearInterval(timer);window.removeEventListener('online',resume);window.removeEventListener('focus',resume);off?.()};
 },[scope,load,flush,room?.on]);
 const send=async text=>{
  if(!text.trim()||sending)return;setSending(true);const current=live.current;
  try{if(!verified.current)throw Error('Unlock the existing conversation before sending. Check the room encryption information.');
   if(pending.current.length>=100)throw Error('Your outbox is full. Retry pending messages first.');
   const envelope=await encryptText(key.current,text.trim());if(envelope.cipher.length>7000)throw Error('Message too long. Please shorten it.');if(live.current!==current)return;
   const entry={...envelope,clientId:crypto.randomUUID(),createdDate:new Date().toISOString()};const next=[...pending.current,entry];
   saveOutbox(scope,next);pending.current=next;await render(current);void flush();
  }catch(e){setError(e.message);throw e}finally{if(live.current===current)setSending(false)}
 };
 const update=async(message,action,method,body)=>{
  try{await messageRequest(`/spaces/${encodeURIComponent(space.id)}/messages/${encodeURIComponent(message.id)}/${action}`,{method,body:body?JSON.stringify(body):undefined});room?.send({type:'messages-changed'});await load()}
  catch{setError('Unable to save that change. Please retry.')}
 };
 return {messages,ready,sending,error,load,send,retry:()=>flush(true),toggleHeart:m=>update(m,'reactions',m.hearted?'DELETE':'PUT',{emoji:'❤️'}),togglePin:m=>update(m,'pin',m.pinned?'DELETE':'PUT')};
}
