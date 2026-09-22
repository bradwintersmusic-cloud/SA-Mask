import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdapter} from './adapter-harness.mjs';
test('directory normalization preserves missing fields and sorts human-friendly codes',()=>{
 const api=createAdapter(()=>{throw Error('No network');});
 const users=api.normalizeUsers({success:true,data:{items:{one:{id:1,name:'Zed'},two:{id:2,email:'a@example.test'}}}});
 assert.equal(users.length,2);assert.equal(users[0].name,null);
 assert.deepEqual(Array.from(api.normalizeClasses({data:[{id:1,code:'AET10'},{id:2,code:'AET2'}]}),c=>c.id),[2,1]);
 assert.throws(()=>api.normalizeUsers({success:false,data:[]}));
 assert.throws(()=>api.normalizeUsers({data:[{name:'no ID'}]}));
});
test('enrollment index bounds concurrency, caches/coalesces, preserves failures, and refresh invalidates',async()=>{
 let calls=0,active=0,max=0,fail=true;
 const api=createAdapter(async url=>{
  calls++;
  if(url.pathname.endsWith('/school/7806/member'))return Response.json({data:[{id:9,name:'Test'}]});
  if(url.pathname.endsWith('/school/7806/class'))return Response.json({data:Array.from({length:7},(_,i)=>({id:i+1,name:`Class ${i+1}`}))});
  active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;
  if(url.pathname==='/api/class/3/member'&&fail)return new Response(null,{status:503});
  return Response.json({data:url.pathname==='/api/class/1/member'?[{id:9,name:'Test'}]:[]});
 });
 const [a,b]=await Promise.all([api.getUserEnrollment(9),api.getUserEnrollment(9)]);
 assert.equal(a.classes[0].state,'enrolled');assert.equal(a.classes[2].state,'unknown');assert.equal(b.failedClassIds.length,1);
 assert.equal(max,3);assert.equal(calls,9);
 await api.getClassRoster(1);await api.getUserEnrollment(9);assert.equal(calls,9);
 fail=false;api.invalidateEnrollmentCache();const fresh=await api.getUserEnrollment(9);assert.equal(fresh.failedClassIds.length,0);assert.equal(calls,18);
});
test('enrollment mutations reject before authentication or fetch; master switch alone cannot enable enrollment',async()=>{
 let calls=0;const api=createAdapter(()=>{calls++;throw Error('No network');},{},false);
 await assert.rejects(api.addClassMember(1,{id:9,email:'synthetic@example.test'}),/writes are disabled/);
 await assert.rejects(api.removeClassMember(1,9),/writes are disabled/);assert.equal(calls,0);
 const enabled=createAdapter(()=>{throw Error('No fetch');},{STUDIO_ASSISTANT_WRITES_ENABLED:'true'},false);
 await assert.rejects(enabled.removeClassMember(1,9),/writes are disabled/);
});
