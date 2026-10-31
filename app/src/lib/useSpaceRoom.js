import { useCallback, useEffect, useRef, useState } from 'react';
export function useSpaceRoom(spaceId, myName) {
 const [connected,setConnected]=useState(false);
 const [peers,setPeers]=useState([]);
 const [seat,setSeat]=useState(null);
 const [roomState,setRoomState]=useState({playback:null,timer:null});
 const socket=useRef(null), handlers=useRef(new Map()), name=useRef(myName);
 name.current=myName;
 useEffect(()=>{
  if(!spaceId)return;
  let closed=false, ws, retry;
  let id=sessionStorage.getItem('syncspace:conn');
  if(!id){id=crypto.randomUUID();sessionStorage.setItem('syncspace:conn',id);}
  const connect=()=>{
   if(closed)return;
   const protocol=location.protocol==='https:'?'wss:':'ws:';
   ws=new WebSocket(`${protocol}//${location.host}/rt?space=${encodeURIComponent(spaceId)}&id=${encodeURIComponent(id)}`);
   socket.current=ws;
   ws.onmessage=e=>{
    let msg;try{msg=JSON.parse(e.data)}catch{return;}
    if(msg.type==='you'){setSeat(msg.seat);setConnected(true);ws.send(JSON.stringify({type:'hello',name:name.current}));return;}
    if(msg.type==='presence'){setPeers(msg.users||[]);return;}
    if(msg.type==='state'){setRoomState(msg);return;}
    handlers.current.get(msg.type)?.forEach(fn=>fn(msg));
   };
   ws.onclose=e=>{setConnected(false);if(!closed && e.code!==1008)retry=setTimeout(connect,2000);};
  };
  connect();
  return()=>{closed=true;clearTimeout(retry);ws?.close();socket.current=null;setConnected(false);};
 },[spaceId]);
 const send=useCallback(msg=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify(msg));},[]);
 const on=useCallback((type,fn)=>{if(!handlers.current.has(type))handlers.current.set(type,new Set());handlers.current.get(type).add(fn);return()=>handlers.current.get(type)?.delete(fn);},[]);
 return {connected,peers,seat,roomState,send,on};
}
