import { pairKey, relation, assignedIds, knownIds, eligiblePeople, candidateInfo, recommend, groupSummary, validateData, emptyData, demoData, originTypes, originName, originKey, saveOrigin, removeOrigin } from './logic.js';

const KEY = 'cheongmo-planner-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  calendar:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 14h2M14 14h2M8 18h2',
  heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
  envelope:'M3 5h18v14H3zM3 5l9 8 9-8',
  plus:'M12 5v14M5 12h14', check:'M5 12l4 4L19 6', close:'M6 6l12 12M18 6 6 18',
  arrow:'M5 12h14M14 7l5 5-5 5', chevron:'m9 5 7 7-7 7',
  spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 15v2',
  link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
  upload:'M12 16V4M7 9l5-5 5 5M4 16v5h16v-5',
  settings:'M4 7h16M4 17h16M8 4v6M16 14v6',
  search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  edit:'m16 3 5 5-12 12H4v-5zM13 6l5 5',
  leaf:'M20 3C8 1 1 8 5 16s17 2 15-13M5 20 16 8',
  info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  coffee:'M4 8h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM17 8h2a3 3 0 0 1 0 6h-2M7 2v3M12 2v3',
  gift:'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H7a3 3 0 1 1 3-3zM12 8h5a3 3 0 1 0-3-3z',
};
const icon = (name, size=18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.heart}"/></svg>`;
const colors = [['#eadfd4','#a38165'],['#e6e8d9','#8b9372'],['#e0e7e9','#789297'],['#eadfe2','#a78088'],['#e8e1ed','#9983a4'],['#e4e8dc','#86996c']];
const avatar = (p, cls='') => { const n = [...p.id].reduce((a,c)=>a+c.charCodeAt(0),0) % colors.length; return `<span class="avatar ${cls}" style="--avatar-bg:${colors[n][0]};--avatar-fg:${colors[n][1]}">${esc(p.name.slice(0,1))}</span>`; };
const decisionLabel = {invite:'꼭 만나기',maybe:'고민 중',skip:'이번엔 보류'};
const invitationLabel = {unknown:'미기록',yes:'받았어요',no:'받지 않았어요'};
const won = n => `${new Intl.NumberFormat('ko-KR').format(n)}원`;
let storageIssue = '', state;
try { const raw = localStorage.getItem(KEY); state = raw ? validateData(JSON.parse(raw)) : demoData(); }
catch { state = emptyData(); storageIssue = '저장된 명단을 읽지 못했어요. 기존 데이터는 덮어쓰지 않았습니다. 백업 파일이 있다면 데이터 관리에서 복원해 주세요.'; }
let protectUnreadable = !!storageIssue;
const ui = {page:'builder',anchor:'',capacity:4,includeMaybe:false,includeAssigned:false,selected:[],search:'',circle:'all',decision:'all',more:false,meetingFilter:'all',ledgerSearch:'',ledgerFilter:'all',originSearch:'',originType:'all'};
let toastTimer, modalReturnFocus;
function initializeDraft(){
  const pool = eligiblePeople(state,ui);
  if (!pool.some(p=>p.id===ui.anchor)) ui.anchor = pool[0]?.id || '';
  ui.selected = recommend(state,ui.anchor,ui.capacity,ui);
}
initializeDraft();
function persist(next){
  state = next;
  try {
    if(protectUnreadable) throw new Error('protected');
    localStorage.setItem(KEY,JSON.stringify(state));
    storageIssue='';
  } catch { storageIssue = '변경 내용이 이 브라우저에 저장되지 않았어요. 창을 닫기 전에 데이터 관리에서 백업 파일을 내려받아 주세요.'; }
}
function toast(message){ $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3400); }
function person(id){return state.people.find(p=>p.id===id);}
function peopleNames(ids){return ids.map(id=>person(id)?.name||'').join(', ');}
function assignedCount(){return assignedIds(state).size;}
function groupTitle(ids){
  if(!ids.length)return '우리의 다음 모임';
  const first=person(ids[0]); if(!first)return '우리의 다음 모임';
  const common=first.circles.find(c=>ids.every(id=>person(id)?.circles.includes(c)));
  return common ? `${common} 사람들과` : `${first.name} 님과 함께`;
}
function render(){
  const labels={builder:'모임 만들기',people:'사람 목록',origins:'알게 된 곳',meetings:'저장한 모임',ledger:'청첩장·축의금'};
  $('#app').innerHTML=`<div class="layout">
    <aside class="sidebar"><div class="brand"><div class="brand-mark">${icon('envelope',24)}</div><div><div class="brand-name">청모</div><small>CHEONGMO</small></div></div>
    <p class="nav-label">MY WEDDING PLANNER</p><nav class="nav" aria-label="주 메뉴">
    ${[['builder','grid','모임 만들기',''],['people','people','사람 목록',state.people.length],['origins','pin','알게 된 곳',''],['meetings','calendar','저장한 모임',state.meetings.length],['ledger','gift','청첩장·축의금','']].map(([page,ico,label,count])=>`<button data-action="nav" data-page="${page}" class="${ui.page===page?'active':''}" ${ui.page===page?'aria-current="page"':''}>${icon(ico)}<span>${label}</span>${count!==''?`<span>${count}</span>`:''}</button>`).join('')}</nav>
    <div class="sidebar-note">${icon('leaf',24)}<p>소중한 사람들과<br>좋은 소식을 나누는 일.</p><small>한 사람씩 떠올리고,<br>다정한 자리를 준비해 보세요.</small></div>
    <div class="sidebar-bottom"><button data-action="data">${icon('settings',16)}데이터 관리</button></div></aside>
    <div class="main-wrap"><header class="topbar"><div class="breadcrumb">나의 청첩장 모임 ${icon('chevron',11)} <strong>${labels[ui.page]}</strong></div><div class="top-actions"><span class="private">${icon('lock',12)}나만의 플래너</span><button class="text-btn" data-action="data" aria-label="데이터 관리 및 백업">${icon('download',15)} 백업</button><span class="host-avatar" title="모임을 준비하는 나">나</span></div></header>
    <main class="content" id="main" tabindex="-1">${storageIssue?`<div class="storage-error" role="alert">${esc(storageIssue)}</div>`:''}
    ${state.demo?`<div class="demo-banner">${icon('info',15)}<span>지금은 가상의 예시 명단으로 둘러보는 중이에요.</span><button class="text-btn" data-action="start">내 명단 시작하기 ${icon('arrow',13)}</button></div>`:''}
    ${ui.page==='builder'?builderPage():ui.page==='people'?peoplePage():ui.page==='origins'?originsPage():ui.page==='ledger'?ledgerPage():meetingsPage()}
    <p class="footer-note">${icon('lock',11)} 명단과 관계는 이 브라우저에만 저장돼요. 다른 기기로 옮기거나 보관하려면 백업을 이용하세요.</p>
    </main></div></div>`;
}
function stats(){return `<div class="stats"><div class="stat"><div class="stat-icon">${icon('people',20)}</div><div><small>만나고 싶은 사람</small><b>${state.people.filter(p=>p.decision==='invite').length}<span>명</span></b></div></div><div class="stat"><div class="stat-icon">${icon('coffee',20)}</div><div><small>모임에 담은 사람</small><b>${assignedCount()}<span>명</span></b></div></div><div class="stat"><div class="stat-icon">${icon('calendar',20)}</div><div><small>저장한 모임</small><b>${state.meetings.length}<span>개</span></b></div></div></div>`;}
function builderPage(){
  const pool=eligiblePeople(state,ui), summary=groupSummary(state,ui.selected);
  const candidates=pool.filter(p=>p.id!==ui.anchor).map(p=>({p,...candidateInfo(state,p.id,ui.selected)})).sort((a,b)=>Number(ui.selected.includes(b.p.id))-Number(ui.selected.includes(a.p.id)) || a.conflicts.length-b.conflicts.length || b.known.length-a.known.length || b.circles.length-a.circles.length);
  return `<div class="page-head"><div><p class="eyebrow">A LITTLE GATHERING, A BIG MOMENT</p><h1>좋은 소식은,<br><em>편안한 사람들과.</em></h1><p class="description">누구와 함께하면 좋을까요?<br>서로 아는 사이를 연결해, 자연스러운 모임을 만들어 보세요.</p></div><div class="head-art" aria-hidden="true"><div class="letter">FOR YOU</div><div class="envelope"></div><span class="art-spark">✧</span></div></div>
  ${stats()}
  ${!state.people.length?`<div class="empty">${icon('people')}<h2>가장 먼저 떠오르는 사람은 누구인가요?</h2><p>만나고 싶은 사람을 적고, 서로 아는 사이를 연결해 주세요.<br>첫 사람이 모이면, 다음 사람을 함께 찾아드릴게요.</p><button class="btn primary" data-action="add-person">${icon('plus',16)}첫 사람 등록하기</button></div>`:`<div class="builder-grid"><section class="card card-pad" aria-labelledby="builder-title"><div class="section-title"><span class="step">01</span><h2 id="builder-title">누구부터 만나볼까요?</h2></div><p class="helper">한 사람을 고르면, 함께 만나기 좋은 사람을 찾아요.</p>
  <div class="field-row"><div class="field"><label for="anchor">모임의 시작이 될 사람</label><select id="anchor">${pool.length?pool.map(p=>`<option value="${p.id}" ${p.id===ui.anchor?'selected':''}>${esc(p.name)}${p.circles[0]?` · ${esc(p.circles[0])}`:''}</option>`).join(''):'<option value="">추천 가능한 사람이 없어요</option>'}</select></div><div class="field"><label for="capacity">초대 인원 · 나 제외</label><select id="capacity">${[2,3,4,5,6,8,10,12].map(n=>`<option value="${n}" ${ui.capacity===n?'selected':''}>${n}명까지</option>`).join('')}</select></div></div>
  <div class="options"><label class="check-row"><input id="include-maybe" type="checkbox" ${ui.includeMaybe?'checked':''}>고민 중인 사람도 포함</label><label class="check-row"><input id="include-assigned" type="checkbox" ${ui.includeAssigned?'checked':''}>이미 모임에 담은 사람 포함</label></div>
  <button class="btn primary full" data-action="recommend" ${!pool.length?'disabled':''}>${icon('spark',15)}서로 아는 사람으로 추천받기</button><hr class="divider">
  <div class="candidate-heading"><h3>함께 만나면 좋은 사람들</h3><small>직접 더하거나 빼도 좋아요</small></div>
  <div class="candidates">${candidates.length?candidates.slice(0,ui.more?candidates.length:5).map(c=>candidateCard(c)).join(''):`<p class="helper">${pool.length?'다른 사람을 등록하고 아는 사이를 표시해 주세요.':'사람 목록에서 ‘꼭 만나기’를 선택하거나 위의 포함 옵션을 확인해 주세요.'}</p>`}</div>
  ${candidates.length>5?`<button class="text-btn more" data-action="more">${ui.more?'접기':`후보 ${candidates.length-5}명 더 보기`} ${icon('chevron',12)}</button>`:''}
  <button class="text-btn more" data-action="add-person">${icon('plus',12)}사람과 관계 추가하기</button></section>
  <div class="preview-column"><section class="card preview-card" aria-label="모임 미리보기"><div class="preview-header"><span class="eyebrow"><span class="live-dot"></span> OUR NEXT GATHERING</span><span class="preview-count">${ui.selected.length} / ${ui.capacity}명</span></div><h2 class="preview-title">${esc(groupTitle(ui.selected))}</h2><p class="preview-subtitle">${ui.selected.length>1?'익숙한 얼굴들과 나눌, 반가운 이야기.':ui.selected.length?'함께할 사람을 한 명씩 더해 보세요.':'모임의 시작이 될 사람을 골라 주세요.'}</p>${network()}
  <div class="connection-note"><span></span>선은 직접 등록한 ‘아는 사이’예요</div>
  <div class="preview-bottom"><div class="summary-line">${icon('link',16)}${summary.possible?`확인된 아는 사이 ${summary.links} / ${summary.possible}쌍`:'작은 모임도 좋아요'}</div><p class="summary-detail">${summary.possible?summary.links===summary.possible?'선택한 사람들은 모두 서로 아는 사이예요.':summary.isolated.length?`${esc(peopleNames(summary.isolated))} 님은 이 모임에서 확인된 연결이 없어요.`:'모든 사람에게 아는 사람이 한 명 이상 있어요. 서로 모르는 조합은 직접 확인해 주세요.':'한 사람과의 소중한 만남도 모임으로 저장할 수 있어요.'}<br>초대 인원 ${ui.selected.length}명${ui.selected.length?` · 나까지 총 ${ui.selected.length+1}명`:''}</p>
  ${summary.conflicts.length?'<div class="warning">함께 부르기 어려운 관계가 포함되어 있어요. 구성을 바꿔 주세요.</div>':''}
  <button class="btn primary full" data-action="save-draft" ${!ui.selected.length||summary.conflicts.length?'disabled':''}>이 조합으로 모임 저장 ${icon('arrow',15)}</button></div></section>
  <aside class="help-card">${icon('leaf',20)}<div><h3>자연스러운 모임을 위한 작은 팁</h3><p>같은 곳에서 만났어도 모두 아는 사이는 아닐 수 있어요.<br>사람 목록에서 서로의 관계를 표시할수록<br>더 편안한 조합을 찾을 수 있어요.</p></div></aside></div></div>`}`;
}
function candidateCard({p,known,conflicts,circles}){
  const selected=ui.selected.includes(p.id);
  const reason=conflicts.length?`${peopleNames(conflicts.map(x=>x.id))} 님과 따로 만나기로 했어요`:known.length?`${known.map(x=>x.name).slice(0,2).join(', ')}${known.length>2?` 외 ${known.length-2}명`:''} 님과 아는 사이`:circles.length?`${circles[0]} · 아는 사이인지 확인이 필요해요`:'선택한 사람들과의 관계가 아직 없어요';
  return `<button class="person-pick ${selected?'selected':''}" data-action="toggle-person" data-id="${p.id}" aria-pressed="${selected}" ${conflicts.length&&!selected?'disabled':''}>${avatar(p)}<span class="pick-copy"><span class="pick-name">${esc(p.name)}${p.circles[0]?`<span class="tag">${esc(p.circles[0])}</span>`:''}${p.decision==='maybe'?'<span class="tag warm">고민 중</span>':''}</span><small>${esc(reason)}</small></span><span class="selection-check">${icon(selected?'check':'plus',11)}</span></button>`;
}
function network(){
  const members=ui.selected.map(person).filter(Boolean), n=members.length;
  if(!n)return `<div class="network"><div class="network-empty">${icon('envelope',30)}<br>함께할 사람을 기다리고 있어요</div></div>`;
  const positions=members.map((p,i)=>{const angle=(i/n)*2*Math.PI-Math.PI/2+(n===4?Math.PI/4:0);return {p,x:50+34*Math.cos(angle),y:48+32*Math.sin(angle)};});
  const lines=[];
  positions.forEach((a,i)=>positions.slice(i+1).forEach(b=>{if(relation(state,a.p.id,b.p.id)==='know')lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#a9b899" stroke-width=".4"/>`);}));
  return `<div class="network"><svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="48" rx="34" ry="32" fill="none" stroke="#dce2cf" stroke-width=".3" stroke-dasharray="1 2"/>${lines.join('')}</svg><div class="network-center" aria-hidden="true">${icon('envelope',25)}<span>WITH LOVE</span></div>${positions.map(({p,x,y},i)=>`<div class="guest-node" style="left:${x}%;top:${y}%">${avatar(p)}<b>${esc(p.name)}</b>${p.id===ui.anchor?'<small>모임의 시작</small>':''}</div>`).join('')}</div>`;
}
function peoplePage(){
  const circles=state.origins.map(o=>o.name).sort((a,b)=>a.localeCompare(b,'ko'));
  return `<div class="page-head compact"><div><p class="eyebrow">THE PEOPLE IN YOUR STORY</p><h1>소중한 사람들</h1><p class="description">만나고 싶은 사람, 그리고 서로의 연결을 적어두세요.</p></div><button class="btn primary" data-action="add-person">${icon('plus',15)}사람 추가</button></div>
  <div class="toolbar"><div class="search-wrap">${icon('search',16)}<input class="search-input" id="people-search" value="${esc(ui.search)}" placeholder="이름, 알게 된 곳, 메모로 검색" aria-label="사람 검색"></div><select class="filter-select" id="circle-filter" aria-label="알게 된 곳 필터"><option value="all">모든 알게 된 곳</option>${circles.map(c=>`<option value="${esc(c)}" ${ui.circle===c?'selected':''}>${esc(c)}</option>`).join('')}</select><select class="filter-select" id="decision-filter" aria-label="초대 결정 필터"><option value="all">모든 초대 상태</option>${Object.entries(decisionLabel).map(([v,l])=>`<option value="${v}" ${ui.decision===v?'selected':''}>${l}</option>`).join('')}</select></div>
  <div id="people-results">${peopleResults()}</div>`;
}
function peopleResults(){
  const list=state.people.filter(p=>(ui.circle==='all'||p.circles.includes(ui.circle))&&(ui.decision==='all'||p.decision===ui.decision)&&`${p.name} ${p.circles.join(' ')} ${p.note}`.toLowerCase().includes(ui.search.toLowerCase()));
  const assigned=assignedIds(state);
  return `<p class="count-muted">${list.length}명의 사람들</p><div class="people-list">${list.length?list.map(p=>`<article class="person-row"><div class="person-main">${avatar(p)}<div><strong>${esc(p.name)}</strong><small class="person-origins">${esc(p.circles.join(' · '))||'알게 된 곳 미지정'}</small><small>아는 사이 ${knownIds(state,p.id).length}명${assigned.has(p.id)?' · 모임에 담김':''}</small></div></div><div class="tags">${p.circles.map(c=>`<span class="tag">${esc(c)}</span>`).join('')}</div><div class="person-note">${esc(p.note)||'아직 남긴 메모가 없어요.'}</div><span class="tag ${p.decision==='invite'?'green':p.decision==='maybe'?'warm':''}">${decisionLabel[p.decision]}</span><button class="icon-btn" data-action="edit-person" data-id="${p.id}" aria-label="${esc(p.name)} 정보와 관계 편집">${icon('edit',16)}</button></article>`).join(''):`<div class="empty">${icon('people')}<h2>${state.people.length?'검색 결과가 없어요':'명단의 첫 페이지를 채워볼까요?'}</h2><p>${state.people.length?'검색어나 필터를 바꿔보세요.':'이름과 알게 된 곳을 적고, 초대하고 싶은 마음을 정리해 보세요.'}</p><button class="btn secondary" data-action="${state.people.length?'clear-filters':'add-person'}">${state.people.length?'검색 초기화':'첫 사람 등록하기'}</button></div>`}</div>`;
}
function sortedOrigins(){const kinds=Object.keys(originTypes);return [...state.origins].sort((a,b)=>kinds.indexOf(a.type)-kinds.indexOf(b.type)||a.name.localeCompare(b.name,'ko'));}
function originsPage(){
  return `<div class="page-head compact"><div><p class="eyebrow">WHERE OUR STORIES BEGAN</p><h1>우리가 알게 된 곳</h1><p class="description">함께 일했던 회사, 다녔던 학교, 즐겨 찾던 모임.<br>구체적인 이름으로 저장하고 사람들에게 연결해 주세요.</p></div><button class="btn primary" data-action="add-origin">${icon('plus',15)}새 항목 추가</button></div>
  <div class="origin-intro">${icon('pin',22)}<div><strong>한 번 저장해 두면, 다음에는 선택만.</strong><p>IBM과 EY한영은 각각 다른 인연으로 관리해요. 한 사람에게 여러 곳을 연결할 수도 있어요.</p></div></div>
  <div class="toolbar"><div class="search-wrap">${icon('search',16)}<input class="search-input" id="origin-search" value="${esc(ui.originSearch)}" placeholder="회사·학교·모임 이름 검색" aria-label="알게 된 곳 검색"></div><select class="filter-select" id="origin-type-filter" aria-label="알게 된 곳 종류 필터"><option value="all">모든 종류</option>${Object.entries(originTypes).map(([v,l])=>`<option value="${v}" ${ui.originType===v?'selected':''}>${l}</option>`).join('')}</select></div><div id="origin-results">${originResults()}</div>`;
}
function originResults(){
  const list=sortedOrigins().filter(o=>originKey(o.name).includes(originKey(ui.originSearch))&&(ui.originType==='all'||o.type===ui.originType));
  return `<p class="count-muted">${list.length}개의 인연 · 이름을 바꾸면 연결된 사람에게도 함께 반영돼요.</p>${list.length?`<div class="origin-grid">${list.map(o=>{const members=state.people.filter(p=>p.circles.includes(o.name));return `<article class="card origin-card"><div class="origin-card-top"><span class="tag ${o.type==='company'?'green':o.type==='school'?'warm':''}">${originTypes[o.type]}</span><button class="icon-btn" data-action="edit-origin" data-id="${o.id}" aria-label="${esc(o.name)} 이름과 종류 수정">${icon('edit',16)}</button></div><h2>${esc(o.name)}</h2><p>${members.length?`${members.slice(0,3).map(p=>esc(p.name)).join(', ')}${members.length>3?` 외 ${members.length-3}명`:''}`:'아직 연결된 사람이 없어요.'}</p><div class="origin-card-bottom"><button class="text-btn" data-action="origin-people" data-id="${o.id}">연결된 사람 ${members.length}명 ${icon('arrow',12)}</button><button class="text-btn" data-action="origin-add-person" data-id="${o.id}">${icon('plus',12)}사람 추가</button></div></article>`;}).join('')}</div>`:`<div class="empty">${icon('pin')}<h2>새로운 인연의 시작을 적어보세요</h2><p>회사·학교의 이름이나 알게 된 계기를 자유롭게 저장할 수 있어요.</p><button class="btn secondary" data-action="add-origin">알게 된 곳 추가</button></div>`}`;
}
function originModal(id){
  const existing=state.origins.find(o=>o.id===id),o=existing||{name:'',type:'company'};
  const count=existing?state.people.filter(p=>p.circles.includes(o.name)).length:0;
  openModal(existing?'알게 된 곳 수정':'알게 된 곳 추가',`<form id="origin-form"><div class="modal-body"><p class="helper">구체적인 이름을 적어 주세요. 여기 저장한 항목은 사람을 등록할 때 다시 선택할 수 있어요.</p><div class="modal-fields"><div class="field"><label for="origin-name">이름 *</label><input id="origin-name" name="name" value="${esc(o.name)}" maxlength="40" placeholder="예: IBM, EY한영, 화곡고등학교" required autofocus></div><div class="field"><label for="origin-type">어떤 인연인가요?</label><select id="origin-type" name="type">${Object.entries(originTypes).map(([v,l])=>`<option value="${v}" ${o.type===v?'selected':''}>${l}</option>`).join('')}</select></div>${count?`<p class="helper">이름을 바꾸면 연결된 ${count}명의 정보도 함께 바뀝니다.<br>삭제하려면 먼저 연결된 사람들의 선택을 해제해 주세요.</p>`:''}</div><div id="form-error" class="form-error" role="alert"></div></div><div class="modal-actions">${existing?`<button type="button" class="text-btn left" data-action="delete-origin" data-id="${id}" ${count?'disabled':''}>항목 삭제</button>`:''}<button type="button" class="btn secondary" data-action="close-modal">취소</button><button type="submit" class="btn primary">항목 저장</button></div></form>`);
  $('#origin-form').onsubmit=e=>{e.preventDefault();try{const fd=new FormData(e.currentTarget),next=saveOrigin(state,{id:id||crypto.randomUUID(),name:fd.get('name'),type:fd.get('type')});if(existing&&ui.circle===existing.name)ui.circle=originName(fd.get('name'));persist(next);closeModal();render();toast('알게 된 곳을 저장했어요.');}catch(err){$('#form-error').textContent=err.message;}};
}
function originChoices(selected){
  return sortedOrigins().map(o=>`<label class="origin-choice" data-origin-choice="${esc(originKey(o.name))}"><input type="checkbox" name="circles" value="${esc(o.name)}" ${selected.includes(o.name)?'checked':''}><span>${esc(o.name)}</span><small>${originTypes[o.type]}</small></label>`).join('')||'<p class="helper">아래에서 첫 번째 항목을 추가해 주세요.</p>';
}
function originPicker(selected){
  return `<fieldset class="origin-picker"><legend>알게 된 곳 <span class="small-label">· 여러 개 선택</span></legend><p class="relation-help">저장해 둔 회사·학교·모임을 골라 주세요. 목록에 없으면 바로 추가할 수 있어요.</p><div class="field"><input id="origin-choice-search" aria-label="저장한 인연 검색" placeholder="저장한 이름으로 찾기"></div><div id="origin-choices" class="origin-choices">${originChoices(selected)}</div><p class="origin-selected-count" id="origin-selected-count">${selected.length}개 선택</p><div class="origin-inline-add"><div class="field"><label for="new-origin-name">목록에 새 이름 추가</label><input id="new-origin-name" maxlength="40" placeholder="예: IBM, EY한영, 화곡고등학교"></div><div class="field"><label for="new-origin-type">종류</label><select id="new-origin-type">${Object.entries(originTypes).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><button type="button" class="btn secondary" data-action="inline-add-origin">추가</button></div><div id="origin-inline-error" class="form-error" role="alert"></div></fieldset>`;
}
function inlineAddOrigin(){
  const name=originName($('#new-origin-name').value),selected=new FormData($('#person-form')).getAll('circles');
  $('#origin-inline-error').textContent='';
  if(!name){$('#origin-inline-error').textContent='추가할 이름을 입력해 주세요.';return;}
  try{
    const existing=state.origins.find(o=>originKey(o.name)===originKey(name));
    const chosen=existing?.name||name;
    if(!selected.includes(chosen)&&selected.length>=12)throw new Error('한 사람에게는 최대 12개까지 선택할 수 있어요.');
    if(!existing)persist(saveOrigin(state,{id:crypto.randomUUID(),name,type:$('#new-origin-type').value}));
    if(!selected.includes(chosen))selected.push(chosen);
    $('#origin-choices').innerHTML=originChoices(selected);$('#origin-choice-search').value='';$('#new-origin-name').value='';$('#origin-selected-count').textContent=`${selected.length}개 선택`;
    render();toast(existing?'이미 저장된 항목을 선택했어요.':'목록에 저장하고 선택했어요.');
  }catch(err){$('#origin-inline-error').textContent=err.message;}
}
function dateLabel(value){if(!value)return '날짜를 정해 주세요';const d=new Date(`${value}:00+09:00`);return Number.isNaN(d.getTime())?'날짜 확인 필요':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:true}).format(d);}
function ledgerPage(){
  const total=state.people.reduce((sum,p)=>sum+(p.gift??0),0),recorded=state.people.filter(p=>p.gift!==null&&p.gift!==undefined).length;
  return `<div class="page-head compact"><div><p class="eyebrow">A NOTE OF THE MOMENTS WE SHARED</p><h1>청첩장과 축의금</h1><p class="description">받았던 초대와 전했던 마음을, 잊지 않도록 적어두세요.</p></div><button class="btn secondary" data-action="add-person">${icon('plus',15)}사람 추가</button></div><div class="stats ledger-stats"><div class="stat"><div class="stat-icon">${icon('envelope',20)}</div><div><small>청첩장을 받은 사람</small><b>${state.people.filter(p=>p.invitation==='yes').length}<span>명</span></b></div></div><div class="stat total-stat"><div class="stat-icon">${icon('gift',20)}</div><div><small>내가 낸 축의금 합계</small><b>${won(total)}</b></div></div><div class="stat"><div class="stat-icon">${icon('edit',20)}</div><div><small>금액을 기록한 사람</small><b>${recorded}<span>/ ${state.people.length}명</span></b></div></div></div>
  <div class="ledger-explainer">${icon('info',15)}<span>내가 상대에게 낸 금액을 기록하는 곳이에요. 빈칸은 ‘미기록’, 0원은 ‘내지 않음’으로 구분해요.</span></div><div class="toolbar"><div class="search-wrap">${icon('search',16)}<input id="ledger-search" class="search-input" value="${esc(ui.ledgerSearch)}" placeholder="이름, 알게 된 곳, 축의금 메모로 검색" aria-label="청첩장 및 축의금 기록 검색"></div><select id="ledger-filter" class="filter-select" aria-label="청첩장 및 축의금 필터">${[['all','모든 기록'],['yes','청첩장 받음'],['no','청첩장 받지 않음'],['unknown','청첩장 미기록'],['gift-missing','축의금 미기록']].map(([v,l])=>`<option value="${v}" ${ui.ledgerFilter===v?'selected':''}>${l}</option>`).join('')}</select></div><div id="ledger-results">${ledgerResults()}</div><p class="ledger-footnote">기록은 모임 추천 순위에 영향을 주지 않아요. 사람별 편집 화면에서도 함께 관리할 수 있습니다.</p>`;
}
function ledgerResults(){
  const list=state.people.filter(p=>`${p.name} ${p.circles.join(' ')} ${p.giftNote||''}`.toLowerCase().includes(ui.ledgerSearch.toLowerCase())&&(ui.ledgerFilter==='all'||(ui.ledgerFilter==='gift-missing'?p.gift===null||p.gift===undefined:(p.invitation||'unknown')===ui.ledgerFilter)));
  if(!list.length)return `<div class="empty">${icon('gift')}<h2>${state.people.length?'해당하는 기록이 없어요':'기억하고 싶은 초대가 있나요?'}</h2><p>${state.people.length?'다른 이름이나 필터로 찾아보세요.':'먼저 사람을 추가하고, 받은 청첩장과 낸 축의금을 기록해 보세요.'}</p><button class="btn secondary" data-action="${state.people.length?'clear-ledger':'add-person'}">${state.people.length?'검색 초기화':'사람 추가하기'}</button></div>`;
  return `<p class="count-muted">${list.length}명의 기록 · 금액은 원(KRW) 기준</p><div class="ledger-table"><div class="ledger-table-head"><span>사람</span><span>받은 청첩장</span><span>내가 낸 축의금</span><span>상대 결혼식</span><span></span></div>${list.map(p=>`<article class="ledger-row"><div class="person-main">${avatar(p)}<div><strong>${esc(p.name)}</strong><small>${esc(p.circles.join(' · '))||'알게 된 곳 미지정'}</small></div></div><div class="ledger-invitation"><span class="tag ${p.invitation==='yes'?'green':''}">${invitationLabel[p.invitation||'unknown']}</span></div><div class="ledger-amount ${p.gift===null||p.gift===undefined?'unrecorded':''}">${p.gift===null||p.gift===undefined?'미기록':won(p.gift)}${p.gift===0?'<small>내지 않음</small>':''}</div><div class="ledger-date">${p.weddingDate?esc(p.weddingDate.replaceAll('-','. ')):'날짜 미기록'}</div><button class="icon-btn" data-action="edit-gift" data-id="${p.id}" aria-label="${esc(p.name)} 청첩장 및 축의금 기록">${icon('edit',16)}</button>${p.giftNote?`<p class="ledger-note">${esc(p.giftNote)}</p>`:''}</article>`).join('')}</div>`;
}
function giftFields(p){
  return `<div class="gift-fields"><div class="gift-section-title">${icon('gift',15)}청첩장과 축의금 <span class="small-label">· 선택 기록</span></div><div class="form-two"><div class="field"><label for="person-invitation">이 사람에게 청첩장을 받았나요?</label><select id="person-invitation" name="invitation">${Object.entries(invitationLabel).map(([v,l])=>`<option value="${v}" ${(p.invitation||'unknown')===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label for="person-gift">내가 낸 축의금 <span class="small-label">· 원</span></label><input id="person-gift" name="gift" type="number" inputmode="numeric" min="0" max="1000000000" step="1" value="${p.gift??''}" placeholder="미기록 · 예: 100000"></div></div><p class="relation-help">아직 기록하지 않았다면 빈칸으로, 내지 않았다면 0으로 남겨주세요.</p><div class="field"><label for="person-wedding-date">상대 결혼식 날짜</label><input id="person-wedding-date" name="weddingDate" type="date" value="${esc(p.weddingDate||'')}" max="9999-12-31"></div><div class="field"><label for="person-gift-note">청첩장·축의금 메모</label><textarea id="person-gift-note" name="giftNote" maxlength="500" placeholder="예: 결혼식에 참석해 전달 / 계좌로 송금">${esc(p.giftNote||'')}</textarea></div></div>`;
}
function giftRecord(fd){
  const raw=String(fd.get('gift')??'').trim(),gift=raw===''?null:Number(raw);
  if(gift!==null&&(!Number.isSafeInteger(gift)||gift<0||gift>1000000000))throw new Error('축의금은 0원부터 10억 원까지, 원 단위 정수로 입력해 주세요.');
  return {invitation:fd.get('invitation')||'unknown',gift,weddingDate:String(fd.get('weddingDate')||''),giftNote:String(fd.get('giftNote')||'').trim()};
}
function giftModal(id){
  const p=person(id);if(!p)return;
  openModal(`${p.name} 님의 청첩장·축의금`,`<form id="gift-form"><div class="modal-body"><p class="helper">이 사람에게 받은 청첩장과, 내가 낸 축의금을 기록해요.</p>${giftFields(p)}<div id="form-error" class="form-error" role="alert"></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-action="close-modal">취소</button><button type="submit" class="btn primary">기록 저장</button></div></form>`);
  $('#gift-form').onsubmit=e=>{e.preventDefault();try{const record=giftRecord(new FormData(e.currentTarget)),next=structuredClone(state);Object.assign(next.people.find(x=>x.id===id),record);persist(next);closeModal();render();toast('청첩장과 축의금 기록을 저장했어요.');}catch(err){$('#form-error').textContent=err.message;}};
}
function meetingsPage(){
  const list=state.meetings.filter(m=>ui.meetingFilter==='all'||m.status===ui.meetingFilter).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  return `<div class="page-head compact"><div><p class="eyebrow">LITTLE MOMENTS TO LOOK FORWARD TO</p><h1>우리의 약속들</h1><p class="description">조합을 담아두고, 날짜와 장소를 천천히 정해요.</p></div><button class="btn primary" data-action="nav" data-page="builder">${icon('plus',15)}모임 만들기</button></div><div class="meeting-filter">${[['all','전체'],['planned','만날 예정'],['done','만남 완료']].map(([v,l])=>`<button class="${ui.meetingFilter===v?'active':''}" data-action="meeting-filter" data-filter="${v}" aria-pressed="${ui.meetingFilter===v}">${l} ${state.meetings.filter(m=>v==='all'||m.status===v).length}</button>`).join('')}</div>
  ${list.length?`<div class="meeting-grid">${list.map(m=>{const summary=groupSummary(state,m.members);return `<article class="card meeting-card ${m.status==='done'?'meeting-done':''}"><div class="meeting-top"><span class="tag ${m.status==='done'?'green':'warm'}">${m.status==='done'?'만남 완료':m.date?'만날 예정':'일정 미정'}</span><button class="icon-btn" data-action="edit-meeting" data-id="${m.id}" aria-label="${esc(m.title)} 편집">${icon('edit',16)}</button></div><h2>${esc(m.title)}</h2><p class="meeting-meta">${icon('calendar',14)}${esc(dateLabel(m.date))}</p><p class="meeting-meta">${icon('pin',14)}${esc(m.place)||'장소를 정해 주세요'}</p><div class="meeting-members">${m.members.map(id=>`<span class="member-chip">${esc(person(id)?.name)}</span>`).join('')}<span class="member-chip">나</span></div>${summary.conflicts.length?'<div class="warning">따로 만나기로 한 관계가 포함되어 있어요. 구성을 확인해 주세요.</div>':''}${m.note?`<p class="helper" style="margin-bottom:15px">${esc(m.note)}</p>`:''}<div class="meeting-actions"><button class="text-btn" data-action="copy-meeting" data-id="${m.id}">${icon('envelope',13)}안내문 복사</button><button class="btn small ${m.status==='done'?'secondary':'soft'}" data-action="toggle-done" data-id="${m.id}">${icon('check',13)}${m.status==='done'?'예정으로 되돌리기':'만남 완료'}</button></div></article>`;}).join('')}</div>`:`<div class="empty">${icon('calendar')}<h2>${state.meetings.length?'이 상태의 모임이 아직 없어요':'첫 번째 모임을 기다리고 있어요'}</h2><p>편안한 조합을 찾았다면 모임으로 저장해 보세요.<br>날짜와 장소는 나중에 정해도 괜찮아요.</p><button class="btn primary" data-action="nav" data-page="builder">모임 만들러 가기 ${icon('arrow',14)}</button></div>`}`;
}
function openModal(title,body,actions=''){
  const modal=$('#modal');
  if(!modal.open)modalReturnFocus=document.activeElement;
  modal.innerHTML=`<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn" data-action="close-modal" aria-label="닫기">${icon('close',20)}</button></div>${body}${actions}`;
  if(!modal.open)modal.showModal();
}
function closeModal(){ $('#modal').close(); if(modalReturnFocus?.isConnected)modalReturnFocus.focus(); }
function confirmDialog(title,copy,label,fn,danger=false){
  openModal(title,`<div class="modal-body"><p class="confirm-copy">${esc(copy)}</p></div>`,`<div class="modal-actions"><button class="btn secondary" data-action="close-modal">취소</button><button class="btn ${danger?'danger':'primary'}" id="confirm-action">${esc(label)}</button></div>`);
  $('#confirm-action').onclick=()=>{closeModal();fn();};
}
function personModal(id,preselected=[]){
  const existing=id?person(id):null;
  const p=existing||{name:'',circles:preselected,decision:'invite',note:''};
  const others=state.people.filter(x=>x.id!==id);
  openModal(existing?'사람과 관계 편집':'새로운 사람 추가',`<form id="person-form"><div class="modal-body"><p class="helper">서로 아는 사이를 표시하면 자연스러운 모임을 추천해 드려요.</p><div class="modal-fields"><div class="form-two"><div class="field"><label for="person-name">이름 *</label><input id="person-name" name="name" value="${esc(p.name)}" maxlength="50" required placeholder="이름 또는 별명" autofocus></div><div class="field"><label for="person-decision">초대에 대한 마음</label><select id="person-decision" name="decision">${Object.entries(decisionLabel).map(([v,l])=>`<option value="${v}" ${p.decision===v?'selected':''}>${l}</option>`).join('')}</select></div></div>${originPicker(p.circles)}<div class="field"><label for="person-note">기억해 둘 이야기</label><textarea id="person-note" name="note" maxlength="500" placeholder="초대를 고민하는 이유나, 함께 만나면 좋을 사람 등">${esc(p.note)}</textarea></div>
  ${giftFields(p)}
  ${others.length?`<div class="field"><label for="relation-search">이 사람과 다른 사람들의 관계</label><p class="relation-help">‘아는 사이’는 서로 아는 관계, ‘따로 만나기’는 같은 모임에서 제외할 관계예요. 양쪽에 함께 반영됩니다.</p><input id="relation-search" placeholder="관계를 설정할 사람 검색" aria-label="관계 목록 검색"><div class="relationship-list">${others.map(o=>`<div class="relationship-row" data-relation-name="${esc(o.name.toLowerCase())}">${avatar(o)}<label for="rel-${o.id}">${esc(o.name)}</label><select id="rel-${o.id}" name="rel-${o.id}">${[['','미확인'],['know','아는 사이'],['avoid','따로 만나기']].map(([v,l])=>`<option value="${v}" ${relation(state,id,o.id)===v?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div></div>`:'<p class="helper">다음 사람을 추가할 때 서로의 관계를 연결할 수 있어요.</p>'}
  </div><div id="form-error" class="form-error" role="alert"></div></div><div class="modal-actions">${existing?`<button type="button" class="text-btn left" data-action="delete-person" data-id="${id}">이 사람 삭제</button>`:''}<button type="button" class="btn secondary" data-action="close-modal">취소</button><button class="btn primary" type="submit">${existing?'변경 저장':'명단에 추가'}</button></div></form>`);
  $('#person-form').onsubmit=e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget), name=String(fd.get('name')).trim();
    if(!name){$('#form-error').textContent='이름을 입력해 주세요.';return;}
    if($('#new-origin-name').value.trim()){$('#form-error').textContent='입력 중인 새 이름의 ‘추가’를 눌러 선택하거나, 입력란을 비워 주세요.';$('#new-origin-name').focus();return;}
    const circles=[...new Set(fd.getAll('circles'))];
    if(circles.length>12||circles.some(c=>!state.origins.some(o=>o.name===c))){$('#form-error').textContent='알게 된 곳은 목록에서 최대 12개까지 선택해 주세요.';return;}
    let record;try{record=giftRecord(fd);}catch(err){$('#form-error').textContent=err.message;return;}
    const pid=id||crypto.randomUUID(), next=structuredClone(state);
    const entry={id:pid,name,circles,decision:fd.get('decision'),note:String(fd.get('note')).trim(),...record};
    if(existing)next.people[next.people.findIndex(x=>x.id===id)]=entry;else next.people.push(entry);
    others.forEach(o=>{const key=pairKey(pid,o.id), val=fd.get(`rel-${o.id}`);if(val)next.relations[key]=val;else delete next.relations[key];});
    persist(next);initializeDraft();closeModal();render();toast(existing?'사람과 관계를 저장했어요.':'소중한 사람을 명단에 추가했어요.');
  };
  $('#relation-search')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('[data-relation-name]').forEach(row=>row.classList.toggle('hidden',!row.dataset.relationName.includes(q)));});
}
function meetingModal(id){
  const existing=id?state.meetings.find(m=>m.id===id):null;
  const m=existing||{title:groupTitle(ui.selected),members:[...ui.selected],date:'',place:'',note:'',status:'planned'};
  openModal(existing?'모임의 약속 정리':'이 조합으로 모임 저장',`<form id="meeting-form"><div class="modal-body"><p class="helper">날짜와 장소는 비워두어도 좋아요. 정해지면 언제든 수정할 수 있어요.</p><div class="modal-fields"><div class="field"><label for="meeting-title">모임 이름 *</label><input id="meeting-title" name="title" value="${esc(m.title)}" maxlength="80" required autofocus></div><div class="form-two"><div class="field"><label for="meeting-date">날짜와 시간 <span class="small-label">· 한국 시간</span></label><input id="meeting-date" name="date" type="datetime-local" value="${esc(m.date)}"></div><div class="field"><label for="meeting-place">장소</label><input id="meeting-place" name="place" value="${esc(m.place)}" maxlength="100" placeholder="예: 성수역 근처 식당"></div></div><div class="field"><label for="meeting-note">모임 메모</label><textarea id="meeting-note" name="note" maxlength="500" placeholder="예약할 때 챙길 점, 전하고 싶은 이야기">${esc(m.note)}</textarea></div><div><div class="field-label">함께할 사람 <span class="small-label">· 나를 제외한 초대 인원, 최대 12명</span></div><div class="relationship-list">${state.people.filter(p=>p.decision!=='skip'||m.members.includes(p.id)).map(p=>`<label class="member-select"><input type="checkbox" name="members" value="${p.id}" ${m.members.includes(p.id)?'checked':''}>${avatar(p)}${esc(p.name)}${p.decision!=='invite'?`<span class="tag warm">${decisionLabel[p.decision]}</span>`:''}</label>`).join('')}</div></div></div><div id="meeting-advice"></div><div id="form-error" class="form-error" role="alert"></div></div><div class="modal-actions">${existing?`<button type="button" class="text-btn left" data-action="delete-meeting" data-id="${id}">모임 삭제</button>`:''}<button type="button" class="btn secondary" data-action="close-modal">취소</button><button type="submit" class="btn primary">모임 저장</button></div></form>`);
  const advice=()=>{const ids=new FormData($('#meeting-form')).getAll('members'),s=groupSummary(state,ids);$('#meeting-advice').innerHTML=s.isolated.length?`<div class="warning">${esc(peopleNames(s.isolated))} 님은 이 모임에서 확인된 아는 사이가 없어요. 함께 만나도 괜찮을지 확인해 주세요.</div>`:'';};
  $('#meeting-form').addEventListener('change',advice);advice();
  $('#meeting-form').onsubmit=e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget),title=String(fd.get('title')).trim(),members=fd.getAll('members'),summary=groupSummary(state,members);
    if(!title||!members.length||members.length>12){$('#form-error').textContent='모임 이름과 1~12명의 초대 인원을 선택해 주세요.';return;}
    if(summary.conflicts.length){$('#form-error').textContent=`${summary.conflicts.map(pair=>peopleNames(pair)).join(' / ')} 님은 따로 만나기로 한 관계예요. 한 사람을 빼거나 사람 목록에서 관계를 변경해 주세요.`;return;}
    const next=structuredClone(state), entry={id:id||crypto.randomUUID(),title,members,date:String(fd.get('date')),place:String(fd.get('place')).trim(),note:String(fd.get('note')).trim(),status:m.status};
    if(existing)next.meetings[next.meetings.findIndex(x=>x.id===id)]=entry;else next.meetings.push(entry);
    persist(next);initializeDraft();ui.page='meetings';ui.meetingFilter='all';closeModal();render();toast('모임을 저장했어요.');
  };
}
function dataModal(){
  openModal('나의 명단과 백업',`<div class="modal-body"><p class="helper">명단은 현재 브라우저에 저장됩니다. 다른 브라우저·기기와 자동으로 동기화되지 않으며, 브라우저 데이터를 지우면 사라질 수 있어요.</p><div class="data-row"><div><h3>내 데이터 백업</h3><p>사람 ${state.people.length}명 · 관계 ${Object.keys(state.relations).length}개 · 모임 ${state.meetings.length}개<br>알게 된 곳 ${state.origins.length}개와 축의금·관계 기록을 함께 저장해요.</p></div><button class="btn secondary small" data-action="export">${icon('download',14)}내려받기</button></div><div class="data-row"><div><h3>백업에서 복원</h3><p>선택한 백업 파일로 현재 명단 전체를 바꿉니다.</p></div><button class="btn secondary small" data-action="import">${icon('upload',14)}불러오기</button></div><div class="data-row"><div><h3>${state.demo?'내 명단 시작하기':'예시로 둘러보기'}</h3><p>${state.demo?'가상의 예시 명단을 비우고 새로 시작해요.':'현재 명단을 예시로 바꿉니다. 먼저 백업해 주세요.'}</p></div><button class="btn secondary small" data-action="${state.demo?'start':'load-demo'}">${state.demo?'새로 시작':'예시 보기'}</button></div></div>`,`<div class="modal-actions"><button class="btn primary" data-action="close-modal">확인</button></div>`);
}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`청모-${state.demo?'예시-':''}백업-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('백업 파일을 내려받았어요.');
}
function startOwn(){confirmDialog('나만의 명단을 시작할까요?','예시 사람과 모임을 비우고, 내 사람들을 등록합니다. 저장해 둔 ‘알게 된 곳’ 목록은 유지해요.\n예시에서 바꾼 내용을 남기려면 먼저 백업해 주세요.','내 명단 시작',()=>{protectUnreadable=false;persist({...emptyData(),origins:state.origins});ui.page='people';ui.search='';ui.circle='all';ui.decision='all';initializeDraft();render();personModal();});}
async function copyMeeting(id){
  const m=state.meetings.find(x=>x.id===id);if(!m)return;
  const text=`[${m.title}]\n좋은 소식을 직접 전하고 싶어서 작은 자리를 준비했어요. 편하게 만나서 이야기 나눠요!\n\n함께할 사람: ${peopleNames(m.members)}, 나\n일시: ${m.date?dateLabel(m.date):'함께 정해요'}\n장소: ${m.place||'함께 정해요'}`;
  try{await navigator.clipboard.writeText(text);toast('안내문을 복사했어요. 원하는 곳에 직접 붙여넣어 주세요.');}
  catch{openModal('모임 안내문',`<div class="modal-body"><p class="helper">아래 문장을 선택해 복사해 주세요. 개인 메모와 관계 정보는 포함하지 않았어요.</p><div class="field"><textarea rows="9" readonly id="copy-text" aria-label="복사할 모임 안내문">${esc(text)}</textarea></div></div>`,`<div class="modal-actions"><button class="btn primary" data-action="close-modal">닫기</button></div>`);$('#copy-text').select();}
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el||el.disabled)return;
  const action=el.dataset.action,id=el.dataset.id;
  if(action==='nav'){ui.page=el.dataset.page;render();window.scrollTo({top:0});}
  else if(action==='recommend'){initializeDraft();render();toast(ui.selected.length<ui.capacity?'확인된 아는 사이만 연결했어요. 관계를 더 등록하면 조합이 넓어져요.':'서로 아는 사람들로 조합했어요.');}
  else if(action==='toggle-person'){
    if(ui.selected.includes(id))ui.selected=ui.selected.filter(x=>x!==id);
    else{if(ui.selected.length>=ui.capacity){toast('초대 인원을 늘리거나 한 사람을 빼 주세요.');return;}if(candidateInfo(state,id,ui.selected).conflicts.length)return;ui.selected.push(id);}
    render();
  }
  else if(action==='more'){ui.more=!ui.more;render();}
  else if(action==='add-origin')originModal();
  else if(action==='edit-origin')originModal(id);
  else if(action==='inline-add-origin')inlineAddOrigin();
  else if(action==='origin-people'){const o=state.origins.find(o=>o.id===id);ui.page='people';ui.circle=o.name;ui.search='';ui.decision='all';render();window.scrollTo({top:0});}
  else if(action==='origin-add-person'){const o=state.origins.find(o=>o.id===id);personModal(undefined,[o.name]);}
  else if(action==='delete-origin'){
    const o=state.origins.find(o=>o.id===id);if(!o)return;
    confirmDialog('이 항목을 삭제할까요?',`${o.name} 항목을 선택 목록에서 삭제합니다. 연결된 사람이 없는 항목만 삭제할 수 있어요.`,'항목 삭제',()=>{try{persist(removeOrigin(state,id));if(ui.circle===o.name)ui.circle='all';render();toast('선택 목록에서 삭제했어요.');}catch(err){toast(err.message);}},true);
  }
  else if(action==='add-person')personModal();
  else if(action==='edit-person')personModal(id);
  else if(action==='edit-gift')giftModal(id);
  else if(action==='save-draft'){if(ui.selected.length)meetingModal();}
  else if(action==='edit-meeting')meetingModal(id);
  else if(action==='close-modal')closeModal();
  else if(action==='data')dataModal();
  else if(action==='start')startOwn();
  else if(action==='export')exportData();
  else if(action==='import')$('#import-file').click();
  else if(action==='load-demo')confirmDialog('예시 명단으로 바꿀까요?','현재 명단과 모임이 예시 데이터로 교체돼요. 내 데이터를 보관하려면 먼저 백업을 내려받아 주세요.','예시로 바꾸기',()=>{protectUnreadable=false;persist(demoData());ui.page='builder';initializeDraft();render();});
  else if(action==='clear-filters'){ui.search='';ui.circle='all';ui.decision='all';render();}
  else if(action==='clear-ledger'){ui.ledgerSearch='';ui.ledgerFilter='all';render();}
  else if(action==='meeting-filter'){ui.meetingFilter=el.dataset.filter;render();}
  else if(action==='toggle-done'){const next=structuredClone(state),m=next.meetings.find(m=>m.id===id);m.status=m.status==='done'?'planned':'done';persist(next);render();toast(m.status==='done'?'반가운 만남으로 기록했어요.':'만날 예정으로 변경했어요.');}
  else if(action==='copy-meeting')void copyMeeting(id);
  else if(action==='delete-meeting')confirmDialog('이 모임을 삭제할까요?','모임만 삭제되며, 사람과 관계 정보는 명단에 남습니다.','모임 삭제',()=>{const next=structuredClone(state);next.meetings=next.meetings.filter(m=>m.id!==id);persist(next);initializeDraft();render();toast('모임을 삭제했어요.');},true);
  else if(action==='delete-person'){
    const p=person(id),affected=state.meetings.filter(m=>m.members.includes(id));
    confirmDialog(`${p.name} 님을 삭제할까요?`,`명단과 이 사람의 관계 정보가 삭제됩니다.${affected.length?`\n참여 중인 모임 ${affected.length}개에서도 빠지며, 인원이 없어지는 모임은 함께 삭제돼요.`:''}`,'사람 삭제',()=>{const next=structuredClone(state);next.people=next.people.filter(p=>p.id!==id);Object.keys(next.relations).forEach(key=>{if(key.split('|').includes(id))delete next.relations[key];});next.meetings=next.meetings.map(m=>({...m,members:m.members.filter(x=>x!==id)})).filter(m=>m.members.length);persist(next);initializeDraft();render();toast('명단에서 삭제했어요.');},true);
  }
});
document.addEventListener('change',e=>{
  const id=e.target.id;
  if(['anchor','capacity','include-maybe','include-assigned'].includes(id)){
    if(id==='anchor')ui.anchor=e.target.value;
    if(id==='capacity')ui.capacity=Number(e.target.value);
    if(id==='include-maybe')ui.includeMaybe=e.target.checked;
    if(id==='include-assigned')ui.includeAssigned=e.target.checked;
    initializeDraft();render();
  }
  if(id==='circle-filter'||id==='decision-filter'){ui[id==='circle-filter'?'circle':'decision']=e.target.value;$('#people-results').innerHTML=peopleResults();}
  if(id==='ledger-filter'){ui.ledgerFilter=e.target.value;$('#ledger-results').innerHTML=ledgerResults();}
  if(id==='origin-type-filter'){ui.originType=e.target.value;$('#origin-results').innerHTML=originResults();}
  if(e.target.name==='circles'){
    const selected=new FormData($('#person-form')).getAll('circles');
    if(selected.length>12){e.target.checked=false;toast('한 사람에게는 최대 12개까지 선택할 수 있어요.');}
    $('#origin-selected-count').textContent=`${Math.min(selected.length,12)}개 선택`;
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='people-search'){ui.search=e.target.value;$('#people-results').innerHTML=peopleResults();}
  if(e.target.id==='ledger-search'){ui.ledgerSearch=e.target.value;$('#ledger-results').innerHTML=ledgerResults();}
  if(e.target.id==='origin-search'){ui.originSearch=e.target.value;$('#origin-results').innerHTML=originResults();}
  if(e.target.id==='origin-choice-search'){const q=originKey(e.target.value);document.querySelectorAll('[data-origin-choice]').forEach(label=>label.classList.toggle('hidden',!label.dataset.originChoice.includes(q)));}
});
document.addEventListener('keydown',e=>{if(e.target.id==='new-origin-name'&&e.key==='Enter'&&!e.isComposing){e.preventDefault();inlineAddOrigin();}});
$('#import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{
    if(file.size>5_000_000)throw new Error('백업 파일은 5MB 이내로 선택해 주세요.');
    const next=validateData(JSON.parse(await file.text()));
    confirmDialog('백업 파일로 복원할까요?',`현재 명단을 ${next.demo?'예시 ':''}사람 ${next.people.length}명, 모임 ${next.meetings.length}개의 백업으로 바꿉니다.\n현재 내용을 보관하려면 취소하고 먼저 백업해 주세요.`,'백업 복원',()=>{protectUnreadable=false;persist(next);ui.search='';ui.circle='all';ui.decision='all';ui.page='people';initializeDraft();render();toast('백업에서 명단을 복원했어요.');});
  }catch(err){toast(err instanceof SyntaxError?'올바른 JSON 백업 파일이 아니에요. 현재 데이터는 그대로 유지돼요.':err.message);}
});
// Prevent silent overwrites when the same planner is open in another tab.
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{state=e.newValue?validateData(JSON.parse(e.newValue)):emptyData();protectUnreadable=false;storageIssue='';closeModal();initializeDraft();render();toast('다른 탭의 변경 내용을 반영했어요.');}catch{storageIssue='다른 탭의 변경 내용을 읽지 못했어요. 현재 명단을 백업해 주세요.';protectUnreadable=true;render();}});
render();
