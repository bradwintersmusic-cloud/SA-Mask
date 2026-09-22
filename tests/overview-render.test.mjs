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
const {TodayModule}=load('src/app/TodayModule.tsx');
const today='2026-09-19';
const calendar={date:today,start:'2026-09-19T05:00:00Z',end:'2026-09-20T05:00:00Z',sessions:[],issues:[]};
const requests={requests:[],issues:[],loadedAt:''};
const render=(props)=>renderToStaticMarkup(React.createElement(TodayModule,{today,calendar,requests,...props}));
test('Overview renders honest empty and independent failure states without losing navigation',()=>{
 const empty=render({});assert.match(empty,/No Internal Requests/);assert.match(empty,/No sessions today/);assert.match(empty,/aria-current="date"/);
 const requestFailure=render({requests:null});assert.match(requestFailure,/Requests unavailable/);assert.match(requestFailure,/Studio activity/);assert.doesNotMatch(requestFailure,/No Internal Requests/);
 const sessionFailure=render({calendar:null});assert.match(sessionFailure,/Session activity unavailable/);assert.match(sessionFailure,/No Internal Requests/);assert.match(sessionFailure,/Open schedule for 2026-09-24/);
});
test('Overview retains future requests and labels partial facility results',()=>{
 const html=render({calendar:{...calendar,issues:[{facilityId:7808,facilityName:'REM'}]},requests:{...requests,requests:[{id:1,facilityId:7807,requesterName:'Synthetic request',roomName:'Synthetic room',facilityName:'34MSE',start:'2026-10-01T15:00:00Z'}]}});
 assert.match(html,/Synthetic request/);assert.match(html,/Oct 1, 2026/);assert.match(html,/Partial or unavailable activity/);assert.match(html,/href="\/requests"/);
});
