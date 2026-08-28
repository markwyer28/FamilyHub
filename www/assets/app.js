const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const ideas=['Spaghetti Bolognese','Chicken Curry','Tacos','Fish & Chips','Jacket Potatoes','Pizza','Sausage & Mash','Stir Fry','Fajitas','Roast Dinner'];
let events=[],shopping=[],mealRows=[],family=[],chores=[],periods=[],routines=[],notices=[],viewDate=new Date();
const iso=d=>{let x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
const monday=d=>{let x=new Date(d),n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);x.setHours(0,0,0,0);return x};
const api=async(type,body=null)=>{
 const key=`familyHubData:${type}`;let data=[];
 try{data=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(data))data=[]}catch(e){data=[]}
 if(!body)return data;const {action,item,id}=body;
 if(action==='add'&&item&&typeof item==='object'){const row={...item};if(!row.id)row.id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));row.updatedAt=new Date().toISOString();data.push(row)}
 else if(action==='update'&&id&&item&&typeof item==='object'){data=data.map(row=>row.id===id?{...row,...item,id,updatedAt:new Date().toISOString()}:row)}
 else if(action==='delete'&&id){data=data.filter(row=>row.id!==id)}
 else if(action==='replace'&&Array.isArray(item)){data=[...item]}
 else throw new Error('Unsupported local data action');
 localStorage.setItem(key,JSON.stringify(data));return data;
};
function choreResetKeys(){
 const now=new Date();
 const day=iso(now);
 const mon=monday(now);
 return {day,week:iso(mon)};
}
async function applyAutomaticChoreResets(){
 const keys=choreResetKeys();
 let lastDay=localStorage.getItem('familyChoresDailyReset');
 let lastWeek=localStorage.getItem('familyChoresWeeklyReset');
 // On first use, establish the current reset periods without unexpectedly clearing existing ticks.
 if(!lastDay){localStorage.setItem('familyChoresDailyReset',keys.day);lastDay=keys.day}
 if(!lastWeek){localStorage.setItem('familyChoresWeeklyReset',keys.week);lastWeek=keys.week}
 let changed=false;
 if(lastDay!==keys.day){
  for(const c of chores.filter(c=>c.schedule==='daily'&&c.done)){
   chores=await api('chores',{action:'update',id:c.id,item:{done:false}});changed=true;
  }
  localStorage.setItem('familyChoresDailyReset',keys.day);
 }
 if(lastWeek!==keys.week){
  for(const c of chores.filter(c=>c.schedule==='weekday'&&c.done)){
   chores=await api('chores',{action:'update',id:c.id,item:{done:false}});changed=true;
  }
  localStorage.setItem('familyChoresWeeklyReset',keys.week);
 }
 return changed;
}
async function loadAll(){try{[events,shopping,mealRows,family,chores,periods,routines,notices]=await Promise.all(['events','shopping','meals','family','chores','periods','routines','notices'].map(x=>api(x)));await applyAutomaticChoreResets();populateFamily();render()}catch(e){document.body.insertAdjacentHTML('afterbegin',`<div style="background:#b42318;color:white;padding:10px;text-align:center">Could not load Family Hub data: ${e.message}</div>`)}}
function populateFamily(){
 eventWhoOptions.innerHTML='';mealWhoOptions.innerHTML='';choreWhoOptions.innerHTML='';family.forEach((f,i)=>{eventWhoOptions.insertAdjacentHTML('beforeend',`<label class="person-check"><input type="checkbox" name="eventWho" value="${esc(f.name)}" ${i===0?'checked':''}><span class="member-dot" style="background:${f.color}"></span><span>${esc(f.name)}</span></label>`);mealWhoOptions.insertAdjacentHTML('beforeend',`<label class="person-check"><input type="checkbox" name="mealWho" value="${esc(f.name)}" ${i===0?'checked':''}><span class="member-dot" style="background:${f.color}"></span><span>${esc(f.name)}</span></label>`);choreWhoOptions.insertAdjacentHTML('beforeend',`<label class="person-check"><input type="checkbox" name="choreWho" value="${esc(f.name)}" ${i===0?'checked':''}><span class="member-dot" style="background:${f.color}"></span><span>${esc(f.name)}</span></label>`)});
 noticeWho.innerHTML='<option value="Family">Everyone</option>'+family.filter(f=>f.id!=='family').map(f=>`<option value="${esc(f.name)}">${esc(f.name)}</option>`).join('');
 memberChips.innerHTML=family.filter(f=>f.id!=='family').map(f=>`<span class="member-chip"><i class="member-dot" style="background:${f.color}"></i>${esc(f.name)}</span>`).join('');calendarLegend.innerHTML=family.map(f=>`<span class="legend-person"><i class="member-dot" style="background:${f.color}"></i>${esc(f.name)}</span>`).join('');mealLegend.innerHTML=family.map(f=>`<span class="legend-person"><i class="member-dot" style="background:${f.color}"></i>${esc(f.name)}</span>`).join('');
}
function nav(id){if(id==='calendar')viewDate=new Date();if(id==='settings'&&typeof loadSettingsPage==='function')loadSettingsPage();document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.go===id));render();requestAnimationFrame(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0;});}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>nav(b.dataset.go));
function eventHTML(e,withDate=false,deletable=false){let d=new Date(e.date+'T12:00:00');let people=Array.isArray(e.who)?e.who:[e.who||'Family'];let colors=people.map(name=>family.find(f=>f.name===name)?.color||'#7b8790');let fc=colors[0];let colorBar=colors.map(c=>`<i style="background:${c}"></i>`).join('');let whoText=people.join(', ');return `<div class="event" style="--member-color:${fc}"><span class="event-colors" aria-hidden="true">${colorBar}</span><span class="time">${withDate?d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric'}):e.time||'All day'}</span><div><b>${esc(e.title)}</b><br><small>${withDate?(e.time||'All day')+' · ':''}${esc(whoText)}${repeatLabel(e.repeat)?' · ↻ '+repeatLabel(e.repeat):''}</small></div>${deletable&&!e.virtual?`<button class="delete-btn" data-delete-event="${e.id}" aria-label="Delete ${esc(e.title)}">×</button>`:`<span class="pill">${esc(whoText)}</span>`}</div>`}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const repeatLabel=r=>({weekly:'Weekly',monthly:'Monthly',annually:'Annually','4weeks':'Every 4 weeks'}[r]||'');
function addMonthsSafe(date,months){let y=date.getFullYear(),m=date.getMonth()+months,day=date.getDate(),target=new Date(y,m,1,12);let last=new Date(target.getFullYear(),target.getMonth()+1,0,12).getDate();target.setDate(Math.min(day,last));return target}
function occurrences(e,from,to){
 let base=new Date(e.date+'T12:00:00'),out=[];
 if(!e.repeat||e.repeat==='none'){if(base>=from&&base<=to)out.push({...e,occurrenceDate:e.date});return out}
 let d=new Date(base),guard=0;
 while(d<from&&guard++<1000){
  if(e.repeat==='weekly')d.setDate(d.getDate()+7);
  else if(e.repeat==='4weeks')d.setDate(d.getDate()+28);
  else if(e.repeat==='monthly')d=addMonthsSafe(d,1);
  else if(e.repeat==='annually')d=addMonthsSafe(d,12); else break;
 }
 guard=0;while(d<=to&&guard++<1000){out.push({...e,date:iso(d),occurrenceDate:iso(d)});if(e.repeat==='weekly')d.setDate(d.getDate()+7);else if(e.repeat==='4weeks')d.setDate(d.getDate()+28);else if(e.repeat==='monthly')d=addMonthsSafe(d,1);else if(e.repeat==='annually')d=addMonthsSafe(d,12);else break}
 return out
}
// Normal family routines are editable and generated dynamically so holidays can pause them.
function routineBlocked(r,key){
 let active=periods.filter(p=>key>=p.start&&key<=p.end);
 if(active.some(p=>p.type==='familyholiday'))return true;
 if(r.kind==='school'&&active.some(p=>p.type==='holiday'))return true;
 return false;
}
function routineOccurrences(from,to){
 let out=[],d=new Date(from);d.setHours(12,0,0,0);
 for(;d<=to;d.setDate(d.getDate()+1)){let key=iso(d);
  routines.filter(r=>r.enabled!==false).forEach(r=>{if(key>=(r.start||'0000-00-00')&&(r.weekdays||[]).includes(d.getDay())&&!routineBlocked(r,key)){let dt=(r.dayTimes||{})[String(d.getDay())]||{};let tm=dt.start?(dt.start+(dt.end?'–'+dt.end:'')):'';out.push({id:r.id+'-'+key,title:r.title,date:key,time:tm,who:r.who,repeat:'',type:'routine',virtual:true,kind:r.kind})}});
 } return out;
}
function eventsBetween(from,to){return events.flatMap(e=>occurrences(e,from,to)).concat(routineOccurrences(from,to))}

