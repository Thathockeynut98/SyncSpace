// SyncSpace vault v1: browser-only encryption; shared passphrase is a temporary onboarding model.
(()=>{'use strict';
const $=id=>document.getElementById(id),enc=new TextEncoder(),dec=new TextDecoder();
let vaultKey=null,activeSpace=null;
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a)));
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
async function wrappingKey(pass,salt){
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function endpoint(suffix=''){return '/spaces/'+encodeURIComponent(activeSpace)+'/vault'+suffix}
function notice(message){$('vault-status').textContent=message}
async function init(){
  vaultKey=null;activeSpace=selectedSpace?.id||null;
  $('vault-lock').hidden=true;$('vault-create').hidden=true;$('vault-content').hidden=true;
  if(!activeSpace)return;
  try{const v=await call(endpoint());$('vault-create').hidden=v.initialized;$('vault-lock').hidden=!v.initialized;notice(v.initialized?'Shared vault exists. Unlock it with its vault passphrase.':'No vault exists yet. Create a new shared vault without changing your original messages.')}
  catch(e){notice('Vault unavailable: '+e.message)}
}
$('vault-create-form').addEventListener('submit',async e=>{
  e.preventDefault();const pass=$('vault-new-pass').value,confirm=$('vault-confirm-pass').value;
  if(pass.length<14||pass!==confirm){notice('Use at least 14 characters and matching passphrases.');return}
  try{
    const salt=random(16),wrapIv=random(12),raw=random(32),wrapper=await wrappingKey(pass,salt);
    const wrapped=await crypto.subtle.encrypt({name:'AES-GCM',iv:wrapIv,additionalData:enc.encode(activeSpace)},wrapper,raw);
    await call(endpoint(),{method:'POST',body:JSON.stringify({version:1,kdfSalt:b64(salt),wrapIv:b64(wrapIv),wrappedKey:b64(wrapped)})});
    vaultKey=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
    raw.fill(0);$('vault-new-pass').value='';$('vault-confirm-pass').value='';
    $('vault-create').hidden=true;$('vault-content').hidden=false;notice('Vault created and unlocked locally. Keep the vault passphrase safe; it cannot be recovered by the server.');
    await loadItems();
  }catch(e){notice('Vault creation failed: '+e.message)}
});
$('vault-unlock-form').addEventListener('submit',async e=>{
  e.preventDefault();try{
    const data=await call(endpoint()),pass=$('vault-pass').value;
    const wrapper=await wrappingKey(pass,un64(data.kdfSalt));
    const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(data.wrapIv),additionalData:enc.encode(activeSpace)},wrapper,un64(data.wrappedKey));
    vaultKey=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
    new Uint8Array(raw).fill(0);$('vault-pass').value='';$('vault-lock').hidden=true;$('vault-content').hidden=false;
    notice('Vault unlocked in this browser session.');await loadItems();
  }catch{notice('Unable to unlock vault. Check the passphrase.')}
});
$('vault-save').addEventListener('submit',async e=>{
  e.preventDefault();if(!vaultKey)return;
  const input=$('vault-note'),text=input.value.trim();if(!text)return;
  try{
    const iv=random(12),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(activeSpace+':note:v1')},vaultKey,enc.encode(text));
    await call(endpoint('/items'),{method:'POST',body:JSON.stringify({kind:'note',iv:b64(iv),cipher:b64(cipher)})});
    input.value='';notice('Encrypted note saved.');await loadItems();
  }catch(e){notice('Save failed: '+e.message)}
});
async function loadItems(){
  if(!vaultKey)return;const data=await call(endpoint('/items')),box=$('vault-items');box.replaceChildren();
  for(const item of data.items){const p=document.createElement('p');try{
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(item.iv),additionalData:enc.encode(activeSpace+':'+item.kind+':v1')},vaultKey,un64(item.cipher));
    p.textContent=dec.decode(plain);
  }catch{p.textContent='Encrypted '+item.kind+' (cannot decrypt with this key)'}
  p.className='vault-entry';box.append(p)}
  if(!data.items.length)box.textContent='Your encrypted vault is empty. Add a private note to test it.';
}
$('vault-lock-button').addEventListener('click',()=>{vaultKey=null;$('vault-items').replaceChildren();$('vault-content').hidden=true;$('vault-lock').hidden=false;notice('Vault locked.');});
window.addEventListener('syncspace:login',init);
window.addEventListener('syncspace:logout',()=>{vaultKey=null;activeSpace=null;$('vault-items').replaceChildren();$('vault-content').hidden=true;});
})();
