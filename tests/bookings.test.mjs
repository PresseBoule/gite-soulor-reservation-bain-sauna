import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {transform} from 'esbuild';
import {Hono} from 'hono';
import * as rules from '../src/lib/bookingRules.mjs';
const source=fs.readFileSync(new URL('../src/supabase/functions/server/bookings.ts',import.meta.url),'utf8').replace(/^import .*?;\r?\n/gm,'').replace('export function','function');
const code=(await transform(source+'\nglobalThis.register=registerBookings;', {loader:'ts',format:'iife'})).code;
function fixture({rows=[],count=rows.length,failure=false,conflict=false}={}) {
  const calls=[];
  const query={select(){return query;},like(){return query;},order(){return query;},range:async(start,end)=>({data:rows.slice(start,end+1).map(value=>({value})),count,error:failure?Error('offline'):null})};
  const db={from:()=>query,rpc:async(name,args)=>{calls.push({name,args});return {data:{success:!conflict},error:failure?Error('offline'):null};}};
  const app=new Hono();const ctx=vm.createContext({...rules,crypto:globalThis.crypto,Date,Number,JSON,Set,Error});vm.runInContext(code,ctx);ctx.register(app,()=>db);
  const request=async(path='/bookings',body)=>{const r=await app.request('http://localhost/make-server-2b20b999'+path,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
  return {request,calls};
}
const slot={id:'old-client-id',date:'2027-02-06',hour:12,clientName:'Client privé',clientEmail:'private@example.test'};
test('public calendar exposes active occupancy only, never personal details',async()=>{
  const h=fixture({rows:[slot,{...slot,hour:13,status:'cancelled'},{...slot,hour:14,status:'rejected'}]});
  const result=await h.request();assert.equal(result.status,200);assert.deepEqual(result.data,{bookings:[{date:slot.date,hour:12}]});assert.doesNotMatch(JSON.stringify(result),/private|privé|old-client/);
});
test('a partial or malformed calendar is unavailable rather than apparently free',async()=>{
  for(const options of [{rows:[slot],count:2},{failure:true},{rows:[{...slot,date:'2027-02-30'}]},{rows:[{...slot,hour:5}]}])assert.equal((await fixture(options).request()).status,503);
});
test('multi-hour booking invokes one atomic transaction and rejects duplicate or invalid slots',async()=>{
  const h=fixture();const body={...slot,slots:[11,12]};
  assert.equal((await h.request('/bookings/batch',body)).status,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'soulor_create_wellness_group');assert.equal(h.calls[0].args.p_bookings.length,2);
  assert.notEqual(h.calls[0].args.p_bookings[0].id,slot.id);
  for(const slots of [[11,11],[],[2],['12']])assert.equal((await h.request('/bookings/batch',{...body,slots})).status,400);
  assert.equal((await h.request('/bookings/batch',{...body,date:'2000-01-01'})).status,400);
  assert.equal(h.calls.length,1);
});
test('conflicts and storage errors cannot report a successful booking; legacy clients cannot choose stored keys',async()=>{
  assert.equal((await fixture({conflict:true}).request('/bookings/batch',{...slot,slots:[12]})).status,409);
  assert.equal((await fixture({failure:true}).request('/bookings',slot)).status,503);
  const h=fixture();assert.equal((await h.request('/bookings',slot)).status,200);assert.notEqual(h.calls[0].args.p_bookings[0].id,slot.id);
});

test('the live two-hour limit is preserved across midnight; civil dates never shift to UTC',async()=>{
 const h=fixture();
 for(const slots of [[10,11,12],[23,0,1]])assert.equal((await h.request('/bookings/batch',{...slot,slots})).status,400);
 for(const slots of [[23,0],[10,11,13,14]])assert.equal((await h.request('/bookings/batch',{...slot,slots})).status,200);
 assert.equal(rules.localDateKey(new Date(2027,0,1,0,0,0)),'2027-01-01');
 assert.equal(rules.localDateKey(new Date(2027,2,28,0,0,0)),'2027-03-28');
});