const meals=()=>mealRows.reduce((o,x)=>{(o[x.date]??=[]).push(x);return o},{});
function renderHome(){
 let now=new Date(); renderNotices(now); let today=iso(now),start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0),end=new Date(start);end.setDate(end.getDate()+6);end.setHours(23,59,59,999);
 todayLabel.textContent=now.toLocaleDateString('en-GB',{weekday:'long',month:'long',day:'numeric'});dateNum.textContent=now.getDate();dateMon.textContent=now.toLocaleDateString('en-GB',{month:'short'});
 let next7=eventsBetween(start,end).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
 let te=next7.filter(e=>e.date===today);todayEvents.closest('article').style.display=te.length?'':'none';todayEvents.innerHTML=te.map(e=>eventHTML(e)).join('');
 let tomorrowDate=new Date(start);tomorrowDate.setDate(tomorrowDate.getDate()+1);let tomorrow=iso(tomorrowDate);let tme=next7.filter(e=>e.date===tomorrow);tomorrowEvents.closest('article').style.display=tme.length?'':'none';tomorrowEvents.innerHTML=tme.map(e=>eventHTML(e)).join('');
 // Work routines belong only in the Today and Tomorrow cards; keep them out of the Next 7 Days widget.
 let next7Visible=next7.filter(e=>!(e.type==='routine'&&e.kind==='work'));
 weekCount.textContent=next7Visible.length+' events';weekEvents.innerHTML=next7Visible.length?next7Visible.slice(0,10).map(e=>eventHTML(e,true)).join(''):'<div class="empty">No events in the next 7 days.</div>';
 let open=shopping.filter(x=>!x.done);shoppingPreview.closest('article').style.display=open.length?'':'none';shoppingPreview.innerHTML=open.slice(0,4).map(x=>`<div class="shoprow"><span>○</span><span>${esc(x.name)}</span><small>${esc(x.category)}</small></div>`).join('');
 let mm=meals(),m=monday(now);mealPreview.innerHTML=DAYS.map((day,i)=>{let d=new Date(m);d.setDate(d.getDate()+i);let rs=mm[iso(d)]||[];return `<div class="mealmini"><b>${day.slice(0,3)}</b><span>${rs.length?rs.map(r=>{let people=Array.isArray(r.who)?r.who:[r.who||'Family'];let dots=people.map(n=>`<i class="member-dot home-meal-dot" title="${esc(n)}" style="background:${family.find(f=>f.name===n)?.color||'#7b8790'}"></i>`).join('');return `<span class="home-meal-item"><span class="home-meal-dots">${dots}</span><span>${esc(r.name)}</span></span>`}).join(''):'Not planned'}</span></div>`}).join('');
 let openChores=chores.filter(c=>!c.done&&choreRelevantToday(c)).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));choresPreview.closest('article').style.display=openChores.length?'':'none';choresPreview.innerHTML=openChores.slice(0,4).map(c=>{let people=Array.isArray(c.who)?c.who:[c.who||'Family'];let dots=people.map(n=>`<i class="member-dot" title="${esc(n)}" style="background:${family.find(f=>f.name===n)?.color||'#7b8790'}"></i>`).join('');return `<div class="chore-row"><span>○</span><div class="chore-main"><b>${esc(c.name)}</b><small>${esc(choreScheduleText(c).replace(/^Due /,''))}</small></div><span class="member-badge chore-people-dots">${dots}</span></div>`}).join('');
}
function renderCalendar(){
 monthTitle.textContent=viewDate.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
 let first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(1-offset);
 calendarGrid.innerHTML='';let gridEnd=new Date(start);gridEnd.setDate(gridEnd.getDate()+41);let gridEvents=eventsBetween(start,gridEnd).filter(e=>!(e.type==='routine'&&e.kind==='work'));
 for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i);let key=iso(d),el=document.createElement('div');let activePeriods=periods.filter(p=>key>=p.start&&key<=p.end);el.className='day'+(d.getMonth()!=viewDate.getMonth()?' other':'')+(key===iso(new Date())?' today':'')+(gridEvents.some(e=>e.date===key)?' has':'')+(activePeriods.some(p=>p.type==='holiday')?' holiday-day':'')+(activePeriods.some(p=>p.type==='global')?' global-day':'')+(activePeriods.some(p=>p.type==='familyholiday')?' family-holiday-day':'');el.innerHTML=`<span class="daynum">${d.getDate()}</span>${activePeriods.length?`<span class="period-mark">${activePeriods.some(p=>p.type==='familyholiday')?'✈️':activePeriods.some(p=>p.type==='holiday')?'🏖':'🌍'}</span>`:''}<br>${(()=>{let names=[];gridEvents.filter(e=>e.date===key).forEach(e=>{let ps=Array.isArray(e.who)?e.who:[e.who||'Family'];ps.forEach(n=>{if(!names.includes(n))names.push(n)})});return names.slice(0,5).map(n=>`<i class="dot" title="${esc(n)}" style="background:${family.find(f=>f.name===n)?.color||'#7b8790'}"></i>`).join('')})()}`;el.onclick=()=>openEvent(key);calendarGrid.appendChild(el)}
 let monthStart=new Date(viewDate.getFullYear(),viewDate.getMonth(),1,0,0,0),monthEnd=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,0,23,59,59);let monthEvents=eventsBetween(monthStart,monthEnd).filter(e=>e.type!=='routine').sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
 allEvents.innerHTML=monthEvents.length?monthEvents.map(e=>eventHTML(e,true,true)).join(''):'<div class="empty">No events in this month.</div>';
 bindEventDeletes();
 let visiblePeriods=periods.filter(p=>p.end>=iso(new Date(viewDate.getFullYear(),viewDate.getMonth(),1))&&p.start<=iso(new Date(viewDate.getFullYear(),viewDate.getMonth()+1,0))).sort((a,b)=>a.start.localeCompare(b.start));
 periodList.innerHTML=visiblePeriods.length?visiblePeriods.map(p=>`<div class="period-row ${p.type}"><span class="period-icon">${p.type==='familyholiday'?'✈️':p.type==='holiday'?'🏖':'🌍'}</span><div><b>${esc(p.name)}</b><small>${new Date(p.start+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${new Date(p.end+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small></div><button class="delete-btn" data-delete-period="${p.id}">×</button></div>`).join(''):'<div class="empty">No holiday periods or global events this month.</div>';
 document.querySelectorAll('[data-delete-period]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this calendar period?'))return;periods=await api('periods',{action:'delete',id:b.dataset.deletePeriod});render()});
}
function bindEventDeletes(){document.querySelectorAll('[data-delete-event]').forEach(b=>b.onclick=async ev=>{ev.stopPropagation();if(!confirm('Delete this calendar event?'))return;try{events=await api('events',{action:'delete',id:b.dataset.deleteEvent});render()}catch(err){alert('Could not delete event: '+err.message)}})}
function renderShopping(){let done=shopping.filter(x=>x.done).length,p=shopping.length?Math.round(done/shopping.length*100):0;shopProgress.textContent=`${done} of ${shopping.length} items picked up`;progressBar.style.width=p+'%';shoppingList.innerHTML=shopping.map(x=>`<div class="shoprow ${x.done?'done':''}"><input type="checkbox" aria-label="Picked up ${esc(x.name)}" data-shop="${x.id}" ${x.done?'checked':''}><span class="shop-main">${esc(x.name)}</span><div class="shop-actions"><small>${esc(x.category)}</small><button class="delete-btn" data-delete-shop="${x.id}" aria-label="Remove ${esc(x.name)}">×</button></div></div>`).join('')||'<div class="empty">Your shopping list is empty.</div>';document.querySelectorAll('[data-shop]').forEach(c=>c.onchange=async()=>{shopping=await api('shopping',{action:'update',id:c.dataset.shop,item:{done:c.checked}});render()});document.querySelectorAll('[data-delete-shop]').forEach(b=>b.onclick=async()=>{shopping=await api('shopping',{action:'delete',id:b.dataset.deleteShop});render()})}
function renderChores(){
 let done=chores.filter(x=>x.done).length,p=chores.length?Math.round(done/chores.length*100):0;choreProgress.textContent=`${done} of ${chores.length} chores completed`;choreProgressBar.style.width=p+'%';
 let order=family.map(f=>f.name);
 choresList.className='chore-groups';
 choresList.innerHTML=order.map(name=>{
  let person=family.find(f=>f.name===name),fc=person?.color||'#7b8790';
  let items=chores.filter(c=>{let people=Array.isArray(c.who)?c.who:[c.who||'Family'];return people.includes(name)}).sort((a,b)=>(a.done-b.done)||((a.date||'9999').localeCompare(b.date||'9999')));
  return `<section class="chore-card"><div class="chore-card-head"><span class="member-dot large" style="background:${fc}"></span><div><h3>${esc(name)}</h3><small>${items.filter(x=>!x.done).length} to do</small></div></div><div>${items.length?items.map(c=>{let people=Array.isArray(c.who)?c.who:[c.who||'Family'];let dots=people.map(n=>`<i class="member-dot" title="${esc(n)}" style="background:${family.find(f=>f.name===n)?.color||'#7b8790'}"></i>`).join('');return `<div class="chore-row ${c.done?'done':''}"><input type="checkbox" data-chore="${c.id}" ${c.done?'checked':''} aria-label="Complete ${esc(c.name)}"><div class="chore-main"><b>${esc(c.name)}</b><small>${esc(choreScheduleText(c))} · <span class="chore-inline-dots">${dots}</span></small></div><button class="delete-btn" data-delete-chore="${c.id}" aria-label="Remove ${esc(c.name)}">×</button></div>`}).join(''):'<div class="empty small-empty">No chores</div>'}</div></section>`;
 }).join('');
 document.querySelectorAll('[data-chore]').forEach(c=>c.onchange=async()=>{chores=await api('chores',{action:'update',id:c.dataset.chore,item:{done:c.checked}});render()});
 document.querySelectorAll('[data-delete-chore]').forEach(b=>b.onclick=async()=>{chores=await api('chores',{action:'delete',id:b.dataset.deleteChore});render()});
}
function renderMeals(){
 let mm=meals(),m=monday(new Date());
 mealPlanner.innerHTML=DAYS.map((day,i)=>{
  let d=new Date(m);d.setDate(d.getDate()+i);let key=iso(d),rs=mm[key]||[];
  let rows=rs.length?rs.map(r=>{let people=Array.isArray(r.who)?r.who:[r.who||'Family'];let dots=people.map(n=>`<span class="member-dot" title="${esc(n)}" style="background:${family.find(f=>f.name===n)?.color||'#7b8790'}"></span>`).join('');return `<div class="meal-entry"><div class="meal-entry-main"><span class="meal-person-dots">${dots}</span><b>${esc(r.name)}</b><small>${esc(people.join(', '))}</small></div><button class="meal-remove" data-clear="${r.id}" aria-label="Remove ${esc(r.name)}">×</button></div>`}).join(''):'<span class="no-meal">No meals planned</span>';
  return `<div class="mealday"><b class="meal-day-title">${day}</b><div class="meal-entries">${rows}</div><button class="add-meal-day" data-mealdate="${key}">＋ Add meal</button></div>`;
 }).join('');
 document.querySelectorAll('[data-mealdate]').forEach(b=>b.onclick=()=>openMeal(b.dataset.mealdate));
 document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=async()=>{mealRows=await api('meals',{action:'delete',id:b.dataset.clear});render()});
}

