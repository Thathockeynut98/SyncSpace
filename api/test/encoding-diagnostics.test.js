import test from 'node:test';
import assert from 'node:assert/strict';
import {encodingShape} from '../encoding-diagnostics.js';
test('encoding diagnostics return categories and lengths without contents',()=>{
 const value='not a private payload!';const result=encodingShape(value);
 assert.equal(result.category,'contains-whitespace-unverified');assert.equal(result.length,value.length);assert.ok(!JSON.stringify(result).includes(value));
 assert.equal(encodingShape(Buffer.alloc(12).toString('base64'),12).category,'standard-base64');
 assert.equal(encodingShape('Zh==').category,'noncanonical-base64');
 assert.equal(encodingShape('_w==').category,'base64url-shape-unverified');
 assert.equal(encodingShape('"Zg=="').category,'quoted-string-shape-unverified');
});
