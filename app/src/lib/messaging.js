import { syncspaceApiBase } from "./syncspaceConnection";
import { syncAuth } from './syncAuth';
export async function messageRequest(path, options = {}) {
 const token=syncAuth.getToken();if(!token)throw Object.assign(new Error('Please sign in again.'),{status:401});
 const response=await fetch(syncspaceApiBase+path,{...options,signal:options.signal||AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...options.headers}});
 if(!response.ok)throw Object.assign(new Error(`Request failed (${response.status}).`),{status:response.status});
 return response.json();
}
export async function conversation(spaceId,options={}) {
 const messages=[];let cursor=null;
 do{const page=await messageRequest(`/spaces/${encodeURIComponent(spaceId)}/messages`+(cursor?'?cursor='+encodeURIComponent(cursor):''),options);messages.push(...page.messages);cursor=page.nextCursor}while(cursor);
 return [...new Map(messages.map(m=>[m.id,m])).values()];
}
export const outboxKey=(email,spaceId)=>`syncspace:react-outbox:${email}:${spaceId}`;
export function readOutbox(key,storage=localStorage){
 try{const items=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(items)?items.filter(p=>typeof p.clientId==='string'&&typeof p.iv==='string'&&typeof p.cipher==='string').slice(0,100):[]}catch{return []}
}
export function saveOutbox(key,items,storage=localStorage){
 // An explicit whitelist: plaintext, keys, tokens, and error objects never persist.
 storage.setItem(key,JSON.stringify(items.map(({clientId,iv,cipher,createdDate})=>({clientId,iv,cipher,createdDate}))));
}
