import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url), modules=new Map();
function load(file){
 const absolute=path.resolve(file);if(modules.has(absolute))return modules.get(absolute);
 const exports={};modules.set(absolute,exports);
 const output=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(output,{exports,URLSearchParams,require:(name)=>{
  if(name==='next/navigation')return {usePathname:()=>'/requests',useRouter:()=>({refresh:()=>{throw Error('No request');}})};
  if(name==='next/link')return {default:({children,prefetch,...props})=>{void prefetch;return React.createElement('a',props,children);}};
  if(name.endsWith('.css'))return {default:new Proxy({},{get:(_,key)=>key})};
  if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);
  const base=name.startsWith('@/')?path.join('src',name.slice(2)):path.resolve(path.dirname(absolute),name);
  return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts');
 }});return exports;
}

const {RequestList}=load('src/app/requests/RequestList.tsx');
test('quick actions expose labels, isolate pending rows and display safe errors',()=>{
 const rows=[1,2].map(id=>({id,facilityId:7807,facilityName:'Test facility',requesterName:'Synthetic request',roomName:'Test room',start:null,end:null}));
 const html=renderToStaticMarkup(React.createElement(RequestList,{requests:rows,selected:new Set(),disabled:false,actionsDisabled:false,pending:new Set(['7807:1']),errors:{'7807:2':'Update failed. Refresh before retrying.'},onToggle:()=>{},onAction:()=>{throw Error('No actions in render test');}}));
 const buttons=html.match(/<button[^>]*>/g);
 assert.ok(buttons.filter(button=>button.includes('request #1')).every(button=>button.includes('disabled')));
 assert.ok(buttons.filter(button=>button.includes('request #2')).every(button=>!button.includes('disabled')));
 assert.match(html,/role="status">Updating/);
 assert.match(html,/role="alert">Update failed/);
 assert.match(html,/aria-label="Approve request #2"/);
 assert.match(html,/aria-label="Deny request #2"/);
});
const {SessionDetailsModal}=load('src/app/calendar/SessionDetailsModal.tsx');
test('session modal omits status/type fields without changing model and formats duration',()=>{
 const session={id:1,facilityId:7807,facilityName:'Test facility',start:'2026-09-21T15:00:00Z',end:'2026-09-21T16:15:00Z',sessionType:'INTERNAL',bookingType:'GROUP',status:'PENDING'};
 const html=renderToStaticMarkup(React.createElement(SessionDetailsModal,{session,onClose:()=>{}}));
 assert.match(html,/1 hr 15 min/);
 assert.doesNotMatch(html,/<dt>(Session type|Booking type|Status)<\/dt>/);
 assert.equal(session.status,'PENDING');
});

const {Navigation}=load('src/components/layout/Navigation.tsx');
const {RequestsProvider}=load('src/components/requests/RequestsProvider.tsx');
const {mergeRequestsSnapshot}=load('src/lib/studio-assistant/request-snapshot.ts');
test('both navigation views show the aggregate count, cap the badge and label the full count',()=>{
 for(const mobile of [false,true]) for(const count of [0,1,3,99,100,1234]) {
  const snapshot={requests:Array.from({length:count},(_,id)=>({id,facilityId:id%2?7807:7808})),issues:[],loadedAt:'2026-10-02T12:00:00Z'};
  const html=renderToStaticMarkup(React.createElement(RequestsProvider,{initialSnapshot:snapshot},React.createElement(Navigation,{mobile})));
  if(count===0) {assert.doesNotMatch(html,/requestBadge/);assert.doesNotMatch(html,/pending request/);}
  else {
   assert.match(html,new RegExp(`aria-label="Requests, ${count} pending ${count===1?'request':'requests'}"`));
   assert.ok(html.includes(`class="requestBadge" aria-hidden="true">${count>99?'99+':count}</span>`));
  }
 }
});
test('shared snapshot reconciles refreshes and mutation results without losing failed facilities',()=>{
 const original={requests:[{id:1,facilityId:7807},{id:2,facilityId:7808}],issues:[],loadedAt:'2026-10-02T12:00:00Z'};
 const refreshed={requests:[{id:2,facilityId:7808}],issues:[],loadedAt:'2026-10-02T12:01:00Z'};
 assert.equal(mergeRequestsSnapshot(original,refreshed).requests.length,1);
 assert.equal(mergeRequestsSnapshot(refreshed,original),refreshed);
 const failed={requests:[],issues:[{facilityId:7808}],loadedAt:'2026-10-02T12:02:00Z'};
 const retained=mergeRequestsSnapshot(refreshed,failed);
 assert.equal(retained.requests.length,1);
 assert.equal(retained.requests[0].id,2);
 assert.equal(mergeRequestsSnapshot(retained,{requests:[],issues:[],loadedAt:'2026-10-02T12:03:00Z'}).requests.length,0);
});
