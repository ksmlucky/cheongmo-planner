import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, candidateInfo, pairKey, groupSummary, demoData, emptyData, validateData, saveOrigin, removeOrigin } from '../dist/logic.js';
const p = (id,decision='invite') => ({id,name:id,circles:['학교'],decision,note:''});
function graph(){return {...emptyData(),people:[p('a'),p('b'),p('c'),p('d')],relations:{[pairKey('a','b')]:'know',[pairKey('b','c')]:'know'}};}
test('recommendations grow from confirmed acquaintances, not shared circles',()=>{
  const s=graph();assert.deepEqual(recommend(s,'a',4),['a','b','c']);
  assert.equal(groupSummary(s,['a','b','c']).isolated.length,0);
  assert.deepEqual(candidateInfo(s,'d',['a']).circles,['학교']);
});
test('a separation rule prevents a guest from joining despite another connection',()=>{
  const s=graph();s.relations[pairKey('a','c')]='avoid';assert.deepEqual(recommend(s,'a',4),['a','b']);
  assert.deepEqual(groupSummary(s,['a','b','c']).conflicts,[['a','c']]);
});
test('skip, maybe and already assigned guests are excluded unless the relevant option allows them',()=>{
  const s=graph();s.people[1].decision='maybe';assert.deepEqual(recommend(s,'a',4),['a']);
  assert.deepEqual(recommend(s,'a',4,{includeMaybe:true}),['a','b','c']);
  s.people[1].decision='invite';s.meetings=[{members:['b']}];assert.deepEqual(recommend(s,'a',4),['a']);
  assert.deepEqual(recommend(s,'a',4,{includeAssigned:true}),['a','b','c']);
  s.people[1].decision='skip';assert.deepEqual(recommend(s,'a',4,{includeMaybe:true,includeAssigned:true}),['a']);
});
test('capacity and unavailable anchor are respected',()=>{
  assert.equal(recommend(graph(),'a',2).length,2);assert.deepEqual(recommend(graph(),'notfound',4),[]);
});
test('example data is valid and every recommendation respects constraints',()=>{
  const s=validateData(demoData());
  for(const anchor of s.people){for(const capacity of [2,4,6,12]){
    const ids=recommend(s,anchor.id,capacity,{includeMaybe:true});
    assert.ok(ids.length<=capacity);assert.equal(new Set(ids).size,ids.length);
    const summary=groupSummary(s,ids);assert.equal(summary.conflicts.length,0);assert.equal(summary.isolated.length,0);
  }}
});
test('backup round trip preserves unknown versus zero contributions and explicit invitation status',()=>{
  const s=demoData();s.people[0].gift=0;s.people[1].gift=null;s.people[2].invitation='no';
  const restored=validateData(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.people[0].gift,0);assert.equal(restored.people[1].gift,null);assert.equal(restored.people[2].invitation,'no');
  assert.deepEqual(restored,s);
});
test('earlier records without gift fields are migrated with unknown values',()=>{
  const s=graph();const restored=validateData(s);assert.equal(restored.people[0].gift,null);assert.equal(restored.people[0].invitation,'unknown');
});
test('corrupt backups reject invalid amounts, relationship references and duplicate guests',()=>{
  for(const bad of [-1,1.5,'100000',Infinity,1000000001]){const s=demoData();s.people[0].gift=bad;assert.throws(()=>validateData(s));}
  const s=graph();s.relations['a|unknown']='know';assert.throws(()=>validateData(s));
  const t=graph();t.meetings=[{id:'m1',title:'모임',members:['a','a'],date:'',place:'',note:'',status:'planned'}];assert.throws(()=>validateData(t));
});
test('financial records do not change the recommended group',()=>{
  const s=demoData(),before=recommend(s,'demo1',4);s.people.forEach((p,i)=>{p.gift=i*500000;p.invitation='no';});
  assert.deepEqual(recommend(s,'demo1',4),before);
});
test('older backups turn existing groups into reusable origins without losing records',()=>{
  const s=demoData();delete s.origins;s.people[0].circles=['IBM','  우리 독서 모임  '];
  const restored=validateData(s);
  assert.ok(restored.origins.some(o=>o.name==='우리 독서 모임'));
  assert.deepEqual(restored.people[0].circles,['IBM','우리 독서 모임']);
  assert.equal(restored.people[0].gift,s.people[0].gift);assert.deepEqual(restored.relations,s.relations);
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(restored))),restored);
});
test('unused origins are saved and survive backup and restore',()=>{
  const s=saveOrigin(emptyData(),{id:'book',name:'  주말   독서모임 ',type:'community'});
  const restored=validateData(JSON.parse(JSON.stringify(s)));
  assert.ok(restored.origins.some(o=>o.name==='주말 독서모임'));
  assert.equal(restored.people.length,0);
});
test('origin rename updates every linked person and preserves other data',()=>{
  const s=demoData();const before=structuredClone(s),ids=s.people.filter(p=>p.circles.includes('IBM')).map(p=>p.id);
  const renamed=saveOrigin(s,{id:'origin-ibm',name:'IBM Korea',type:'company'});
  assert.deepEqual(s,before);
  for(const id of ids){const entry=renamed.people.find(p=>p.id===id);assert.ok(entry.circles.includes('IBM Korea'));assert.ok(!entry.circles.includes('IBM'));assert.equal(entry.gift,s.people.find(p=>p.id===id).gift);}
  assert.deepEqual(renamed.relations,s.relations);assert.deepEqual(renamed.meetings,s.meetings);
  assert.deepEqual(recommend(renamed,'demo5',4),recommend(s,'demo5',4));
});
test('duplicate names are rejected across whitespace and English case',()=>{
  const s=emptyData();assert.throws(()=>saveOrigin(s,{id:'duplicate',name:' ibm ',type:'company'}));
  const bad=emptyData();bad.origins.push({id:'duplicate',name:'ibm',type:'other'});assert.throws(()=>validateData(bad));
});
test('linked origins cannot be removed; removing unused origins leaves people unchanged',()=>{
  assert.throws(()=>removeOrigin(demoData(),'origin-ibm'));
  const s=emptyData(),removed=removeOrigin(s,'origin-ibm');
  assert.equal(removed.origins.length,s.origins.length-1);assert.deepEqual(removed.people,s.people);
});
