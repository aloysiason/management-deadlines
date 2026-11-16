const data = JSON.parse(document.querySelector('#conference-data').textContent);
const $ = (selector) => document.querySelector(selector);
const messages = {
  zh: {browse:'会议目录',about:'关于项目',eyebrow:'为管理学研究者打造',hero1:'不错过每一次',hero2:'学术机会。',intro:'追踪全球管理学学术会议的投稿截止日期、官方征稿通知与重要时间节点。以组织行为、人力资源管理、战略与组织理论为核心。',explore:'探索会议 ↓',calendar:'订阅全部截止日期 ↗',trust:'人工核验优先 · 来源透明 · 免费使用',nextDeadline:'下一个已确认的截止日期',viewDetails:'查看详情 →',countConferences:'已收录会议',countVerified:'有已核实截止日期',countCost:'使用费用',directoryLabel:'CONFERENCE DIRECTORY',directoryTitle:'发现你的下一场会议',directoryDesc:'截止日期由官方来源核实；未确认的日期不会被猜测或自动补全。',exportFavorites:'导出收藏日历 ↓',search:'搜索会议、学会、研究领域...',sortDate:'按截止日期',sortName:'按会议名称',tabAll:'全部',tabManagement:'管理学',tabEconomics:'经济学交叉',tabFavorites:'☆ 我的收藏',legend:'官方确认 / 待公布',emptyTitle:'暂无匹配的会议',emptyDesc:'尝试调整关键词或筛选条件。',aboutLabel:'BUILT FOR RESEARCHERS',aboutTitle:'少一点信息噪声，多一点研究时间。',aboutCopy:'Management Deadlines 是一项免费、独立的学术信息整理项目。我们为每场会议保留官方来源与数据状态；尚未发布的截止日期会明确标注为“待公布”。收藏仅保存在当前浏览器，不会上传个人数据。',github:'使用 GitHub 管理数据 ↗',footer:'Independent · Free · Source-first',unknown:'待公布',verified:'官方已确认',dateOnly:'日期已确认 · 截止时间待核实',pending:'待核实 / 待公布',official:'官方来源 ↗',addCalendar:'添加日历 ↓',deadline:'投稿截止',conferenceDate:'会议日期',time:'时间',days:'天',hours:'小时',allAreas:'全部研究领域',results:'场会议',noFavorites:'请先收藏至少一场有截止日期的会议。',groupUpcoming:'尚未截止',groupPending:'待公布 / 待核实',groupExpired:'已截止',expired:'已截止',notSpecified:'未公布',save:'收藏会议',remove:'取消收藏',countdownNote:'日期准确，时间未核实'},
  en: {browse:'Browse',about:'About',eyebrow:'MADE FOR MANAGEMENT SCHOLARS',hero1:'Never miss',hero2:'a research opportunity.',intro:'Conference deadlines, official calls for papers, and important dates in one quiet space. Focused on organizational behavior, HRM, strategy, and organization studies.',explore:'Explore conferences ↓',calendar:'Subscribe to deadlines ↗',trust:'Human-verified · Official sources · Always free',nextDeadline:'NEXT CONFIRMED DEADLINE',viewDetails:'View details →',countConferences:'Conferences listed',countVerified:'Confirmed deadlines',countCost:'Cost to use',directoryLabel:'CONFERENCE DIRECTORY',directoryTitle:'Find your next conference',directoryDesc:'Dates are verified against official sources. We never fabricate unannounced deadlines.',exportFavorites:'Export favorites calendar ↓',search:'Search conferences, societies, research areas...',sortDate:'By deadline',sortName:'By name',tabAll:'All',tabManagement:'Management',tabEconomics:'Economics crossover',tabFavorites:'☆ Saved',legend:'Officially confirmed / Awaiting update',emptyTitle:'No matching conferences',emptyDesc:'Try a different keyword or filter.',aboutLabel:'BUILT FOR RESEARCHERS',aboutTitle:'Less noise. More time for research.',aboutCopy:'Management Deadlines is a free independent academic information project. We preserve official sources and verification status for every conference. Unpublished deadlines are clearly marked as pending. Favorites stay in your browser only.',github:'Manage data with GitHub ↗',footer:'Independent · Free · Source-first',unknown:'To be announced',verified:'Officially verified',dateOnly:'Date verified · time unconfirmed',pending:'Unverified / Not announced',official:'Official source ↗',addCalendar:'Add to calendar ↓',deadline:'Submission deadline',conferenceDate:'Conference dates',time:'Time',days:'days',hours:'hours',allAreas:'All research areas',results:'conferences',noFavorites:'Save at least one conference with a published deadline first.',groupUpcoming:'Open deadlines',groupPending:'Unannounced / unverified',groupExpired:'Closed deadlines',expired:'Closed',notSpecified:'Not announced',save:'Save conference',remove:'Remove saved',countdownNote:'Date confirmed, precise time unknown'}
};
let lang = localStorage.getItem('md-lang') === 'en' ? 'en' : 'zh';
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem('md-favorites') || '[]')); } catch { favorites = new Set(); }
let filter = 'all';
const areas = [...new Set(data.flatMap(item => item.areas))].sort();
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Time-aware classification. Known times are checked in the conference's timezone.
// Date-only CFPs stay open through their listed calendar day in the viewer's timezone.
function deadlineGroup(c, now = new Date()) {
  if (!c.deadline) return 'pending';
  if (c.deadlineTime && c.timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: c.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(now);
      const val = type => parts.find(p => p.type === type).value;
      const localNow = `${val('year')}-${val('month')}-${val('day')}T${val('hour')}:${val('minute')}`;
      return localNow > `${c.deadline}T${c.deadlineTime}` ? 'expired' : 'upcoming';
    } catch { /* Invalid timezone: use the date-only fallback instead. */ }
  }
  const localDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return localDay > c.deadline ? 'expired' : 'upcoming';
}
const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const dayDate = s => s ? new Date(`${s}T00:00:00`) : null;
const dateLabel = s => s ? new Intl.DateTimeFormat(lang==='zh'?'zh-CN':'en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${s}T12:00:00Z`)) : messages[lang].unknown;
const getDays = s => s ? Math.ceil((dayDate(s)-todayStart())/86400000) : null;
function statusText(c) { return c.status==='confirmed' ? messages[lang].verified : c.status==='confirmed-date-only' ? messages[lang].dateOnly : messages[lang].pending; }
function generateICS(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const safe = s => String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const records = events.filter(c=>c.deadline).map(c=>{
    const date = c.deadline.replace(/-/g,'');
    const common = [`BEGIN:VEVENT`,`UID:${c.id}@management-deadlines.local`,`DTSTAMP:${stamp}`,`SUMMARY:${safe(c.acronym+' '+c.year+' — Submission Deadline')}`,`DESCRIPTION:${safe(c.name+' | '+c.officialUrl)}`,`URL:${c.officialUrl}`];
    if(c.deadlineTime && c.timezone) {
      const hm=c.deadlineTime.replace(':','');
      common.push(`DTSTART;TZID=${c.timezone}:${date}T${hm}00`,`DTEND;TZID=${c.timezone}:${date}T${hm}00`);
    } else {
      const next = new Date(`${c.deadline}T12:00:00Z`); next.setUTCDate(next.getUTCDate()+1);
      common.push(`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replace(/-/g,'')}`);
    }
    return [...common,'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Management Deadlines//Conference Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Management Deadlines',...records,'END:VCALENDAR'].join('\r\n')+'\r\n';
}
function downloadCalendar(events,name='conferences.ics') {
  const content=generateICS(events); const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function render() {
  const t=messages[lang]; document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]||el.textContent});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t[el.dataset.i18nPlaceholder]||'');
  $('#language').textContent=lang==='zh'?'EN':'中文';
  const chosen=$('#area').value;
  $('#area').replaceChildren(new Option(t.allAreas,'all'), ...areas.map(a=>new Option(a,a)));
  $('#area').value=chosen;
  $('#totalCount').textContent=data.length; $('#verifiedCount').textContent=data.filter(c=>c.deadline).length;
  $('#year').textContent=new Date().getFullYear();
  document.querySelectorAll('.tab').forEach(el=>{ const active=el.dataset.filter===filter;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});
  const query=$('#search').value.trim().toLocaleLowerCase();
  const byArea=$('#area').value;
  let found=data.filter(c=>(filter==='all'||(filter==='favorites'?favorites.has(c.id):c.discipline===filter))&&(byArea==='all'||c.areas.includes(byArea))&&[c.acronym,c.name,c.location,...c.areas].join(' ').toLowerCase().includes(query));
  const rank = {upcoming:0, pending:1, expired:2};
  found.sort((a,b)=>rank[deadlineGroup(a)]-rank[deadlineGroup(b)] ||
    ($('#sort').value==='name' ? a.name.localeCompare(b.name) :
      (a.deadline||'9999').localeCompare(b.deadline||'9999') || a.name.localeCompare(b.name)));
  $('#resultsCount').textContent=`${found.length} ${t.results}`; $('#emptyState').hidden=found.length!==0;
  const groupLabels = {upcoming:t.groupUpcoming,pending:t.groupPending,expired:t.groupExpired};
  const groups = ['upcoming','pending','expired'];
  $('#conferenceList').innerHTML=groups.map(group=>{
    const items=found.filter(c=>deadlineGroup(c)===group);
    if(!items.length)return '';
    const cards=items.map(c=>{
      const liked=favorites.has(c.id); const days=getDays(c.deadline); const expired=group==='expired';
      const dayText = c.deadline ? (expired?t.expired:(days===0?(lang==='zh'?'今天':'Today'):`${days} ${t.days}`)) : t.unknown;
      return `<article class="conference-card ${expired?'is-expired':''}"><div class="card-ident"><div class="acronym">${escapeHTML(c.acronym)}</div><button type="button" class="star ${liked?'active':''}" data-star="${escapeHTML(c.id)}" aria-label="${liked?t.remove:t.save}" title="${liked?t.remove:t.save}">${liked?'★':'☆'}</button></div><div class="card-main"><div class="card-kicker">${escapeHTML(c.discipline==='management'?'MANAGEMENT':'ECONOMICS')} <span>·</span> ${c.year}</div><h3>${escapeHTML(c.name)}</h3><div class="tags">${c.areas.map(a=>`<span>${escapeHTML(a)}</span>`).join('')}</div><div class="card-meta"><span>⌁ ${escapeHTML(c.location||t.notSpecified)}</span>${c.startsOn?`<span>◷ ${dateLabel(c.startsOn)}${c.endsOn?' – '+dateLabel(c.endsOn):''}</span>`:''}</div><div class="card-bottom"><a href="${escapeHTML(c.officialUrl)}" target="_blank" rel="noopener noreferrer">${t.official}</a>${c.deadline?`<button type="button" class="calendar-button" data-ics="${escapeHTML(c.id)}">${t.addCalendar}</button>`:''}</div></div><div class="card-deadline"><span class="deadline-caption">${t.deadline}</span><strong class="deadline-value">${c.deadline?dateLabel(c.deadline):t.unknown}</strong><span class="status ${c.status==='pending'?'pending':'verified'}"><i></i>${statusText(c)}</span><span class="days-indicator">${dayText}</span>${c.deadlineTime?`<small>${escapeHTML(c.deadlineTime)} · ${escapeHTML(c.timezone)}</small>`:''}</div></article>`;
    }).join('');
    return `<section class="deadline-group deadline-group-${group}" aria-label="${groupLabels[group]}"><div class="deadline-group-heading"><h3>${groupLabels[group]}</h3><span>${items.length}</span></div><div class="deadline-group-cards">${cards}</div></section>`;
  }).join('');
  document.querySelectorAll('[data-star]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.star; favorites.has(id)?favorites.delete(id):favorites.add(id); localStorage.setItem('md-favorites',JSON.stringify([...favorites])); render();}));
  document.querySelectorAll('[data-ics]').forEach(b=>b.addEventListener('click',()=>downloadCalendar(data.filter(c=>c.id===b.dataset.ics),b.dataset.ics+'.ics')));
  const next=data.filter(c=>deadlineGroup(c)==='upcoming').sort((a,b)=>a.deadline.localeCompare(b.deadline))[0];
  $('#featureAcronym').textContent=next?next.acronym+' '+next.year:'—'; $('#featureName').textContent=next?next.name:t.unknown;
  $('#countdown').textContent=next?`${getDays(next.deadline)} ${t.days}`:'—';
  $('#featureDate').textContent=next?dateLabel(next.deadline)+(next.deadlineTime?` · ${next.deadlineTime} ${next.timezone}`:''):t.pending;
  $('#featureStatus').textContent=next?statusText(next):t.pending;
}
$('#language').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';localStorage.setItem('md-lang',lang);render();});
$('#search').addEventListener('input',render);$('#area').addEventListener('change',render);$('#sort').addEventListener('change',render);
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;render();}));
$('#exportFavorites').addEventListener('click',()=>{const events=data.filter(c=>favorites.has(c.id)&&c.deadline);if(!events.length){alert(messages[lang].noFavorites);return;}downloadCalendar(events,'my-management-deadlines.ics');});
render();
