// Legacy format: PBKDF2-SHA256, 120000 rounds, UTF-8 salt = space ID.
// Decode standard Base64 only. Other formats need evidence from the original export.
export function decodeBase64(value) {
  if (typeof value !== 'string' || !value.length || value.length % 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Invalid Base64');
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  if (encodeBase64(bytes) !== value) throw new Error('Noncanonical Base64');
  return bytes;
}
export function encodeBase64(bytes) { return btoa(Array.from(bytes, b=>String.fromCharCode(b)).join('')); }
export async function deriveKey(spaceId, code) {
  const encoder=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',encoder.encode('syncspace:'+code),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:encoder.encode(spaceId),iterations:120000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptMessage(key,text) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text));
  return {iv:encodeBase64(iv),cipher:encodeBase64(new Uint8Array(cipher))};
}
export async function decryptMessage(key,message) {
  const iv=decodeBase64(message.iv),cipher=decodeBase64(message.cipher);
  if(iv.length!==12 || cipher.length<17) throw new Error('Invalid encrypted envelope');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
  return new TextDecoder('utf-8',{fatal:true}).decode(plain);
}
