// Chat text is scrambled in the browser before it is saved and unscrambled only
// after it is read back. The key is derived from the space's join code, which
// both members hold, so no key material ever travels with a message.

const ITERATIONS = 120000;
const cache = new Map();

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function fromBase64(value) {
  if(typeof value!=='string'||!value.length||value.length%4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('Invalid Base64 encoding');
  const bytes=Uint8Array.from(atob(value),char=>char.charCodeAt(0));
  if(toBase64(bytes)!==value)throw Error('Noncanonical Base64 encoding');
  return bytes;
}
export function clearSpaceKeys(){cache.clear()}

export async function spaceKey(space) {
  if(!space.invite_code||!space.id)throw Error('Room encryption information is missing.');
  const cacheKey = `${space.encryption_space_id||space.id}:${space.invite_code}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const encoder = new TextEncoder();
  const base = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`syncspace:${space.invite_code}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(space.encryption_space_id||space.id),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  cache.set(cacheKey, key);
  return key;
}

export async function encryptText(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  return { cipher: toBase64(encrypted), iv: toBase64(iv) };
}

export async function decryptText(key, cipher, iv) {
  if (!cipher || !iv) throw Error('Encrypted fields are missing');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(cipher)
  );
  return new TextDecoder().decode(plain);
}