import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdapter} from './adapter-harness.mjs';
const api=createAdapter(()=>{throw Error('No network allowed');});
test('roster roles use confirmed numeric permissions and sort unknown last',()=>{
 const roster=api.normalizeClassMembers([{id:1,name:'Zed',prm:0},{id:2,name:'Teacher Z',prm:1},{id:3,name:'Admin',prm:2},{id:4,name:'Alpha',prm:0},{id:5,name:'Unknown',prm:9},{id:6,name:'Teacher A',prm:1},{id:7,name:'Missing'}]);
 assert.deepEqual(Array.from(roster,m=>m.id),[3,6,2,4,1,7,5]);
 assert.deepEqual(Array.from(roster.filter(m=>m.role==='student'),m=>m.id),[4,1]);
 assert.equal(roster.find(m=>m.id===7).role,'unknown');
});
test('only service 29 marks Classes, not course names or artist relationships',()=>{
 const rows=api.normalizeCalendar({data:{items:[{id:1,service:29},{id:2,service:{id:29}},{id:3,service:10,artist:8796,stamp:{artist:'Class 101'}},{id:4,service:null}]}},{studioAssistantId:7807,name:'34MSE'});
 assert.deepEqual(Array.from(rows,s=>s.isClass),[true,true,false,false]);
});
test('Hide Classes composes with all filters and text cannot override it',()=>{
 const common={facilityId:7807,roomId:5,userId:10,start:'2026-09-21T15:00:00Z',end:'2026-09-21T16:00:00Z',projectName:'Recording'};
 const rows=[{...common,key:'class',isClass:true},{...common,key:'booking',isClass:false},{...common,key:'other',facilityId:7808}];
 const filter={...api.centralDateRange('2026-09-21','2026-09-21'),facility:'7807',studio:'7807:5',user:{id:10},query:'record',uniqueUserEmail:false,hideClasses:true};
 assert.deepEqual(Array.from(api.filterSessions(rows,filter),s=>s.key),['booking']);
 assert.equal(api.filterSessions(rows,{...filter,hideClasses:false}).length,2);
});
test('enrollment permission is independent; deletion remains blocked without any network',()=>{
 const enabled=createAdapter(()=>{throw Error('No network allowed');},{STUDIO_ASSISTANT_WRITES_ENABLED:'true',STUDIO_ASSISTANT_ENROLLMENT_WRITES_ENABLED:'true',STUDIO_ASSISTANT_INTERNAL_REQUEST_WRITES_ENABLED:'true',STUDIO_ASSISTANT_SESSION_DELETE_ENABLED:'false'},false);
 assert.equal(enabled.enrollmentWritesEnabled(),true); enabled.assertEnrollmentWritesEnabled();
 assert.throws(()=>enabled.assertSessionDeleteEnabled());
 enabled.assertMutationAllowed('/api/class/8796/member/3778','DELETE');
 assert.throws(()=>enabled.assertMutationAllowed('/api/class/8796/member/3778','DELETE',{}));
});