function renderNotices(now=new Date()){
 let active=notices.filter(n=>!n.expiresAt||new Date(n.expiresAt)>now).sort((a,b)=>(a.expiresAt||'').localeCompare(b.expiresAt||''));
 noticeList.closest('article').style.display=active.length?'':'none';
 noticeList.innerHTML=active.length?active.map(n=>{let f=family.find(x=>x.name===(n.who||'Family'))||family.find(x=>x.id==='family');let exp=n.expiresAt?new Date(n.expiresAt):null;let label=exp?exp.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';return `<div class="notice-row" style="--notice-color:${f?.color||'#7b8790'}"><span class="notice-pin">${esc(n.emoji||'📌')}</span><div><b>${esc(n.text)}</b><small>${esc(n.who||'Family')} · expires ${esc(label)}</small></div><button class="delete-btn" data-delete-notice="${n.id}" aria-label="Remove notice">×</button></div>`}).join(''):'<div class="empty">No family notices.</div>';
 document.querySelectorAll('[data-delete-notice]').forEach(b=>b.onclick=async()=>{notices=await api('notices',{action:'delete',id:b.dataset.deleteNotice});render()});
}
function openNotice(){let now=new Date(),exp=new Date(now.getTime()+4*60*60*1000);noticeText.value='';noticeWho.value='Family';noticeEmoji.value='📌';noticeExpiryDate.value=iso(exp);noticeExpiryHour.value=String(exp.getHours()).padStart(2,'0');noticeExpiryMinute.value=['00','15','30','45'].reduce((a,x)=>Math.abs(+x-exp.getMinutes())<Math.abs(+a-exp.getMinutes())?x:a,'00');noticeDialog.showModal()}
newNotice.onclick=openNotice;addNoticeInline.onclick=openNotice;
saveNotice.onclick=async e=>{e.preventDefault();if(!noticeText.value.trim()||!noticeExpiryDate.value)return;let expiresAt=`${noticeExpiryDate.value}T${noticeExpiryHour.value}:${noticeExpiryMinute.value}:00`;if(new Date(expiresAt)<=new Date()){alert('Please choose an expiry time in the future.');return}try{notices=await api('notices',{action:'add',item:{text:noticeText.value.trim(),who:noticeWho.value,emoji:(noticeEmoji.options[noticeEmoji.selectedIndex]?.value||noticeEmoji.value||'📌'),expiresAt}});noticeDialog.close();render()}catch(err){alert('Could not save notice: '+err.message)}};

function render(){renderHome();renderCalendar();renderShopping();renderMeals();renderChores()}
if(!noticeExpiryHour.options.length){for(let h=0;h<24;h++)noticeExpiryHour.add(new Option(String(h).padStart(2,'0'),String(h).padStart(2,'0')))}
function openEvent(date=iso(new Date())){eventDate.value=date;eventTitle.value='';eventHour.value='';eventMinute.value='00';eventRepeat.value='none';document.querySelectorAll('input[name="eventWho"]').forEach((c,i)=>c.checked=i===0);eventDialog.showModal()}newEvent.onclick=()=>openEvent();saveEvent.onclick=async e=>{e.preventDefault();if(!eventTitle.value||!eventDate.value)return;let selectedPeople=[...document.querySelectorAll('input[name="eventWho"]:checked')];if(!selectedPeople.length){alert('Please select at least one person.');return}events=await api('events',{action:'add',item:{title:eventTitle.value,date:eventDate.value,time:eventHour.value ? eventHour.value+':'+eventMinute.value : '',who:[...document.querySelectorAll('input[name="eventWho"]:checked')].map(c=>c.value),repeat:eventRepeat.value}});eventDialog.close();render()};
newItem.onclick=()=>{itemName.value='';itemDialog.showModal()};saveItem.onclick=async e=>{e.preventDefault();if(!itemName.value)return;shopping=await api('shopping',{action:'add',item:{name:itemName.value,category:itemCategory.value,done:false}});itemDialog.close();render()};
function openMeal(date){mealDay.innerHTML='';let m=monday(new Date());DAYS.forEach((x,i)=>{let d=new Date(m);d.setDate(d.getDate()+i);mealDay.add(new Option(x,iso(d),false,date===iso(d)))});mealName.value='';document.querySelectorAll('input[name="mealWho"]').forEach((c,i)=>c.checked=i===0);mealDialog.showModal()}newMeal.onclick=()=>openMeal();saveMeal.onclick=async e=>{e.preventDefault();if(!mealName.value)return;let selected=[...document.querySelectorAll('input[name="mealWho"]:checked')].map(c=>c.value);if(!selected.length){alert('Please select at least one person.');return}mealRows=await api('meals',{action:'add',item:{name:mealName.value,date:mealDay.value,who:selected}});mealDialog.close();render()};
prevMonth.onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);renderCalendar()};nextMonth.onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);renderCalendar()};




