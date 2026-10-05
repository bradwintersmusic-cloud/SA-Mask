import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdapter } from './adapter-harness.mjs';
const api = () => createAdapter(() => { throw Error('No network'); });
const envelope = items => ({ data: { items, total: items.length, start: null, end: null } });
const share = (id, content, overrides = {}) => ({ id, org: 7808, ctype: 'p', content, room: [10481,10484], ...overrides });
const facility = { studioAssistantId: 7808, name: 'REM' };
test('academic joins use IDs, handle multi-share/multi-room, and classify without calendar data', () => {
 const a=api(); const classes=a.normalizeAcademicClasses(envelope([{id:10,name:'Class'}])).items;
 const projects=a.normalizeAcademicProjects(envelope([{id:1,artist:10,name:'Any name'},{id:2,artist:10},{id:3,artist:999}])).items;
 const shares=a.normalizeAcademicShares(envelope([share('a',1),share('b',1),share('c',2,{ctype:'u'})]),facility).items;
 const derived=a.deriveProjectTypes(projects,shares,true);
 assert.deepEqual(Array.from(derived,p=>p.type),['drag-and-drop','claimable','claimable']);
 assert.deepEqual(Array.from(a.deriveProjectTypes(projects,shares,false),p=>p.type),['drag-and-drop','unknown','unknown']);
 const m=a.createAcademicModel({classes,projects:derived,shares});
 assert.equal(m.getProjectsForClass(10).length,2); assert.equal(m.getSharesForProject(1).length,2); assert.equal(m.getSharesForClass(10).length,2);
 assert.deepEqual(Array.from(m.getRoomsForShare('a')),['Edit Bay B11','Edit Bay B12']); assert.equal(m.getClassForProject(derived[2]),undefined);
});
test('completeness never uses start/end as counts and rejects malformed records',()=>{
 const a=api();
 assert.equal(a.academicCollection({data:{items:{one:{id:7172},two:{id:7374}},total:127,start:7172,end:7374}}).complete,false);
 assert.equal(a.academicCollection({data:{items:{one:{id:7172},total:1,start:7172,end:7172},total:1}}).rows.length,1);
 assert.equal(a.academicCollection({data:[]}).complete,false);
 assert.equal(a.academicCollection(envelope([])).complete,true);
 assert.equal(a.academicCollection(envelope([{id:1},{id:1}])).complete,false);
 assert.throws(()=>a.academicCollection({success:false,data:[]}));
 assert.throws(()=>a.academicCollection(envelope([null])));
 assert.throws(()=>a.normalizeAcademicShares(envelope([share('x',1,{org:7807})]),facility));
});
test('Share availability keeps unknown flags honest and formats clocks',()=>{
 const a=api();const s=a.normalizeAcademicShares(envelope([share('a',1,{days:{monday:1,tuesday:0},hours:{monday:{start:'13:00',end:'22:00'}},use_custom_hours:1,auto_book:0,min_sess:1,max_sess:2})]),facility).items[0];
 assert.equal(s.customHours,true);assert.equal(s.autoBook,false);assert.equal(s.minSessionHours,1);assert.equal(s.maxSessionHours,2);
 assert.equal(s.availability[1].available,false);assert.equal(s.availability[2].available,null);
 assert.equal(a.friendlyClock(s.availability[0].start),'1:00 PM');assert.equal(a.friendlyClock('00:00'),'12:00 AM');assert.equal(a.friendlyClock('25:00'),'Time unavailable');
});
test('aggregate GET reads isolate failed or truncated facilities and preserve known relationships',async()=>{
 const paths=[];
 const a=createAdapter(async(url,options)=>{paths.push(url.pathname);assert.equal(options.method,'GET');
 if(url.pathname.endsWith('/class'))return Response.json(envelope([{id:10,name:'Class'}]));
 if(url.pathname.endsWith('/project'))return Response.json(envelope([{id:1,artist:10},{id:2,artist:10}]));
 if(url.pathname.includes('/7807/'))return new Response(null,{status:503});
 return Response.json(envelope([share('x',1)]));});
 const data=await a.getAcademics();assert.equal(paths.length,5);assert.equal(data.sharesComplete,false);assert.equal(data.classesComplete,true);
 assert.deepEqual(Array.from(data.projects,p=>p.type),['drag-and-drop','unknown']);assert.match(data.issues.join(' '),/34MSE Shares could not be loaded/);
});
test('facility Project reads deduplicate IDs and join Shares across facilities',async()=>{
 const paths=[];
 const a=createAdapter(async(url,options)=>{
  paths.push(url.pathname);assert.equal(options.method,'GET');
  if(url.pathname.endsWith('/class'))return Response.json(envelope([{id:10,name:'Class'}]));
  if(url.pathname.endsWith('/project'))return Response.json(envelope([{id:1,artist:10},{id:2,artist:10}]));
  const org=url.pathname.includes('/7807/')?7807:7808;
  return Response.json(envelope([share(`${org}_p_1`,1,{org})]));
 });
 const data=await a.getAcademics();
 assert.deepEqual(paths.sort(),['/api/school/7806/class','/api/studio/7807/project','/api/studio/7807/share','/api/studio/7808/project','/api/studio/7808/share']);
 assert.equal(data.projects.length,2);assert.equal(data.projectsComplete,true);assert.equal(data.issues.length,0);
 assert.equal(data.projects[0].shareIds.length,2);assert.equal(data.projects[1].type,'claimable');
 const model=a.createAcademicModel(data);assert.equal(model.getProjectsForClass(10).length,2);assert.equal(model.getSharesForClass(10).length,2);
});
test('failed and truncated Project facilities retain successful records but mark counts incomplete',async()=>{
 for(const failure of ['failed','truncated']) {
  const a=createAdapter(async url=>{
   if(url.pathname.endsWith('/class'))return Response.json(envelope([{id:10}]));
   if(url.pathname==='/api/studio/7807/project')return failure==='failed'?new Response(null,{status:503}):Response.json({data:{items:[],total:5}});
   if(url.pathname.endsWith('/project'))return Response.json(envelope([{id:1,artist:10}]));
   return Response.json(envelope([]));
  });
  const data=await a.getAcademics();assert.equal(data.projects.length,1);assert.equal(data.projectsComplete,false);assert.equal(data.projects[0].type,'claimable');assert.match(data.issues.join(' '),/34MSE Projects/);
 }
});
test('duplicate Project IDs with conflicting Class references never guess a Class',async()=>{
 const a=createAdapter(async url=>{
  if(url.pathname.endsWith('/class'))return Response.json(envelope([{id:10},{id:11}]));
  if(url.pathname.endsWith('/project'))return Response.json(envelope([{id:1,artist:url.pathname.includes('/7807/')?10:11}]));
  return Response.json(envelope([]));
 });
 const data=await a.getAcademics();assert.equal(data.projects.length,1);assert.equal(data.projects[0].classId,null);assert.equal(data.projectsComplete,false);assert.match(data.issues.join(' '),/conflicting Class references/);
});
