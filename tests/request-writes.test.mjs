import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdapter} from './adapter-harness.mjs';
const enabled={STUDIOASSISTANT_API_TOKEN:'synthetic-only',STUDIO_ASSISTANT_WRITES_ENABLED:'true',STUDIO_ASSISTANT_INTERNAL_REQUEST_WRITES_ENABLED:'true'};
test('master AND exact feature flag are required, other capabilities remain blocked before network',async()=>{
 for(const master of [undefined,'false','true']) for(const feature of [undefined,'false','TRUE','1','true ' ,'true']) {
  let calls=0;
  const api=createAdapter(()=>{calls++;throw Error('Network forbidden');},{...enabled,STUDIO_ASSISTANT_WRITES_ENABLED:master,STUDIO_ASSISTANT_INTERNAL_REQUEST_WRITES_ENABLED:feature},false);
  assert.equal(api.internalRequestWritesEnabled(),master==='true'&&feature==='true');
  if(master!=='true'||feature!=='true') await assert.rejects(api.processInternalRequests('approve',[{id:1,facilityId:7807}]));
  assert.throws(()=>api.assertSessionDeleteEnabled());
  assert.throws(()=>api.assertEnrollmentWritesEnabled());
  assert.equal(calls,0);
 }
 const api=createAdapter(()=>{throw Error('Network forbidden');},enabled,false);
 await assert.rejects(api.studioAssistantMutation('/api/unknown',{method:'POST'}),/not enabled/);
 await assert.rejects(api.studioAssistantMutation('/api/functions/confirm-internal-session/1',{method:'POST',body:{}}),/not enabled/);
});
test('mocked approve/deny use exact endpoints, no body, real-response validation and no POST retry',async()=>{
 const calls=[];
 const api=createAdapter(async(url,options)=>{
  calls.push({path:url.pathname,method:options.method,body:options.body});
  if(url.pathname.endsWith('/3')) return new Response(null,{status:401});
  if(url.pathname.endsWith('/4')) return Response.json({success:false,type:'CONFIRMED'});
  return Response.json({success:true,type:url.pathname.includes('confirm-')?'CONFIRMED':'DECLINED'});
 },enabled);
 await api.approveInternalRequest(1); await api.denyInternalRequest(2);
 await assert.rejects(api.approveInternalRequest(3)); await assert.rejects(api.approveInternalRequest(4));
 assert.equal(calls.length,4);
 assert.equal(calls[0].path,'/api/functions/confirm-internal-session/1');
 assert.equal(calls[1].path,'/api/functions/decline-internal-session/2');
 assert.ok(calls.every(call=>call.method==='POST'&&call.body===undefined));
});
test('mocked batches bound concurrency, retain failures, deduplicate and refresh queue',async()=>{
 const pending=new Set([1,2,3,4,5,6,7]);let active=0,max=0,posts=0,reads=0;
 const api=createAdapter(async(url,options)=>{
  if(options.method==='GET') {reads++;return Response.json(url.pathname.includes('/7807/')?[...pending].map(id=>({id})):[]);}
  posts++;active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,3));active--;
  const id=Number(url.pathname.split('/').at(-1));
  if(id===4)return new Response(null,{status:503});
  pending.delete(id);return Response.json({success:true,type:'CONFIRMED'});
 },enabled);
 const result=await api.processInternalRequests('approve',[...[1,2,3,4,5,6,7,7,99].map(id=>({id,facilityId:7807}))]);
 assert.equal(max,3);assert.equal(posts,7);assert.equal(reads,4);
 assert.equal(result.results.filter(row=>row.success).length,6);
 assert.equal(result.results.filter(row=>!row.success).length,2);
 assert.deepEqual(Array.from(result.snapshot.requests,row=>row.id),[4]);
});
test('human duration formatting covers minutes, hours and remainders',()=>{
 const api=createAdapter(()=>{throw Error('No network');});
 for(const [minutes,text] of [[30,'30 min'],[45,'45 min'],[60,'1 hr'],[75,'1 hr 15 min'],[90,'1 hr 30 min'],[120,'2 hrs'],[135,'2 hrs 15 min']])assert.equal(api.formatDuration(minutes),text);
});