const ROUTINE_DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function renderRoutineEditor(){
  routineRows.innerHTML=routines.map((r,i)=>{
    let who=(r.who||[])[0]||'', person=family.find(f=>f.name===who), initial=(person&&person.name?person.name.charAt(0):'?');
    return `<details class="routine-person" ${i===0?'open':''}><summary><span class="routine-avatar">${esc(initial)}</span><span class="routine-summary-text"><strong>${esc(who)}</strong><small>${esc(r.title)} · ${(r.weekdays||[]).length} days</small></span><span class="routine-chevron">›</span></summary><div class="routine-person-body"><div class="row"><label>Routine<input data-rtitle="${i}" value="${esc(r.title)}"></label><label>Type<select data-rkind="${i}"><option value="work" ${r.kind==='work'?'selected':''}>Work</option><option value="school" ${r.kind==='school'?'selected':''}>School</option></select></label></div><input type="hidden" data-rwho="${i}" value="${esc(who)}"><div class="routine-day-times">${ROUTINE_DAY_NAMES.map((n,d)=>{let active=(r.weekdays||[]).includes(d),dt=(r.dayTimes||{})[String(d)]||{};return `<div class="routine-day-row ${active?'day-active':''}"><label class="routine-day-toggle"><input type="checkbox" data-rday="${i}" value="${d}" ${active?'checked':''}><span>${n}</span></label><div class="routine-time-fields"><label>Start<input type="time" step="300" data-rtime-start="${i}-${d}" value="${dt.start||''}"></label><label>End<input type="time" step="300" data-rtime-end="${i}-${d}" value="${dt.end||''}"></label></div></div>`}).join('')}</div><div class="row"><label>Starts<input type="date" data-rstart="${i}" value="${r.start||''}"></label><label class="person-check routine-active"><input type="checkbox" data-renabled="${i}" ${r.enabled!==false?'checked':''}><span>Routine active</span></label></div></div></details>`
  }).join('');
  routineRows.querySelectorAll('[data-rday]').forEach(cb=>cb.addEventListener('change',()=>cb.closest('.routine-day-row').classList.toggle('day-active',cb.checked)));
}
manageRoutines.onclick=()=>{renderRoutineEditor();routineDialog.showModal()};
saveRoutines.onclick=async e=>{e.preventDefault();try{for(let i=0;i<routines.length;i++){let weekdays=[...document.querySelectorAll(`[data-rday="${i}"]:checked`)].map(x=>+x.value),dayTimes={};weekdays.forEach(d=>{dayTimes[String(d)]={start:document.querySelector(`[data-rtime-start="${i}-${d}"]`).value,end:document.querySelector(`[data-rtime-end="${i}-${d}"]`).value}});let item={title:document.querySelector(`[data-rtitle="${i}"]`).value.trim()||routines[i].title,who:[document.querySelector(`[data-rwho="${i}"]`).value],kind:document.querySelector(`[data-rkind="${i}"]`).value,start:document.querySelector(`[data-rstart="${i}"]`).value,weekdays,dayTimes,enabled:document.querySelector(`[data-renabled="${i}"]`).checked};routines=await api('routines',{action:'update',id:routines[i].id,item})}routineDialog.close();render()}catch(err){alert('Could not save routines: '+err.message)}};

