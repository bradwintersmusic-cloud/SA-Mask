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
  if(name==='next/navigation')return {useRouter:()=>({refresh:()=>{throw Error('No request');}})};
  if(name==='next/link')return {default:({children,prefetch,...props})=>{void prefetch;return React.createElement('a',props,children);}};
  if(name.endsWith('.css'))return {default:new Proxy({},{get:(_,key)=>key})};
  if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);
  const base=name.startsWith('@/')?path.join('src',name.slice(2)):path.resolve(path.dirname(absolute),name);
  return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts');
 }});return exports;
}
const {TimelineDay}=load('src/app/calendar/TimelineDay.tsx');
const {TimelineView}=load('src/app/calendar/TimelineView.tsx');
const date='2026-09-23';
const snapshot={date,start:'2026-09-23T05:00:00Z',end:'2026-09-24T05:00:00Z',sessions:[],issues:[]};
const renderView=(initialSnapshot)=>renderToStaticMarkup(React.createElement(TimelineView,{initialSnapshot,initialDate:date,initialFacility:'7807',onView:()=>{}}));
test('Timeline renders empty and unavailable facilities distinctly without inventing studios',()=>{
 const empty=renderView(snapshot);assert.match(empty,/No bookings for this period/);assert.doesNotMatch(empty,/Operational day/);
 const failed=renderView({...snapshot,issues:[{facilityId:7807,facilityName:'34MSE',message:'Unavailable'}]});
 assert.match(failed,/Timeline unavailable or incomplete/);assert.doesNotMatch(failed,/No bookings for this period/);
 assert.match(failed,/Shared bounds use available data/);
});
test('Timeline renders proportional overlapping Class blocks, Now, and short-booking touch alternative',()=>{
 const base={facilityId:7807,facilityName:'34MSE',roomId:1,roomName:'Synthetic Studio',contactName:'Synthetic user',isClass:true};
 const sessions=[{...base,key:'long',label:'Long class',start:'2026-09-23T15:00:00Z',end:'2026-09-23T19:00:00Z'}, {...base,key:'short',label:'Short class',start:'2026-09-23T16:00:00Z',end:'2026-09-23T16:15:00Z'}];
 const html=renderToStaticMarkup(React.createElement(TimelineDay,{date,sessions,bounds:{startMinutes:540,endMinutes:900,durationMinutes:360},now:Date.parse('2026-09-23T16:05:00Z'),onSelect:()=>{}}));
 assert.match(html,/2 overlap lanes/);assert.match(html,/--lanes:2/);assert.match(html,/data-class="true"/);assert.match(html,/data-live="true"/);assert.match(html,/>Now</);assert.match(html,/Short bookings/);assert.match(html,/Open details/);
 assert.match(html,/--size:66\.666/);assert.match(html,/--size:4\.166/);
});
test('out-of-period source records do not inflate summary or create rows; invalid times stay inspectable',()=>{
 const outside={key:'outside',label:'Outside',facilityId:7807,start:'2026-10-01T15:00:00Z',end:'2026-10-01T16:00:00Z'};
 const html=renderView({...snapshot,sessions:[outside,{key:'invalid',label:'Unknown time',facilityId:7807,start:null,end:null}]});
 assert.match(html,/0 bookings/);assert.match(html,/Schedule needs review/);assert.match(html,/Unknown time/);assert.doesNotMatch(html,/Outside/);
});
