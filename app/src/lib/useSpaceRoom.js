import { syncspaceWsBase } from "./syncspaceConnection";
import {messageRequest} from './messaging';
import {syncAuth} from './syncAuth';
import { useCallback, useEffect, useRef, useState } from 'react';
export function useSpaceRoom(spaceId, myName) {
 const [connected,setConnected]=useState(false);
 const [peers,setPeers]=useState([]);
 const [seat,setSeat]=useState(null);
 const [roomState,setRoomState]=useState({playback:null,timer:null});
 const iceServersRef=useRef([]),iceAt=useRef(0);
 const loadIce=useCallback(async()=>{
  if(!spaceId)return;
  if(Date.now()-iceAt.current<240000)return;
  const config=await messageRequest('/spaces/'+encodeURIComponent(spaceId)+'/rtc-config');
  iceServersRef.current=config.iceServers;iceAt.current=Date.now();
 },[spaceId]);
 const socket=useRef(null), handlers=useRef(new Map()), name=useRef(myName);
 name.current=myName;
 useEffect(()=>{
  if(!spaceId)return;
  let closed=false, ws, retry;
  let attempts=0;
  let id=sessionStorage.getItem('syncspace:conn');
  if(!id){id=crypto.randomUUID();sessionStorage.setItem('syncspace:conn',id);}
  const connect=()=>{
   if(closed)return;
   ws=new WebSocket(`${syncspaceWsBase}?space=${encodeURIComponent(spaceId)}&id=${encodeURIComponent(id)}`);
   socket.current=ws;
   ws.onopen=()=>{attempts=0;ws.send(JSON.stringify({type:'auth',token:syncAuth.getToken()}))};
   ws.onerror=()=>setConnected(false);
   ws.onmessage=e=>{
    let msg;try{msg=JSON.parse(e.data)}catch{return;}
    if(msg.type==='you'){setSeat(msg.seat);setConnected(true);ws.send(JSON.stringify({type:'hello',name:name.current}));return;}
    if(msg.type==='presence'){setPeers(msg.users||[]);return;}
    if(msg.type==='entities-changed')window.dispatchEvent(new Event('syncspace:entities-changed'));
    if(msg.type==='state'){setRoomState(msg);return;}
    handlers.current.get(msg.type)?.forEach(fn=>fn(msg));
   };
   ws.onclose=e=>{
    setConnected(false);
    setPeers([]);
    if(!closed && e.code!==1008){
      const delay=Math.min(30000,1000*Math.pow(2,Math.min(attempts++,5)));
      retry=setTimeout(connect,delay);
    }
   };
  };
  const changed=()=>sendLocal();
  const sendLocal=()=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'entities-changed'}))};
  const reconnectOnOnline=()=>{
    if(closed || ws?.readyState===WebSocket.OPEN || ws?.readyState===WebSocket.CONNECTING)return;
    clearTimeout(retry);
    connect();
  };
  window.addEventListener('syncspace:local-change',changed);
  window.addEventListener('online',reconnectOnOnline);
  connect();
  return()=>{window.removeEventListener('syncspace:local-change',changed);window.removeEventListener('online',reconnectOnOnline);closed=true;clearTimeout(retry);ws?.close();socket.current=null;setConnected(false);setPeers([]);setSeat(null);setRoomState({playback:null,timer:null});};
 },[spaceId]);
 const send=useCallback(msg=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify(msg));},[]);
 const on=useCallback((type,fn)=>{if(!handlers.current.has(type))handlers.current.set(type,new Set());handlers.current.get(type).add(fn);return()=>{handlers.current.get(type)?.delete(fn)};},[]);
 return {connected,peers,seat,roomState,send,on,iceServersRef,loadIce};
}