newPeriod.onclick=()=>{periodName.value='';periodType.value='holiday';periodStart.value=iso(new Date());periodEnd.value=iso(new Date());periodDialog.showModal()};
savePeriod.onclick=async e=>{e.preventDefault();if(!periodName.value||!periodStart.value||!periodEnd.value)return;if(periodEnd.value<periodStart.value){alert('End date must be on or after the start date.');return}try{periods=await api('periods',{action:'add',item:{name:periodName.value.trim(),type:periodType.value,start:periodStart.value,end:periodEnd.value}});periodDialog.close();render()}catch(err){alert('Could not save period: '+err.message)}};


const WEEKDAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function choreScheduleText(c){
 if(c.schedule==='daily')return 'Daily';
 if(c.schedule==='weekday')return WEEKDAY_NAMES[Number(c.weekday)]||'Weekly';
 return c.date?'Due '+new Date(c.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'No due date';
}
function choreRelevantToday(c){
 let now=new Date(),today=iso(now);
 if(c.schedule==='daily')return true;
 if(c.schedule==='weekday')return Number(c.weekday)===now.getDay();
 return !c.date||c.date>=today;
}
function updateChoreScheduleFields(){
 choreDateWrap.classList.toggle('hidden-field',choreSchedule.value!=='date');
 choreWeekdayWrap.classList.toggle('hidden-field',choreSchedule.value!=='weekday');
}
choreSchedule.onchange=updateChoreScheduleFields;

function populateTimeSelectors(){eventHour.innerHTML='<option value="">No time</option>';for(let i=0;i<24;i++){let v=String(i).padStart(2,'0');eventHour.add(new Option(v,v))}}populateTimeSelectors();
function birthdayRow(){const row=document.createElement('div');row.className='birthday-row';row.innerHTML=`<label>Name<input class="birthday-name" placeholder="Name"></label><label>Birthday<input class="birthday-date" type="date"></label><button type="button" class="delete-btn birthday-remove" aria-label="Remove row">×</button>`;row.querySelector('.birthday-remove').onclick=()=>{if(birthdayRows.children.length>1)row.remove();else{row.querySelector('.birthday-name').value='';row.querySelector('.birthday-date').value=''}};birthdayRows.appendChild(row)}
function openBirthdays(){birthdayRows.innerHTML='';birthdayRow();birthdayRow();birthdayRow();birthdayDialog.showModal()}
newBirthday.onclick=openBirthdays;addBirthdayRow.onclick=birthdayRow;
saveBirthdays.onclick=async e=>{e.preventDefault();let rows=[...birthdayRows.querySelectorAll('.birthday-row')].map(r=>({name:r.querySelector('.birthday-name').value.trim(),date:r.querySelector('.birthday-date').value})).filter(x=>x.name&&x.date);if(!rows.length){birthdayDialog.close();return}try{for(const b of rows){events=await api('events',{action:'add',item:{title:'🎂 '+b.name+' Birthday',date:b.date,time:'',who:'Family',repeat:'annually',type:'birthday'}})}birthdayDialog.close();render()}catch(err){alert('Could not save birthdays: '+err.message)}};

resetDailyChores.onclick=async()=>{
 const completedDaily=chores.filter(c=>c.schedule==='daily'&&c.done);
 if(!completedDaily.length){alert('There are no completed daily chores to reset.');return}
 if(!confirm(`Reset ${completedDaily.length} completed daily chore${completedDaily.length===1?'':'s'} back to undone?`))return;
 try{
  for(const c of completedDaily){chores=await api('chores',{action:'update',id:c.id,item:{done:false}})}
  render();
 }catch(err){alert('Could not reset daily chores: '+err.message)}
};
resetWeeklyChores.onclick=async()=>{
 const completedWeekly=chores.filter(c=>c.schedule==='weekday'&&c.done);
 if(!completedWeekly.length){alert('There are no completed weekly chores to reset.');return}
 if(!confirm(`Reset ${completedWeekly.length} completed weekly chore${completedWeekly.length===1?'':'s'} back to undone?`))return;
 try{
  for(const c of completedWeekly){chores=await api('chores',{action:'update',id:c.id,item:{done:false}})}
  render();
 }catch(err){alert('Could not reset weekly chores: '+err.message)}
};
newChore.onclick=()=>{choreName.value='';choreSchedule.value='date';choreDate.value=iso(new Date());choreWeekday.value=String(new Date().getDay());updateChoreScheduleFields();document.querySelectorAll('input[name="choreWho"]').forEach((c,i)=>c.checked=i===0);choreDialog.showModal()};
saveChore.onclick=async e=>{e.preventDefault();if(!choreName.value)return;let selected=[...document.querySelectorAll('input[name="choreWho"]:checked')].map(c=>c.value);if(!selected.length){alert('Please select at least one person.');return}let schedule=choreSchedule.value;if(schedule==='date'&&!choreDate.value){alert('Please select a date.');return}try{for(const person of selected){chores=await api('chores',{action:'add',item:{name:choreName.value,who:person,schedule:schedule,date:schedule==='date'?choreDate.value:'',weekday:schedule==='weekday'?Number(choreWeekday.value):null,done:false}})}choreDialog.close();render()}catch(err){alert('Could not save chore: '+err.message)}};


document.querySelectorAll('.cancel-dialog').forEach(btn=>btn.addEventListener('click',()=>{
 const dlg=btn.closest('dialog');
 dlg.querySelectorAll('input').forEach(i=>{if(i.type!=='date')i.value='';});
 dlg.close();
}));

let refreshTimer=null;
async function refreshDashboard(){
 if(document.querySelector('dialog[open]')) return;
 await loadAll();
 if(typeof loadWeather==='function') loadWeather();
}
function displayCfg(){try{return Object.assign({saverDelay:10,saverRotate:1,refresh:5},JSON.parse(localStorage.getItem('familyDisplaySettings')||'{}'))}catch(e){return {saverDelay:10,saverRotate:1,refresh:5}}}
function startRefresh(){
 if(refreshTimer) clearInterval(refreshTimer);
 refreshTimer=setInterval(refreshDashboard,Math.max(1,Number(displayCfg().refresh)||5)*60000);
}
window.addEventListener('family-display-settings-changed',startRefresh);
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden) refreshDashboard();
});
loadAll();startRefresh();
/* Settings + complete JSON backup / restore */
const BACKUP_TYPES=['events','shopping','meals','family','chores','periods','routines','notices'];
function loadSettingsPage(){
 const c=displayCfg();
 settingSaverDelay.value=String(c.saverDelay||10);
 settingSaverRotate.value=String(c.saverRotate||1);
 settingRefresh.value=String(c.refresh||5);
}
settingsRoutines.onclick=()=>{renderRoutineEditor();routineDialog.showModal()};
settingsFamily.onclick=()=>{renderFamilyManager();familyDialog.showModal()};
settingsWeather.onclick=()=>weatherSettings.click();
saveDisplaySettings.onclick=()=>{
 const cfg={saverDelay:Number(settingSaverDelay.value),saverRotate:Number(settingSaverRotate.value),refresh:Number(settingRefresh.value)};
 localStorage.setItem('familyDisplaySettings',JSON.stringify(cfg));
 window.dispatchEvent(new Event('family-display-settings-changed'));
 backupStatus.textContent='Display settings saved.';
};
downloadBackup.onclick=async()=>{
 try{
  backupStatus.textContent='Preparing backup…';
  const values=await Promise.all(BACKUP_TYPES.map(t=>api(t)));
  const data={format:'FamilyHubBackup',version:1,createdAt:new Date().toISOString(),data:Object.fromEntries(BACKUP_TYPES.map((t,i)=>[t,values[i]])),settings:{weather:weatherCfg(),display:displayCfg()}};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
  const d=new Date(),stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  a.href=URL.createObjectURL(blob);a.download=`FamilyHub-${stamp}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  backupStatus.textContent='Backup downloaded.';
 }catch(err){backupStatus.textContent='Backup failed: '+err.message}
};
startAgain.onclick=async()=>{
 if(!confirm('Start again with Family Hub? This will permanently delete ALL family members, events, meals, chores, shopping, routines, holidays and notices.'))return;
 if(!confirm('Are you absolutely sure? This cannot be undone unless you have downloaded a backup.'))return;
 try{
  backupStatus.textContent='Clearing Family Hub…';
  for(const type of BACKUP_TYPES) await api(type,{action:'replace',item:[]});
  localStorage.removeItem('familyWeather');
  localStorage.removeItem('familyWeatherCache');
  localStorage.removeItem('familyDisplaySettings');
  localStorage.removeItem('familyChoresDailyReset');
  localStorage.removeItem('familyChoresWeeklyReset');
  await loadAll();
  loadSettingsPage();
  window.dispatchEvent(new Event('family-display-settings-changed'));
  loadWeather(true);
  backupStatus.textContent='Family Hub cleared. You can now add your family from scratch.';
  alert('Family Hub has been cleared. You can now start again from scratch.');
 }catch(err){backupStatus.textContent='Could not clear Family Hub: '+err.message}
};
chooseRestore.onclick=()=>restoreFile.click();
restoreFile.onchange=async()=>{
 const file=restoreFile.files&&restoreFile.files[0];if(!file)return;
 try{
  const backup=JSON.parse(await file.text());
  if(backup.format!=='FamilyHubBackup'||!backup.data)throw new Error('This is not a valid Family Hub backup.');
  if(!confirm('Restore this backup? Current Family Hub data will be replaced.')){restoreFile.value='';return}
  backupStatus.textContent='Restoring backup…';
  for(const type of BACKUP_TYPES){if(!Array.isArray(backup.data[type]))throw new Error('Backup is missing '+type);await api(type,{action:'replace',item:backup.data[type]})}
  if(backup.settings?.weather)localStorage.setItem('familyWeather',JSON.stringify(backup.settings.weather));
  if(backup.settings?.display)localStorage.setItem('familyDisplaySettings',JSON.stringify(backup.settings.display));
  localStorage.removeItem('familyWeatherCache');
  window.dispatchEvent(new Event('family-display-settings-changed'));
  await loadAll();loadSettingsPage();loadWeather(true);backupStatus.textContent='Backup restored successfully.';
 }catch(err){backupStatus.textContent='Restore failed: '+err.message}
 finally{restoreFile.value=''}
};
loadSettingsPage();

/* Free Open-Meteo weather — city lookup + today/tomorrow */
function weatherCfg(){try{return JSON.parse(localStorage.getItem('familyWeather')||'{}')}catch(e){return {}}}
const OPEN_METEO_CODES={0:['Clear','☀️'],1:['Mainly clear','🌤️'],2:['Partly cloudy','⛅'],3:['Overcast','☁️'],45:['Fog','🌫️'],48:['Rime fog','🌫️'],51:['Light drizzle','🌦️'],53:['Drizzle','🌦️'],55:['Heavy drizzle','🌧️'],61:['Light rain','🌦️'],63:['Rain','🌧️'],65:['Heavy rain','🌧️'],71:['Light snow','🌨️'],73:['Snow','❄️'],75:['Heavy snow','❄️'],80:['Rain showers','🌦️'],81:['Rain showers','🌧️'],82:['Heavy showers','⛈️'],95:['Thunderstorm','⛈️'],96:['Thunderstorm','⛈️'],99:['Thunderstorm','⛈️']};
function renderOpenMeteoDay(d,i,label){let code=Number(d.weather_code?.[i]),wd=OPEN_METEO_CODES[code]||['Forecast','🌤️'],hi=d.temperature_2m_max?.[i],lo=d.temperature_2m_min?.[i],rain=d.precipitation_probability_max?.[i];return `<div class="weather-day"><span class="weather-icon">${wd[1]}</span><div><b>${label}</b><small>${wd[0]}${rain!=null?' · '+Math.round(rain)+'% rain':''}</small></div><div class="weather-temp">${hi!=null?Math.round(hi)+'°':'—'}${lo!=null?`<small> / ${Math.round(lo)}°</small>`:''}</div></div>`}
async function loadWeather(force=false){let c=weatherCfg(),city=c.place||'Great Yarmouth';weatherLocation.textContent=city;let cached=null;try{cached=JSON.parse(localStorage.getItem('familyWeatherCache')||'null')}catch(e){}if(!force&&cached&&cached.city===city&&Date.now()-cached.at<30*60*1000){weatherLocation.textContent=cached.location||city;weatherContent.innerHTML=cached.html;return}weatherContent.innerHTML='<div class="weather-loading">Updating Open-Meteo forecast…</div>';try{let gr=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`),gj=await gr.json(),place=gj.results&&gj.results[0];if(!gr.ok||!place)throw new Error('City not found');let fr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`),fj=await fr.json();if(!fr.ok||!fj.daily)throw new Error('Forecast unavailable');let location=[place.name,place.admin1,place.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ');weatherLocation.textContent=location||city;let d=fj.daily||{},html=renderOpenMeteoDay(d,0,'Today')+renderOpenMeteoDay(d,1,'Tomorrow');weatherContent.innerHTML=html;localStorage.setItem('familyWeatherCache',JSON.stringify({at:Date.now(),city,location,html}))}catch(e){weatherContent.innerHTML=`<div class="weather-error"><b>Weather unavailable</b><br><small>${esc(e.message)}. Tap ⚙ to check the city.</small></div>`}}
weatherSettings.onclick=()=>{let c=weatherCfg();weatherPlace.value=c.place||'Great Yarmouth';weatherDialog.showModal()};
saveWeather.onclick=e=>{e.preventDefault();localStorage.setItem('familyWeather',JSON.stringify({place:weatherPlace.value.trim()||'Great Yarmouth'}));localStorage.removeItem('familyWeatherCache');weatherDialog.close();loadWeather(true)};
loadWeather();

function renderFamilyManager(){familyManagerRows.innerHTML=family.map(f=>`<div class="family-manager-row"><b>${esc(f.name)}</b><input type="color" value="${esc(f.color||'#7b8790')}" data-family-color="${esc(f.id)}" aria-label="${esc(f.name)} colour"><button type="button" class="delete-btn" data-family-delete="${esc(f.id)}" ${f.id==='family'?'disabled title="The Family group cannot be removed"':''}>×</button></div>`).join('')}
familyManagerRows.onchange=async e=>{let id=e.target.dataset.familyColor;if(!id)return;family=await api('family',{action:'update',id,item:{color:e.target.value}});populateFamily();render();renderFamilyManager()};
familyManagerRows.onclick=async e=>{let id=e.target.dataset.familyDelete;if(!id||id==='family')return;let f=family.find(x=>x.id===id);if(!f||!confirm(`Remove ${f.name} from the family list? Existing items will keep their name.`))return;family=await api('family',{action:'delete',id});populateFamily();render();renderFamilyManager()};
addFamilyMember.onclick=async()=>{let name=newFamilyName.value.trim();if(!name)return newFamilyName.focus();if(family.some(f=>f.name.toLowerCase()===name.toLowerCase()))return alert('That family member already exists.');
 // A shared Family group is created automatically with the first person.
 // Items assigned to Family mean everyone in the household, including people added later.
 if(!family.some(f=>f.id==='family'||f.name.toLowerCase()==='family')){family=await api('family',{action:'add',item:{id:'family',name:'Family',color:'#7b8790'}});}
 family=await api('family',{action:'add',item:{name,color:newFamilyColor.value}});newFamilyName.value='';populateFamily();render();renderFamilyManager()};

/* Screensaver: starts after 10 minutes of no interaction, bounces a 4:3 image,
   and rotates through every SVG in /assets once per minute. */
(()=>{
 const saver=document.getElementById('familyScreensaver'), img=document.getElementById('screensaverImage');
 if(!saver||!img)return;
 const idleMs=()=>Math.max(1,Number(displayCfg().saverDelay)||10)*60000, rotateMs=()=>Math.max(1,Number(displayCfg().saverRotate)||1)*60000;
 let idleTimer=null, rotateTimer=null, raf=null, last=0, x=28,y=28,vx=105,vy=82;
 let slides=['assets/screensaver.svg'], slideIndex=0;
 async function refreshSlides(){slides=["assets/1_20260824_202228_0000.svg", "assets/2_20260824_202228_0001.svg", "assets/3_20260824_202228_0002.svg", "assets/4_20260824_202228_0003.svg", "assets/5_20260824_202228_0004.svg", "assets/6_20260824_202228_0005.svg"];}
 function showSlide(i){
   if(!slides.length)return;
   slideIndex=((i%slides.length)+slides.length)%slides.length;
   img.src=slides[slideIndex]+'?v='+Date.now();
 }
 function beginRotation(){
   clearInterval(rotateTimer);
   rotateTimer=setInterval(async()=>{
     await refreshSlides();
     showSlide(slideIndex+1);
   },rotateMs());
 }
 function endRotation(){clearInterval(rotateTimer);rotateTimer=null}
 function schedule(){clearTimeout(idleTimer);idleTimer=setTimeout(start,idleMs())}
 function stop(){
   endRotation();
   if(!saver.classList.contains('active')){schedule();return}
   saver.classList.remove('active');if(raf)cancelAnimationFrame(raf);raf=null;last=0;schedule();
 }
 async function start(){
   if(document.querySelector('dialog[open]')){schedule();return}
   await refreshSlides();showSlide(slideIndex);
   saver.classList.add('active');
   const r=saver.getBoundingClientRect(), ir=img.getBoundingClientRect();
   x=Math.min(28,Math.max(0,r.width-ir.width));y=Math.min(28,Math.max(0,r.height-ir.height));
   last=performance.now();beginRotation();raf=requestAnimationFrame(step);
 }
 function step(t){
   if(!saver.classList.contains('active'))return;
   let dt=Math.min((t-last)/1000,.05);last=t;
   const r=saver.getBoundingClientRect(), ir=img.getBoundingClientRect(), mx=Math.max(0,r.width-ir.width),my=Math.max(0,r.height-ir.height);
   x+=vx*dt;y+=vy*dt;
   if(x<=0){x=0;vx=Math.abs(vx)}else if(x>=mx){x=mx;vx=-Math.abs(vx)}
   if(y<=0){y=0;vy=Math.abs(vy)}else if(y>=my){y=my;vy=-Math.abs(vy)}
   img.style.transform=`translate3d(${x}px,${y}px,0)`;raf=requestAnimationFrame(step);
 }
 ['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(saver.classList.contains('active'))stop();else schedule()},{passive:true}));
 saver.addEventListener('click',stop);
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=null;endRotation()}
   else if(saver.classList.contains('active')){last=performance.now();beginRotation();raf=requestAnimationFrame(step)}
   else schedule();
 });
 window.addEventListener('family-display-settings-changed',()=>{if(saver.classList.contains('active'))beginRotation();else schedule()});
 refreshSlides();schedule();
})();
