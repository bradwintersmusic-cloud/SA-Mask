import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdapter} from './adapter-harness.mjs';
const api=()=>createAdapter(()=>{throw Error('No network');});
test('Calendar query validation accepts known filters and rejects invalid/mismatched rooms',()=>{
 const a=api();const snapshot={date:'2026-09-19',...a.centralDayRange('2026-09-19'),sessions:[{facilityId:7807,roomId:10475,start:'2026-09-19T15:00:00Z',end:'2026-09-19T16:00:00Z'}]};
 assert.equal(a.calendarQueryDate({date:'2026-09-24'}),'2026-09-24');
 for(const date of ['bad','2026-02-30','0000-01-01','9999-12-31',['2026-09-24']])assert.equal(a.calendarQueryDate({date},'2026-09-19'),'2026-09-19');
 assert.equal(a.calendarQueryFilters({facility:'34mse',room:'10475'},snapshot).studio,'7807:10475');
 assert.equal(a.calendarQueryFilters({facility:'rem',room:'10475'},snapshot).studio,'all');
 assert.equal(a.calendarQueryFilters({facility:'invalid',room:'999'},snapshot).facility,'all');
 assert.equal(a.calendarLink('2026-09-19',7807,10475),'/calendar?date=2026-09-19&facility=34mse&room=10475');
});
test('Today activity counts day overlaps and keeps facility/studio totals consistent',()=>{
 const a=api();const range=a.centralDayRange('2026-09-19');
 const base={facilityId:7807,facilityName:'34MSE',roomId:10475,roomName:'Studio',start:'2026-09-19T15:00:00Z',end:'2026-09-19T16:00:00Z'};
 const data=a.todayActivity({...range,sessions:[base,{...base,start:'2026-09-19T04:00:00Z',end:'2026-09-19T06:00:00Z'},{...base,start:'2026-09-20T05:00:00Z',end:'2026-09-20T06:00:00Z'},{...base,roomId:null,roomName:null,start:null,end:null}]});
 assert.equal(data.sessions.length,3);assert.equal(data.studioCount,1);assert.equal(data.uncertainCount,1);assert.equal(data.rooms.reduce((n,r)=>n+r.sessions.length,0),3);
 assert.equal(a.todayActivity(null).sessions.length,0);
});
