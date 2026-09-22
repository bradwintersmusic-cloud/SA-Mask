import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createAdapter } from './adapter-harness.mjs';
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/email/class-email.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,encodeURIComponent,Set});
test('class mailto deduplicates, excludes missing/malformed addresses, and encodes BCC/subject safely',()=>{
 const result=exports.classEmail({id:1,name:'Audio & Mixing #1?\nClass'},[{email:' Student+tag@example.test '},{email:'student+TAG@EXAMPLE.test'},{email:null},{email:''},{email:'bad'},{email:'x@example.test?subject=oops'},{email:'x@example.test\r\nBcc:bad@test.test'},{email:'second@example.test'}]);
 const url=new URL(result.mailto);
 assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'');
 assert.equal(url.searchParams.get('bcc'),'Student+tag@example.test,second@example.test');
 assert.equal(url.searchParams.get('subject'),'Audio & Mixing #1? Class');assert.equal(url.searchParams.has('to'),false);assert.equal(url.searchParams.has('body'),false);assert.equal(result.recipients.length,2);
});
test('empty and long lists retain accurate counts without truncation',()=>{
 assert.equal(exports.classEmail({id:1,code:'AET1'},[]).recipients.length,0);
 const result=exports.classEmail({id:1,name:'Class'},Array.from({length:200},(_,i)=>({email:`student${i}@example.test`})));
 assert.equal(result.recipients.length,200);assert.equal(result.unusuallyLong,true);
});
test('remove all refuses before any fetch when its capability is disabled',async()=>{
 for(const value of ['false','true']) {
 let calls=0;const api=createAdapter(()=>{calls++;throw Error('No fetch');},{STUDIO_ASSISTANT_WRITES_ENABLED:value},false);
 await assert.rejects(api.removeAllClassMembers(1),value==='true'?/writes are disabled/:/writes are disabled/);assert.equal(calls,0);
 }
});
