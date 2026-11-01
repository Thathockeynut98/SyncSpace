import test from 'node:test';
import assert from 'node:assert/strict';
import {CallRegistry} from '../calling.js';
test('call registry expires ringing calls and isolates signaling participants',()=>{
 let now=0;const registry=new CallRegistry(()=>now);const c=registry.start('room','caller',{type:'offer',sdp:'synthetic'});
 assert.throws(()=>registry.start('room','other',{}),{status:409});
 c.candidates.push({sender:'caller',sequence:1,candidate:{candidate:'synthetic'}});c.sequence=1;
 assert.equal(registry.view(c,'caller').candidates.length,0);assert.equal(registry.view(c,'callee').candidates.length,1);
 assert.equal(registry.view(c,'callee',1).candidates.length,0);
 now=45001;assert.equal(registry.get('room'),undefined);
 assert.ok(registry.start('room','new',{}));
});
