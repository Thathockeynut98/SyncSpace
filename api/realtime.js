import crypto from 'node:crypto';
import {WebSocketServer} from 'ws';
import SpaceRoom from './room.js';
import {resolveSpace} from './spaces.js';
export function attachRealtime(server,pool,accountFromToken){
 const wss=new WebSocketServer({noServer:true,maxPayload:40000,perMessageDeflate:false});const rooms=new Map();
 const allowed=new Set((process.env.SYNCSPACE_ALLOWED_ORIGINS||'http://localhost:3003,http://127.0.0.1:3003').split(','));
 server.on('upgrade',(req,socket,head)=>{
  let url;try{url=new URL(req.url,'http://localhost')}catch{socket.destroy();return}
  if(url.pathname!=='/rt'||!allowed.has(req.headers.origin)||!/^[-\w]{1,100}$/.test(url.searchParams.get('space')||'')){socket.destroy();return}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',(socket,req)=>{
  let conn=null,room=null,authenticating=false,sessionHash=null,lastCheck=0,chain=Promise.resolve(),windowAt=Date.now(),count=0;
  const authTimeout=setTimeout(()=>socket.close(1008,'Authentication required'),5000);
  const check=async()=>{
   const result=await pool.query('SELECT a.id,a.email FROM app.sessions s JOIN app.accounts a ON a.id=s.account_id WHERE token_hash=$1 AND expires_at>now()',[sessionHash]);
   return result.rows[0]&&await resolveSpace(pool,conn.requested,result.rows[0]);
  };
  socket.on('message',raw=>{
   if(Date.now()-windowAt>1000){windowAt=Date.now();count=0}if(++count>100){socket.close(1008,'Rate limit');return}
   let message;try{message=JSON.parse(raw.toString())}catch{socket.close(1008,'Invalid message');return}
   if(!conn){
    if(authenticating||message?.type!=='auth'||typeof message.token!=='string'){socket.close(1008,'Authentication required');return}
    authenticating=true;
    chain=chain.then(async()=>{
     const account=await accountFromToken({headers:{authorization:'Bearer '+message.token}});
     sessionHash=crypto.createHash('sha256').update(message.token).digest('hex');delete message.token;
     const requested=new URL(req.url,'http://localhost').searchParams.get('space');
     const resolved=account&&await resolveSpace(pool,requested,account);
     if(!resolved||socket.readyState!==1){socket.close(1008,'Unauthorized');return}
     let held=rooms.get(resolved.id);if(!held){const actor=new SpaceRoom(resolved.id,pool);held={actor,ready:actor.handleStart(),tail:Promise.resolve()};rooms.set(resolved.id,held)}
     room=held;await held.ready;
     if(room.actor.getConnections().length>=8){socket.close(1008,'Room full');return}
     conn={id:crypto.randomUUID(),requested,socket,identity:{type:'authenticated',userId:String(account.id)},sessionHash,
      send:m=>{if(socket.readyState===1){if(socket.bufferedAmount>1024*1024){socket.close(1008,'Slow consumer');return}socket.send(JSON.stringify(m))}},reject:(code,reason)=>socket.close(code,reason)};
     clearTimeout(authTimeout);room.actor.connections.add(conn);await room.actor.handleConnect(conn);lastCheck=Date.now();
    }).catch(()=>socket.close(1011,'Connection failed'));
    return;
   }
   // Serial handling preserves the original actor's game turns and state transitions.
   room.tail=room.tail.then(async()=>{
    if(socket.readyState!==1)return;
    if(Date.now()-lastCheck>5000){if(!await check()){socket.close(1008,'Unauthorized');return}lastCheck=Date.now()}
    if(['messages-changed','entities-changed'].includes(message?.type)){room.actor.broadcast({type:message.type,from:room.actor.users.get(conn.id)?.seat});return}
    await room.actor.handleMessage(conn,message);
   }).catch(()=>socket.close(1011,'Message failed'));
  });
  socket.on('error',()=>{});
  socket.on('close',()=>{clearTimeout(authTimeout);if(conn&&room){room.actor.connections.delete(conn);room.tail=room.tail.then(()=>room.actor.handleClose(conn)).then(()=>{if(!room.actor.getConnections().length&&rooms.get(room.actor.id)===room)rooms.delete(room.actor.id)}).catch(()=>{});}});
  socket.authorized=()=>conn?check():true;
  socket.isAlive=true;socket.on('pong',()=>{socket.isAlive=true});
 });
 const heartbeat=setInterval(()=>{for(const socket of wss.clients){if(!socket.isAlive){socket.terminate();continue}socket.isAlive=false;Promise.resolve(socket.authorized()).then(ok=>{if(!ok)socket.close(1008,'Unauthorized');else socket.ping()}).catch(()=>socket.close(1011,'Connection failed'))}},30000);heartbeat.unref();
 server.on('close',()=>{clearInterval(heartbeat);for(const socket of wss.clients)socket.terminate();wss.close()});
 return {revoke:hash=>{for(const room of rooms.values())for(const conn of room.actor.connections)if(conn.sessionHash===hash)conn.socket.close(1008,'Signed out')}};
}
