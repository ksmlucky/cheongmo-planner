export const pairKey = (a, b) => [a, b].sort().join('|');
export const relation = (state, a, b) => state.relations[pairKey(a, b)] || '';
export const assignedIds = state => new Set(state.meetings.flatMap(m => m.members));
export const knownIds = (state, id) => state.people.filter(p => p.id !== id && relation(state, p.id, id) === 'know').map(p => p.id);
export const originTypes = {company:'회사',school:'학교',community:'모임·동호회',other:'기타 인연'};
export const originName = value => String(value).normalize('NFC').trim().replace(/\s+/g,' ');
export const originKey = value => originName(value).toLowerCase();
export const defaultOrigins = () => [
  {id:'origin-ibm',name:'IBM',type:'company'},
  {id:'origin-ey',name:'EY한영',type:'company'},
  {id:'origin-hwagok',name:'화곡고등학교',type:'school'}
];
function migrateOrigins(people, saved = defaultOrigins()) {
  const origins=saved.map(o=>({...o,name:originName(o.name)}));
  const byName=new Map(origins.map(o=>[originKey(o.name),o]));
  const ids=new Set(origins.map(o=>o.id));
  let sequence=0;
  for(const p of people)for(const name of p.circles){
    const key=originKey(name);
    if(!byName.has(key)){
      while(ids.has(`origin-legacy-${sequence}`))sequence++;
      const o={id:`origin-legacy-${sequence++}`,name:originName(name),type:'other'};
      origins.push(o);byName.set(key,o);ids.add(o.id);
    }
  }
  return {origins,people:people.map(p=>({...p,circles:[...new Set(p.circles.map(name=>byName.get(originKey(name)).name))]}))};
}
export function saveOrigin(state, entry) {
  const name=originName(entry.name);
  if(!name||name.length>40)throw new Error('이름은 1~40자로 입력해 주세요.');
  if(!Object.hasOwn(originTypes,entry.type))throw new Error('알게 된 곳의 종류를 선택해 주세요.');
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(entry.id))throw new Error('항목을 다시 열어 주세요.');
  if(state.origins.some(o=>o.id!==entry.id&&originKey(o.name)===originKey(name)))throw new Error('이미 저장된 이름이에요. 목록에서 선택해 주세요.');
  const next=structuredClone(state),index=next.origins.findIndex(o=>o.id===entry.id);
  if(index<0)next.origins.push({id:entry.id,name,type:entry.type});
  else{
    const before=next.origins[index].name;
    next.origins[index]={id:entry.id,name,type:entry.type};
    next.people=next.people.map(p=>({...p,circles:p.circles.map(c=>c===before?name:c)}));
  }
  return next;
}
export function removeOrigin(state,id) {
  const origin=state.origins.find(o=>o.id===id);
  if(!origin)throw new Error('이 항목을 찾을 수 없어요.');
  if(state.people.some(p=>p.circles.includes(origin.name)))throw new Error('연결된 사람이 있어요. 사람 정보에서 이 항목을 해제한 뒤 삭제해 주세요.');
  return {...state,origins:state.origins.filter(o=>o.id!==id)};
}
export function eligiblePeople(state, { includeMaybe = false, includeAssigned = false } = {}) {
  const assigned = assignedIds(state);
  return state.people.filter(p => (p.decision === 'invite' || (includeMaybe && p.decision === 'maybe')) && (includeAssigned || !assigned.has(p.id)));
}
export function candidateInfo(state, id, selected) {
  const person = state.people.find(p => p.id === id);
  const peers = selected.filter(pid => pid !== id).map(pid => state.people.find(p => p.id === pid)).filter(Boolean);
  return {
    known: peers.filter(p => relation(state, id, p.id) === 'know'),
    conflicts: peers.filter(p => relation(state, id, p.id) === 'avoid'),
    circles: [...new Set(peers.flatMap(p => p.circles).filter(c => person?.circles.includes(c)))]
  };
}
// Recommend only people who know at least one selected guest. Explicit separation always wins.
export function recommend(state, anchor, capacity, options = {}) {
  const pool = eligiblePeople(state, options);
  if (!pool.some(p => p.id === anchor)) return [];
  const selected = [anchor];
  while (selected.length < capacity) {
    const candidates = pool.filter(p => !selected.includes(p.id)).map(p => ({ p, ...candidateInfo(state, p.id, selected) }))
      .filter(x => !x.conflicts.length && x.known.length)
      .sort((a, b) => b.known.length - a.known.length || b.circles.length - a.circles.length || (a.p.decision === 'maybe') - (b.p.decision === 'maybe') || a.p.name.localeCompare(b.p.name, 'ko'));
    if (!candidates.length) break;
    selected.push(candidates[0].p.id);
  }
  return selected;
}
export function groupSummary(state, selected) {
  let links = 0;
  const conflicts = [];
  selected.forEach((id, i) => selected.slice(i + 1).forEach(other => {
    const r = relation(state, id, other);
    if (r === 'know') links++;
    if (r === 'avoid') conflicts.push([id, other]);
  }));
  return { links, possible: selected.length * (selected.length - 1) / 2, conflicts,
    isolated: selected.length > 1 ? selected.filter(id => !candidateInfo(state, id, selected).known.length) : [] };
}
export function validateData(input) {
  const fail = () => { throw new Error('청모 백업 파일의 형식을 확인해 주세요.'); };
  const str = (v, n) => typeof v === 'string' && v.length <= n;
  const idOk = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
  if (!input || input.version !== 1 || typeof input.demo !== 'boolean' || !Array.isArray(input.people) || input.people.length > 2000 || !Array.isArray(input.meetings) || input.meetings.length > 2000 || !input.relations || typeof input.relations !== 'object' || Array.isArray(input.relations)) fail();
  const ids = new Set();
  for (const p of input.people) {
    if (!p || !idOk(p.id) || ids.has(p.id) || !str(p.name, 50) || !p.name.trim() || !Array.isArray(p.circles) || p.circles.length > 12 || !p.circles.every(c => str(c, 40) && c.trim()) || !['invite','maybe','skip'].includes(p.decision) || !str(p.note, 500)) fail();
    if (p.invitation !== undefined && !['unknown','yes','no'].includes(p.invitation)) fail();
    if (p.gift !== undefined && p.gift !== null && (!Number.isSafeInteger(p.gift) || p.gift < 0 || p.gift > 1000000000)) fail();
    if (p.weddingDate !== undefined && (!str(p.weddingDate, 10) || (p.weddingDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.weddingDate)))) fail();
    if (p.giftNote !== undefined && !str(p.giftNote, 500)) fail();
    ids.add(p.id);
  }
  for (const [key, value] of Object.entries(input.relations)) {
    const pair = key.split('|');
    if (pair.length !== 2 || pair[0] === pair[1] || !pair.every(id => ids.has(id)) || key !== pairKey(...pair) || !['know', 'avoid'].includes(value)) fail();
  }
  const meetings = new Set();
  for (const m of input.meetings) {
    if (!m || !idOk(m.id) || meetings.has(m.id) || !str(m.title, 80) || !m.title.trim() || !Array.isArray(m.members) || !m.members.length || m.members.length > 12 || !m.members.every(id => ids.has(id)) || new Set(m.members).size !== m.members.length || !str(m.date, 16) || (m.date && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(m.date)) || !str(m.place, 100) || !str(m.note, 500) || !['planned', 'done'].includes(m.status)) fail();
    meetings.add(m.id);
  }
  if(input.origins!==undefined){
    if(!Array.isArray(input.origins)||input.origins.length>24000)fail();
    const originIds=new Set(),names=new Set();
    for(const o of input.origins){
      if(!o||!idOk(o.id)||originIds.has(o.id)||!str(o.name,40)||!originName(o.name)||!Object.hasOwn(originTypes,o.type)||names.has(originKey(o.name)))fail();
      originIds.add(o.id);names.add(originKey(o.name));
    }
  }
  // Existing group labels become reusable origins without changing people's other records.
  const migrated=migrateOrigins(input.people,input.origins);
  // Rebuild known fields: imported documents never supply UI state or executable content.
  return { version: 1, demo: input.demo,
    origins:migrated.origins,
    people: migrated.people.map(({id,name,circles,decision,note,invitation='unknown',gift=null,weddingDate='',giftNote=''}) => ({id,name,circles,decision,note,invitation,gift,weddingDate,giftNote})),
    relations: {...input.relations}, meetings: input.meetings.map(({id,title,members,date,place,note,status}) => ({id,title,members:[...members],date,place,note,status})) };
}
export const emptyData = () => ({ version: 1, demo: false, people: [], origins:defaultOrigins(), relations: {}, meetings: [] });
export function demoData() {
  const names = [
    ['민지', ['대학교', '여행 모임'], 'invite', '주말 점심이 편해요.'],
    ['수빈', ['대학교'], 'invite', '민지, 지훈과 자주 만나는 사이.'],
    ['지훈', ['대학교', '러닝 크루'], 'invite', '편안한 소규모 모임을 좋아해요.'],
    ['서연', ['대학교'], 'invite', '수빈과 같이 만나면 좋겠어요.'],
    ['현우', ['IBM'], 'invite', '퇴근 후 저녁 가능.'],
    ['유진', ['IBM', '여행 모임'], 'invite', '민지와도 아는 사이.'],
    ['도윤', ['EY한영', 'IBM'], 'invite', '현우, 유진과 함께 일했던 사이.'],
    ['하늘', ['러닝 크루'], 'invite', '지훈과 함께 운동해요.'],
    ['지수', ['화곡고등학교'], 'maybe', '오랜만이라 먼저 안부를 전하고 싶어요.'],
    ['정우', ['화곡고등학교'], 'maybe', '지수와는 계속 연락하는 사이.'],
    ['예린', ['여행 모임'], 'invite', '유진과 함께 여행했던 친구.'],
    ['태호', ['EY한영'], 'skip', '이번에는 따로 소식을 전하려고 해요.']
  ];
  const records = {0:['yes',200000,'2024-05-18','결혼식에 참석해서 전달했어요.'],2:['yes',100000,'2025-10-11','계좌로 보냈어요.'],4:['yes',100000,'2025-04-26',''],5:['yes',150000,'2026-03-21',''],8:['yes',100000,'2023-09-16',''],11:['yes',50000,'2022-11-12','']};
  const people = names.map(([name,circles,decision,note],i) => {
    const [invitation,gift,weddingDate,giftNote] = records[i] || ['unknown',null,'',''];
    return {id:`demo${i+1}`,name,circles,decision,note,invitation,gift,weddingDate,giftNote};
  });
  const relations = {};
  [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4],[5,6],[5,7],[6,7],[1,6],[3,8],[9,10],[6,11],[1,11]].forEach(([a,b]) => relations[pairKey(`demo${a}`,`demo${b}`)]='know');
  relations[pairKey('demo2','demo8')] = 'avoid';
  return validateData({version:1,demo:true,people,relations,meetings:[],origins:defaultOrigins()});
}
