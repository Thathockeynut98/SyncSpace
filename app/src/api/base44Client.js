// Compatibility facade for the original components. All persistence now uses the
// authenticated local API. It never falls back to hosted Base44 or private storage.
import {messageRequest} from '@/lib/messaging';
let activeSpace=null;
export function setActiveSpace(id){activeSpace=id}
const listeners=new Map();
function emit(type,event){listeners.get(type)?.forEach(fn=>fn(event))}
window.addEventListener('syncspace:entities-changed',()=>{for(const type of listeners.keys())emit(type,{type:'refresh'})});
const endpoint=(type,id)=>{if(!activeSpace)throw Error('Open your shared space first.');return `/spaces/${encodeURIComponent(activeSpace)}/entities/${type}`+(id?'/'+encodeURIComponent(id):'')};
const matches=(row,query)=>Object.entries(query).every(([field,value])=>{
 if(field==='space_id')return true;const actual=row[field];
 if(value&&typeof value==='object'){if('$gte' in value)return actual>=value.$gte;if('$in' in value)return value.$in.includes(actual);return false}
 return actual===value;
});
/** @type {Record<string, any>} */
const entities=new Proxy({}, {get:(_,type)=>({
 async filter(query={},options={}){
  if(query.space_id&&activeSpace&&query.space_id!==activeSpace)throw Error('Conversation changed. Reload this section.');
  let offset=0,items=[];do{const page=await messageRequest(endpoint(type)+'?offset='+offset);items.push(...page.items);offset=page.nextOffset}while(offset!==null);
  items=items.filter(row=>matches(row,query));
  if(options.sort){const field=options.sort.replace(/^-/,'');const direction=options.sort.startsWith('-')?-1:1;items.sort((a,b)=>String(a[field]??'').localeCompare(String(b[field]??''))*direction)}
  return {items:items.slice(options.skip||0,(options.skip||0)+(options.limit||items.length))};
 },
 async count(query){return (await this.filter(query)).items.length},
 async aggregate(options){
  if(!options?.groupBy)throw Error('Grouping is required.');
  const {items}=await this.filter();const groups=new Map();
  for(const item of items){const key=item[options.groupBy];if(!groups.has(key))groups.set(key,{[options.groupBy]:key});const row=groups.get(key);for(const field of options.min||[])row[field]=Math.min(row[field]??Infinity,Number(item[field])||0)}
  return [...groups.values()];
 },
 async create(data){const saved=await messageRequest(endpoint(type),{method:'POST',body:JSON.stringify(data)});emit(type,{type:'create',data:saved});window.dispatchEvent(new Event('syncspace:local-change'));return saved},
 async update(id,data){const saved=await messageRequest(endpoint(type,id),{method:'PATCH',body:JSON.stringify(data)});emit(type,{type:'update',data:saved});window.dispatchEvent(new Event('syncspace:local-change'));return saved},
 async delete(id){await messageRequest(endpoint(type,id),{method:'DELETE'});emit(type,{type:'delete',data:{id}});window.dispatchEvent(new Event('syncspace:local-change'))},
 subscribe(fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);const timer=setInterval(()=>fn({type:'refresh'}),15000);return()=>{clearInterval(timer);listeners.get(type)?.delete(fn)}},
})});
/** @returns {Promise<any>} */
const unavailable=async(..._args)=>{throw Error('Private file storage and external integrations are not connected yet. Original records remain preserved.')};
export const base44={entities,integrations:{Core:{UploadPrivateFile:unavailable,CreateFileSignedUrl:unavailable}},functions:{invoke:unavailable}};
