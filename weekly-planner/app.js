const KEY='weekly-planner-v1', $=s=>document.querySelector(s);
const DN=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const DS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MN=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
let tasks=load(), start=monday(new Date()), editing=null, ctx=null, delT=null, delD=null;

function load(){try{const v=JSON.parse(localStorage.getItem(KEY));return Array.isArray(v)?v:[]}catch(e){return[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(tasks))}catch(e){alert('Не удалось сохранить: хранилище браузера недоступно.')}}
const pad=n=>String(n).padStart(2,'0');
const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
function monday(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function occurs(t,ds){
  if(t.skip&&t.skip[ds])return false;
  if(ds<t.date||(t.until&&ds>t.until))return false;
  const d=parse(ds),s=parse(t.date),g=d.getDay();
  switch(t.repeat){
    case'daily':return true;
    case'weekdays':return g>0&&g<6;
    case'weekly':return(t.days&&t.days.length?t.days:[s.getDay()]).includes(g);
    case'monthly':return d.getDate()===s.getDate();
    case'yearly':return d.getMonth()===s.getMonth()&&d.getDate()===s.getDate();
    default:return ds===t.date;
  }
}

function render(){
  const end=addDays(start,6), w=$('#week'), todayS=fmt(new Date());
  $('#range').textContent=`${start.getDate()} ${start.getMonth()===end.getMonth()?'':MN[start.getMonth()]+' '}– ${end.getDate()} ${MN[end.getMonth()]} ${end.getFullYear()}`;
  w.innerHTML='';
  for(let i=0;i<7;i++){
    const d=addDays(start,i), ds=fmt(d);
    const el=document.createElement('section');
    el.className='day'+(i>4?' we':'')+(ds===todayS?' now':'');
    el.innerHTML=`<div class="dh"><b>${DN[i]}</b><span>${d.getDate()} ${MN[d.getMonth()]}</span></div><div class="list"></div>`;
    const list=el.querySelector('.list');
    tasks.filter(t=>occurs(t,ds)).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')).forEach(t=>{
      const done=!!(t.done&&t.done[ds]), r=t.repeat&&t.repeat!=='none';
      const row=document.createElement('div');
      row.className='t'+(done?' done':'')+(r?' rep':'');
      row.innerHTML=`<input type="checkbox" ${done?'checked':''} aria-label="Выполнено"><div><div class="n"></div><div class="m"></div></div><button type="button" class="x" aria-label="Удалить">×</button>`;
      row.querySelector('.n').textContent=t.title;
      row.querySelector('.x').onclick=e=>{e.stopPropagation();askDelete(t,ds)};
      row.querySelector('.m').textContent=[t.time&&t.timeEnd?t.time+'–'+t.timeEnd:t.time,r?'↻ повтор':'',t.note].filter(Boolean).join(' · ');
      row.querySelector('input').onclick=e=>{e.stopPropagation();t.done=t.done||{};if(e.target.checked)t.done[ds]=1;else delete t.done[ds];save();render()};
      row.onclick=()=>openDlg(t,ds);
      list.appendChild(row);
    });
    const b=document.createElement('button');b.className='add';b.textContent='+ Добавить';b.onclick=()=>openDlg(null,ds);
    el.appendChild(b);w.appendChild(el);
  }
}

function syncRepeat(){
  const r=$('#repeat').value;
  $('#daysBox').hidden=r!=='weekly';
  $('#untilBox').hidden=r==='none';
}
function openDlg(t,ds){
  editing=t;ctx=ds;
  $('#dlgTitle').textContent=t?'Редактировать задачу':'Новая задача';
  $('#title').value=t?t.title:'';
  $('#date').value=t?t.date:ds;
  $('#time').value=t&&t.time||'';
  $('#timeEnd').value=t&&t.timeEnd||'';
  $('#note').value=t&&t.note||'';
  $('#repeat').value=t&&t.repeat||'none';
  $('#until').value=t&&t.until||'';
  const sel=t&&t.days&&t.days.length?t.days:[parse($('#date').value).getDay()];
  document.querySelectorAll('#days input').forEach(c=>c.checked=sel.includes(+c.value));
  $('#del').hidden=!t;
  syncRepeat();$('#dlg').showModal();$('#title').focus();
}

$('#days').innerHTML=[1,2,3,4,5,6,0].map(n=>`<label><input type="checkbox" value="${n}">${DS[(n+6)%7]}</label>`).join('');
$('#repeat').onchange=syncRepeat;
$('#cancel').onclick=()=>$('#dlg').close();
$('#form').onsubmit=e=>{
  e.preventDefault();
  const rep=$('#repeat').value;
  const days=[...document.querySelectorAll('#days input:checked')].map(c=>+c.value);
  const data={title:$('#title').value.trim(),date:$('#date').value,time:$('#time').value,timeEnd:$('#timeEnd').value,note:$('#note').value.trim(),
    repeat:rep,days:rep==='weekly'?days:[],until:rep==='none'?'':$('#until').value};
  if(!data.title||!data.date)return;
  if(data.timeEnd&&!data.time){alert('Укажите время начала.');return}
  if(data.time&&data.timeEnd&&data.timeEnd<=data.time){alert('Окончание должно быть позже начала.');return}
  if(editing)Object.assign(editing,data);else tasks.push({id:uid(),done:{},...data});
  save();$('#dlg').close();render();
};
function askDelete(t,ds){
  if(t.repeat==='none'){
    if(confirm('Удалить задачу?')){tasks=tasks.filter(x=>x!==t);if($('#dlg').open)$('#dlg').close();save();render()}
    return;
  }
  delT=t;delD=ds;
  $('#delName').textContent=t.title;
  $('#delDlg').showModal();
}
$('#del').onclick=()=>askDelete(editing,ctx);
document.querySelectorAll('#delDlg [data-m]').forEach(b=>b.onclick=()=>{
  const m=b.dataset.m;
  $('#delDlg').close();
  if(m==='x'||!delT)return;
  if(m==='all')tasks=tasks.filter(x=>x!==delT);
  else{
    delT.skip=delT.skip||{};
    if(m==='day')delT.skip[delD]=1;
    else{const w=monday(parse(delD));for(let i=0;i<7;i++)delT.skip[fmt(addDays(w,i))]=1}
  }
  if($('#dlg').open)$('#dlg').close();
  save();render();
});
$('#prev').onclick=()=>{start=addDays(start,-7);render()};
$('#next').onclick=()=>{start=addDays(start,7);render()};
$('#today').onclick=()=>{start=monday(new Date());render()};
window.addEventListener('storage',e=>{if(e.key===KEY){tasks=load();render()}});
render();
