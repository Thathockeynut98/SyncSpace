import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveKey,encryptMessage,decryptMessage,decodeBase64} from '../../preview/message-crypto.mjs';
import {validPayload} from '../messaging.js';
import {pbkdf2Sync,createCipheriv} from 'node:crypto';
test('legacy-compatible encryption, round trip, wrong keys and tampering',async()=>{
 const key=await deriveKey('synthetic-room','synthetic-code');
 const legacyKey=pbkdf2Sync('syncspace:synthetic-code','synthetic-room',120000,32,'sha256');
 const iv=Buffer.alloc(12,7),aes=createCipheriv('aes-256-gcm',legacyKey,iv);
 const cipher=Buffer.concat([aes.update('synthetic fixture 🟣','utf8'),aes.final(),aes.getAuthTag()]);
 assert.equal(await decryptMessage(key,{iv:iv.toString('base64'),cipher:cipher.toString('base64')}),'synthetic fixture 🟣');
 const envelope=await encryptMessage(key,'round trip');assert.equal(await decryptMessage(key,envelope),'round trip');
 assert.equal(validPayload(envelope),true);assert.equal(validPayload({...envelope,iv:'AAAA'}),false);
 assert.equal(validPayload({...envelope,clientId:'invalid'}),false);
 await assert.rejects(decryptMessage(await deriveKey('synthetic-room','wrong'),envelope));
 const changed=Buffer.from(envelope.cipher,'base64');changed[0]^=1;
 await assert.rejects(decryptMessage(key,{...envelope,cipher:changed.toString('base64')}));
});
test('invalid or ambiguous encoding is rejected without changing records',()=>{
 for(const value of [null,'','!!!!','SGVsbG8','SGVsbG8_',' SGVsbG8=','Zh=='])assert.throws(()=>decodeBase64(value));
 assert.deepEqual([...decodeBase64('Zg==')],[102]);
});
