/* WebRTC media uses browser DTLS-SRTP. No additional application E2EE layer. */
(()=>{
 let pc=null,local=null,remote=null,callId=null,room=null,after=0,busy=false,screen=null,started=0,disconnectTimer=null;
 let pendingCandidates=[],notice='Ready',devices=[];
 const state={mic:true,camera:true},root=document.createElement('section');root.id='call-controls';
 const status=document.createElement('p');status.setAttribute('role','status');
 const localVideo=document.createElement('video'),remoteVideo=document.createElement('video');
 localVideo.autoplay=remoteVideo.autoplay=true;localVideo.muted=true;localVideo.playsInline=remoteVideo.playsInline=true;
 for(const video of [localVideo,remoteVideo]){video.style.width='min(100%, 420px)';root.append(video)}
 const actions=document.createElement('div'),micSelect=document.createElement('select'),cameraSelect=document.createElement('select');
 micSelect.setAttribute('aria-label','Microphone');cameraSelect.setAttribute('aria-label','Camera');
 root.append(status,actions,micSelect,cameraSelect);
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(()=>{notice='Operation failed. Check browser permissions, connection and devices.';render()});actions.append(b);return b}
 const voice=button('Voice call',()=>start(false)),video=button('Video call',()=>start(true));
 const accept=button('Accept incoming call',()=>answer()),reject=button('Reject',()=>end('reject'));
 const hangup=button('End call',()=>end());
 const mute=button('Mute microphone',()=>{state.mic=!state.mic;local?.getAudioTracks().forEach(t=>t.enabled=state.mic);render()});
 const camera=button('Disable camera',()=>{state.camera=!state.camera;local?.getVideoTracks().forEach(t=>t.enabled=state.camera);render()});
 const share=button('Share screen',async()=>{
  if(!pc||!navigator.mediaDevices.getDisplayMedia)throw Error('Screen sharing unavailable');
  if(screen){await stopScreen();return}
  screen=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const track=screen.getVideoTracks()[0];
  const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(!sender){screen.getTracks().forEach(t=>t.stop());screen=null;notice='Start a video call before sharing your screen.';render();return}
  await sender.replaceTrack(track);track.onended=()=>stopScreen();render();
 });
 button('Enable call notifications',async()=>{if('Notification' in window)await Notification.requestPermission()});
 async function stopScreen(){const active=screen;screen=null;active?.getTracks().forEach(t=>t.stop());const sender=pc?.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(local?.getVideoTracks()[0]||null);render()}
 async function signal(action,extra={}){return call('/spaces/'+encodeURIComponent(room)+'/call',{method:'POST',body:JSON.stringify({action,callId,...extra})})}
 function cleanup(){clearTimeout(disconnectTimer);pc?.close();pc=null;local?.getTracks().forEach(t=>t.stop());screen?.getTracks().forEach(t=>t.stop());screen=null;local=null;remote=null;localVideo.srcObject=remoteVideo.srcObject=null;callId=null;after=0;pendingCandidates=[];started=0;state.mic=state.camera=true;render()}
 async function end(action='end'){try{if(callId)await signal(action)}finally{cleanup();notice='Call ended';render()}}
 async function peer(withVideo){
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Secure browser context required');
  const config=await call('/spaces/'+encodeURIComponent(room)+'/rtc-config');
  local=await navigator.mediaDevices.getUserMedia({audio:micSelect.value?{deviceId:{exact:micSelect.value}}:true,video:withVideo?(cameraSelect.value?{deviceId:{exact:cameraSelect.value}}:true):false});
  localVideo.srcObject=local;remote=new MediaStream();remoteVideo.srcObject=remote;
  pc=new RTCPeerConnection({iceServers:config.iceServers});
  for(const track of local.getTracks())pc.addTrack(track,local);
  pc.ontrack=e=>{if(!remote.getTracks().some(t=>t.id===e.track.id))remote.addTrack(e.track);remoteVideo.play().catch(()=>{notice='Tap the remote video to enable audio';render()})};
  remoteVideo.onclick=()=>remoteVideo.play();
  pc.onicecandidate=e=>{if(e.candidate){const candidate=e.candidate.toJSON();if(callId)signal('candidate',{candidate}).catch(()=>{notice='Signaling interrupted. Reconnecting…';render()});else pendingCandidates.push(candidate)}};
  pc.onconnectionstatechange=()=>{
   if(!pc)return;notice='Connection: '+pc.connectionState;
   if(pc.connectionState==='connected'){clearTimeout(disconnectTimer);if(!started)started=Date.now()}
   if(['failed','disconnected'].includes(pc.connectionState)){clearTimeout(disconnectTimer);disconnectTimer=setTimeout(()=>end().catch(()=>{}),15000);notice='Connection interrupted; waiting up to 15 seconds to recover.'}
   render();
  };
  notice=config.relayConfigured?'Connecting…':'Connecting without TURN relay; some networks may fail.';
  await enumerate();
 }
 async function sendCandidates(){for(const candidate of pendingCandidates.splice(0))await signal('candidate',{candidate})}
 async function start(withVideo){if(pc||callId||!selectedSpace)return;room=selectedSpace.id;
  try{await peer(withVideo);const offer=await pc.createOffer();await pc.setLocalDescription(offer);const result=await signal('offer',{description:{type:offer.type,sdp:offer.sdp}});callId=result.call.id;await sendCandidates();notice='Calling…';render()}
  catch{cleanup();notice='Unable to call. Check devices, permissions, or an existing call.';render()}
 }
 let incoming=null;
 async function answer(){if(!incoming||pc)return;const offer=incoming.offer;room=selectedSpace.id;callId=incoming.id;
  try{await peer(offer.sdp.includes('m=video'));await pc.setRemoteDescription(offer);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await signal('answer',{description:{type:answer.type,sdp:answer.sdp}});await sendCandidates();render()}
  catch{await end().catch(()=>{});notice='Call could not be accepted. Check browser permissions.';render()}
 }
 async function enumerate(){devices=await navigator.mediaDevices.enumerateDevices();for(const [select,kind] of [[micSelect,'audioinput'],[cameraSelect,'videoinput']]){const value=select.value;select.replaceChildren();for(const device of devices.filter(d=>d.kind===kind)){const option=document.createElement('option');option.value=device.deviceId;option.textContent=device.label||kind;select.append(option)}if([...select.options].some(o=>o.value===value))select.value=value}}
 async function changeDevice(kind,select){if(!pc||screen)return;const stream=await navigator.mediaDevices.getUserMedia({[kind]:{deviceId:{exact:select.value}}});const track=stream.getTracks()[0];const sender=pc.getSenders().find(s=>s.track?.kind===(kind==='audio'?'audio':'video'));if(!sender){track.stop();return}await sender.replaceTrack(track);for(const old of local.getTracks().filter(t=>t.kind===track.kind)){local.removeTrack(old);old.stop()}track.enabled=track.kind==='audio'?state.mic:state.camera;local.addTrack(track);localVideo.srcObject=local}
 micSelect.onchange=()=>changeDevice('audio',micSelect).catch(()=>{notice='Unable to switch microphone';render()});cameraSelect.onchange=()=>changeDevice('video',cameraSelect).catch(()=>{notice='Unable to switch camera';render()});
 function render(){status.textContent=notice+(started?' · '+Math.floor((Date.now()-started)/1000)+' seconds':'');voice.disabled=video.disabled=!!pc||!!callId;accept.hidden=reject.hidden=!incoming||!!pc;hangup.hidden=!callId;mute.hidden=camera.hidden=share.hidden=!pc;mute.textContent=state.mic?'Mute microphone':'Unmute microphone';camera.textContent=state.camera?'Disable camera':'Enable camera';share.textContent=screen?'Stop screen sharing':'Share screen';}
 async function poll(){if(busy||!token||!selectedSpace)return;busy=true;
  try{if(room&&room!==selectedSpace.id){await end();incoming=null}room=selectedSpace.id;
   const {call:current}=await call('/spaces/'+encodeURIComponent(room)+'/call?after='+after);
   if(!current){if(callId){cleanup();notice='Call ended';}incoming=null;render();return}
   if(current.incoming&&!pc&&!current.accepted){if(incoming?.id!==current.id){notice='Incoming call';if('Notification' in window&&Notification.permission==='granted')new Notification('SyncSpace incoming call')}incoming=current;callId=current.id;render();return}
   if(!pc||current.id!==callId)return;
   if(current.answer&&!pc.remoteDescription)await pc.setRemoteDescription(current.answer);
   if(pc.remoteDescription){for(const entry of current.candidates)await pc.addIceCandidate(entry.candidate);after=current.sequence}
  }catch{notice='Signaling interrupted. Retrying…';render()}finally{busy=false}
 }
 window.syncspaceRenderCall=()=>{el('other-details').replaceChildren(root);render()};
 window.addEventListener('syncspace:logout',()=>{if(callId)signal('end').catch(()=>{});cleanup();incoming=null;room=null;});
 window.addEventListener('pagehide',cleanup);
 navigator.mediaDevices?.addEventListener('devicechange',()=>enumerate().catch(()=>{}));
 setInterval(poll,1000);setInterval(render,1000);render();
})();
