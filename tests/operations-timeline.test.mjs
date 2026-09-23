import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdapter} from './adapter-harness.mjs';
const api=createAdapter(()=>{throw Error('Network forbidden');});
const day='2026-09-23';
function booking(key,start,end,facilityId=7807,roomName='Studio A') {
 return {key,start,end,facilityId,facilityName:String(facilityId),roomName,roomId:roomName};
}
const normal=(key,start,end,facility=7807)=>booking(key,`2026-09-23T${start}:00-05:00`,`2026-09-23T${end}:00-05:00`,facility);
test('shared bounds include both facilities and all days with hourly padding; no internal gaps collapse',()=>{
 const rows=[normal('a','08:00','10:00'),normal('b','17:00','20:00',7808),booking('c','2026-09-25T23:00:00-05:00','2026-09-26T01:30:00-05:00')];
 const bounds=api.calculateTimelineBounds(rows,[day,'2026-09-24','2026-09-25']);
 assert.equal(bounds.startMinutes,420);assert.equal(bounds.endMinutes,1620);
 assert.equal(bounds.durationMinutes,1200);
 const a=api.timelinePosition(480,540,bounds),b=api.timelinePosition(480,720,bounds);
 assert.equal(b.size,a.size*4);
 assert.equal(api.timelinePosition(1020,1200,bounds).offset-api.timelinePosition(600,600,bounds).offset,35);
});
test('carry-in matches Schedule overlap semantics; outgoing booking is complete and exact end is excluded',()=>{
 const rows=[booking('carry','2026-09-22T23:30:00-05:00','2026-09-23T01:30:00-05:00'),booking('out','2026-09-23T23:00:00-05:00','2026-09-24T01:30:00-05:00'),booking('end','2026-09-22T23:00:00-05:00','2026-09-23T00:00:00-05:00')];
 const intervals=api.operationalIntervals(rows,day);
 assert.deepEqual(Array.from(intervals,x=>[x.session.key,x.start,x.end]),[['carry',0,90],['out',1380,1530]]);
 const bounds=api.calculateTimelineBounds(rows,[day]);
 assert.equal(bounds.startMinutes,-60);assert.equal(bounds.endMinutes,1620);
 assert.ok(api.timelineTicks(day,bounds).some(t=>t.midnight&&t.nextDay));
});
test('minimum is six hours, empty fallback is nine to nine, malformed times stay unpositioned',()=>{
 const tiny=api.calculateTimelineBounds([normal('tiny','12:00','12:10')],[day]);
 assert.equal(tiny.durationMinutes,360);assert.ok(tiny.startMinutes<=660);assert.ok(tiny.endMinutes>=790);
 const empty=api.calculateTimelineBounds([booking('bad',null,null)],[day]);
 assert.deepEqual([empty.startMinutes,empty.endMinutes],[540,1260]);
 assert.equal(api.operationalIntervals([booking('bad',null,null)],day).length,0);
});
test('overlap lanes are deterministic, reuse adjacent lanes, and do not mutate inputs',()=>{
 const input=api.operationalIntervals([normal('a','09:00','11:00'),normal('b','10:00','12:00'),normal('c','11:00','13:00')],day);
 const result=api.assignOverlapLanes(input);
 assert.equal(result.lanes,2);assert.deepEqual(Array.from(result.blocks,b=>b.lane),[0,1,0]);
 assert.deepEqual(Array.from(input,b=>b.lane),[0,0,0]);
 assert.deepEqual(Array.from(api.assignOverlapLanes([...input].reverse()).blocks,b=>b.session.key),['a','b','c']);
});
test('spring DST preserves elapsed duration and skips nonexistent hour',()=>{
 const date='2026-03-08';
 const row=booking('spring','2026-03-08T01:30:00-06:00','2026-03-08T03:30:00-05:00');
 const [interval]=api.operationalIntervals([row],date);
 assert.equal(interval.end-interval.start,60);
 const labels=api.timelineTicks(date,api.calculateTimelineBounds([row],[date])).map(t=>t.label);
 assert.ok(labels.includes('1 AM CST'));assert.ok(labels.includes('3 AM CDT'));assert.ok(!labels.some(l=>l.startsWith('2 AM')));
});
test('fall DST repeats the hour with distinct zone labels and remains time proportional',()=>{
 const date='2026-11-01';
 const row=booking('fall','2026-11-01T01:30:00-05:00','2026-11-01T01:30:00-06:00');
 const [interval]=api.operationalIntervals([row],date);assert.equal(interval.end-interval.start,60);
 const labels=api.timelineTicks(date,api.calculateTimelineBounds([row],[date])).map(t=>t.label);
 assert.ok(labels.includes('1 AM CDT'));assert.ok(labels.includes('1 AM CST'));
});
test('studio rows are only populated and remain alphabetical across session reordering',()=>{
 const rows=[normal('a','09:00','10:00'),{...normal('z','08:00','09:00'),roomName:'Z Room',roomId:99}];
 assert.deepEqual(Array.from(api.groupStudios(rows),s=>s.name),['Studio A','Z Room']);
 assert.equal(api.groupStudios([]).length,0);
});
test('empty DST dates still start at 9 AM, and long bookings label later days accurately',()=>{
 for(const date of ['2026-03-08','2026-11-01']) {
  const ticks=api.timelineTicks(date,api.calculateTimelineBounds([],[date]));
  assert.match(ticks[0].label,/9 AM/);assert.match(ticks.at(-1).label,/9 PM/);
 }
 const long=booking('long','2026-09-23T22:00:00-05:00','2026-09-25T02:00:00-05:00');
 const ticks=api.timelineTicks(day,api.calculateTimelineBounds([long],[day]));
 assert.equal(ticks.at(-1).dayOffset,2);
});
