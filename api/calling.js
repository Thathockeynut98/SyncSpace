import crypto from 'node:crypto';
import {isMember} from './messaging.js';
// Ephemeral signaling only. A process restart terminates calls; no SDP or ICE is logged.
export class CallRegistry {
  constructor(now=Date.now){this.calls=new Map();this.now=now;}
  prune(){for(const [room,c] of this.calls)if(c.expires<=this.now())this.calls.delete(room)}
  get(room){this.prune();return this.calls.get(room)}
  start(room,account,offer){
    this.prune();if(this.calls.has(room))throw Object.assign(Error('Call already active'),{status:409});
    if(this.calls.size>=100)throw Object.assign(Error('Call capacity reached'),{status:503});
    const call={id:crypto.randomUUID(),caller:account,callee:null,offer,answer:null,candidates:[],sequence:0,expires:this.now()+45000};this.calls.set(room,call);return call;
  }
  view(call,account,after=0){return {id:call.id,incoming:call.caller!==account,accepted:!!call.answer,offer:call.caller!==account?call.offer:undefined,answer:call.caller===account?call.answer:undefined,candidates:call.candidates.filter(c=>c.sender!==account&&c.sequence>after).map(({sender,...rest})=>rest),sequence:call.sequence};}
}
export const calls=new CallRegistry();
function validDescription(s,type){return s&&s.type===type&&typeof s.sdp==='string'&&s.sdp.length>0&&s.sdp.length<16000;}
export async function handleCalling({req,res,url,pool,accountFromToken,reply,bodyJson}){
 const match=/^\/spaces\/([A-Za-z0-9_-]{1,100})\/(call|rtc-config)$/.exec(url.pathname);if(!match)return false;
 const account=await accountFromToken(req);if(!account){reply(res,401,{error:'Unauthorized'});return true;}
 const room=match[1];if(!await isMember(pool,room,account.email)){reply(res,404,{error:'Not found'});return true;}
 if(match[2]==='rtc-config'){
  if(req.method!=='GET'){reply(res,405,{error:'Method not allowed'});return true;}
  const iceServers=[];
  if(process.env.SYNCSPACE_STUN_URL)iceServers.push({urls:process.env.SYNCSPACE_STUN_URL});
  if(process.env.SYNCSPACE_TURN_URL&&process.env.SYNCSPACE_TURN_SECRET){
   // TURN REST credentials expire in ten minutes. Only the server holds the signing secret.
   const username=Math.floor(Date.now()/1000+600)+':'+account.id;
   iceServers.push({urls:process.env.SYNCSPACE_TURN_URL,username,credential:crypto.createHmac('sha1',process.env.SYNCSPACE_TURN_SECRET).update(username).digest('base64')});
  }
  reply(res,200,{iceServers,relayConfigured:iceServers.some(s=>s.credential),credentialTtlSeconds:600});return true;
 }
 let call=calls.get(room);
 const participant=()=>call&&(call.caller===account.email||call.callee===account.email);
 if(req.method==='GET'){
  if(!call){reply(res,200,{call:null});return true;}
  if(call.callee&&!participant()){reply(res,200,{call:null});return true;}
  if(participant()&&call.answer)call.expires=Date.now()+120000;
  const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0){reply(res,400,{error:'Invalid sequence'});return true;}
  reply(res,200,{call:calls.view(call,account.email,after)});return true;
 }
 if(req.method!=='POST'){reply(res,405,{error:'Method not allowed'});return true;}
 const body=await bodyJson(req);
 if(body.action==='offer'){
  if(!validDescription(body.description,'offer')){reply(res,400,{error:'Invalid offer'});return true;}
  try{call=calls.start(room,account.email,body.description)}catch(e){reply(res,e.status,{error:e.message});return true;}
 }else{
  if(!call||body.callId!==call.id){reply(res,409,{error:'Call has ended'});return true;}
  if(body.action==='answer'){
   if(call.caller===account.email||call.callee||!validDescription(body.description,'answer')){reply(res,409,{error:'Call cannot be accepted'});return true;}
   call.callee=account.email;call.answer=body.description;call.expires=Date.now()+120000;
  }else if(body.action==='end'||body.action==='reject'){
   if(!participant()&&!(body.action==='reject'&&!call.callee)){reply(res,403,{error:'Not a call participant'});return true;}
   calls.calls.delete(room);reply(res,200,{call:null});return true;
  }else if(body.action==='candidate'){
   if(!participant()){reply(res,403,{error:'Not a call participant'});return true;}
   const c=body.candidate;
   if(!c||typeof c.candidate!=='string'||c.candidate.length>2000||!Number.isInteger(c.sdpMLineIndex)||c.sdpMLineIndex<0||typeof c.sdpMid!=='string'||c.sdpMid.length>100){reply(res,400,{error:'Invalid ICE candidate'});return true;}
   if(call.candidates.length>=1000){reply(res,429,{error:'ICE candidate limit reached'});return true;}
   call.candidates.push({candidate:{candidate:c.candidate,sdpMid:c.sdpMid,sdpMLineIndex:c.sdpMLineIndex},sender:account.email,sequence:++call.sequence});
  }else{reply(res,400,{error:'Invalid call action'});return true;}
 }
 reply(res,200,{call:calls.view(call,account.email)});return true;
}
