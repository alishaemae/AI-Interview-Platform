import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, ArrowUpCircle, LogOut, CheckCircle, Send, User, RefreshCw } from 'lucide-react';
import { supportAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const PRI={critical:'bg-red-100 text-red-600',high:'bg-orange-500/20 text-orange-400',medium:'bg-yellow-100 text-yellow-600',low:'bg-gray-300 text-gray-600'};
const ST={open:'bg-red-100 text-red-600',in_progress:'bg-yellow-100 text-yellow-600',closed:'bg-green-100 text-green-600'};
const STR={open:'Открыт',in_progress:'В работе',closed:'Решён'};
const CAT={general:'Общий вопрос',bug:'Ошибка',feature:'Предложение',account:'Аккаунт',question:'Вопрос'};
const CAT_ORDER=['bug','account','general','question','feature'];
const QUICK=[
  {l:'👋 Приветствие',t:'Здравствуйте! Спасибо за обращение в техподдержку. Изучаю вашу проблему.'},
  {l:'🔍 Проверяем',t:'Зафиксировали проблему, занимаемся решением. Ожидайте ответа.'},
  {l:'✅ Решено',t:'Проблема решена! Проверьте — всё должно работать.'},
  {l:'🔄 Перезапуск',t:'Попробуйте: закройте приложение, удалите interview_platform.db, запустите start.bat.'},
  {l:'📧 Email/код',t:'Проверьте «Спам». Если код не пришёл — нажмите «Отправить повторно».'},
  {l:'⬆️ Эскалация',t:'Обращение передано старшему специалисту. Ожидайте ответ до 24 часов.'},
  {l:'🐛 Баг принят',t:'Спасибо за баг-репорт! Добавили в трекер.'},
  {l:'❓ Уточнение',t:'Уточните: какой браузер/ОС и при каких действиях возникает ошибка?'},
];
export default function SupportDashboard(){
  const[tickets,setTickets]=useState([]);const[stats,setStats]=useState(null);const[sel,setSel]=useState(null);const[confirmAction,setConfirmAction]=useState(null);const[reply,setReply]=useState('');
  const[filter,setFilter]=useState('active');const[search,setSearch]=useState('');
  const navigate=useNavigate();const user=useAuthStore(s=>s.user);const logout=useAuthStore(s=>s.logout);
  useEffect(()=>{load();const i=setInterval(load,20000);return()=>clearInterval(i)},[]);
  const load=()=>{supportAPI.tickets().then(({data})=>setTickets(data)).catch(()=>{});supportAPI.myStats().then(({data})=>setStats(data)).catch(()=>{})};
  const sendReply=async()=>{if(!reply.trim()||!sel)return;const msg=reply;setReply('');await supportAPI.reply(sel.id,msg);load();setSel(p=>({...p,status:'in_progress',replies:[...(p.replies||[]),{user_name:user.full_name,message:msg,user_role:'support',created_at:new Date().toISOString()}]}))};
  const closeTicket=async id=>{await supportAPI.close(id);load();if(sel?.id===id)setSel(p=>({...p,status:'closed'}))};
  const filtered=tickets.filter(t=>{
    if(filter==='active'&&t.status==='closed')return false;
    if(filter==='closed'&&t.status!=='closed')return false;
    if(search&&!t.subject.toLowerCase().includes(search.toLowerCase())&&!t.user_name.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  // Group by category (like HR directions with separators)
  const sorted=[...filtered].sort((a,b)=>(CAT_ORDER.indexOf(a.category)===-1?99:CAT_ORDER.indexOf(a.category))-(CAT_ORDER.indexOf(b.category)===-1?99:CAT_ORDER.indexOf(b.category)));
  const renderList=()=>{let lastCat=null;const items=[];sorted.forEach(t=>{
    if(t.category!==lastCat){lastCat=t.category;items.push(<div key={`cat_${t.category}`} className="px-4 py-2 bg-gray-200/40 text-xs font-bold text-purple-600 uppercase">{CAT[t.category]||t.category}</div>)}
    items.push(<button key={t.id} onClick={()=>setSel(t)} className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-white transition ${sel?.id===t.id?'bg-white border-l-2 border-l-purple-500':''}`} title={`${t.subject} — ${STR[t.status]}`}>
      <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm truncate flex-1">{t.subject}</span><span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${ST[t.status]}`}>{STR[t.status]}</span></div>
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm text-gray-600">{t.user_name}</span><span className={`text-xs px-1.5 py-0.5 rounded ${PRI[t.priority]}`}>{t.priority}</span></div>
        <span className="text-xs text-gray-600">{t.replies?.length||0} отв.</span></div></button>)});return items};
  const urgentCount=tickets.filter(t=>t.status!=='closed'&&(t.priority==='high'||t.priority==='critical')).length;
  return(<div className="h-screen bg-gray-50 text-gray-900 flex overflow-hidden" style={{fontSize:'15px'}}>
    <div className="w-[420px] border-r border-gray-200 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200"><div className="flex items-center justify-between"><h2 className="text-lg font-bold flex items-center gap-2"><Headphones className="w-6 h-6 text-purple-600"/>Техподдержка</h2><button onClick={()=>{logout();navigate('/')}} className="text-gray-600 hover:text-gray-900" title="Выйти"><LogOut className="w-5 h-5"/></button></div><p className="text-sm text-gray-600 mt-1">{user?.full_name}</p></div>
      {stats&&<div className="px-4 py-3 border-b border-gray-200 grid grid-cols-4 gap-3 text-center">
        <div title="Активные обращения"><div className="text-2xl font-bold text-yellow-600">{stats.open_tickets}</div><div className="text-xs text-gray-600">Активных</div></div>
        <div title="Решённые"><div className="text-2xl font-bold text-green-600">{stats.closed_tickets}</div><div className="text-xs text-gray-600">Решено</div></div>
        <div title="Всего"><div className="text-2xl font-bold text-blue-600">{stats.total_tickets}</div><div className="text-xs text-gray-600">Всего</div></div>
        <div title="Срочные (high/critical)"><div className={`text-2xl font-bold ${urgentCount>0?'text-red-600':'text-gray-600'}`}>{urgentCount}</div><div className="text-xs text-gray-600">Срочных</div></div>
      </div>}
      <div className="px-3 py-2 border-b border-gray-200 space-y-2">
        <div className="flex gap-1">{[['active','Активные'],['closed','Закрытые'],['all','Все']].map(([k,l])=>
          <button key={k} onClick={()=>setFilter(k)} className={`flex-1 py-1.5 rounded text-sm ${filter===k?'bg-purple-600':'bg-white hover:bg-gray-50'}`}>{l}</button>)}</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm focus:border-purple-500 focus:outline-none" placeholder="Поиск по теме или имени..."/>
      </div>
      <div className="flex-1 overflow-y-auto">{sorted.length===0&&<div className="text-center py-10 text-gray-600">Нет обращений</div>}{renderList()}</div></div>
    <div className="flex-1 flex flex-col">{sel?(<>
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex-1"><h3 className="text-lg font-semibold">{sel.subject}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600"><User className="w-4 h-4"/><span>{sel.user_name}</span><span className={`px-2 py-0.5 rounded ${PRI[sel.priority]}`}>{sel.priority}</span><span className={`px-2 py-0.5 rounded ${ST[sel.status]}`}>{STR[sel.status]}</span><span>#{sel.id}</span><span className="px-2 py-0.5 rounded bg-gray-200">{CAT[sel.category]||sel.category}</span></div></div>
        <div className="flex gap-2">{sel.status!=='closed'&&<><button onClick={()=>setConfirmAction({title:'Эскалация тикета',message:`Передать тикет #${sel.id} администратору? Тикету будет присвоен приоритет "critical".`,danger:false,confirmText:'Передать',onConfirm:async()=>{await supportAPI.escalate(sel.id);load();setSel(p=>({...p,priority:'critical'}))}})} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm flex items-center gap-1" title="Передать администратору"><ArrowUpCircle className="w-4 h-4"/>Эскалация</button><button onClick={()=>setConfirmAction({title:'Закрытие тикета',message:`Закрыть тикет #${sel.id} «${sel.subject}»? Статус изменится на «closed».`,danger:false,confirmText:'Закрыть тикет',onConfirm:()=>closeTicket(sel.id)})} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-1" title="Отметить как решённое"><CheckCircle className="w-4 h-4"/>Решено</button></>}
          <button onClick={load} className="p-2 hover:bg-gray-50 rounded" title="Обновить"><RefreshCw className="w-4 h-4 text-gray-600"/></button></div></div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(100vh-280px)]">
        <div className="flex justify-start"><div className="max-w-[70%] px-5 py-4 rounded-2xl bg-gray-200 rounded-bl-md"><div className="text-sm text-gray-600 mb-1"><User className="w-3.5 h-3.5 inline mr-1"/>{sel.user_name}</div><div className="text-[15px] whitespace-pre-wrap">{sel.message}</div><div className="text-xs text-gray-600 mt-2">{new Date(sel.created_at).toLocaleString('ru')}</div></div></div>
        {sel.replies?.map((r,i)=>(<div key={i} className={`flex ${r.user_role==='support'||r.user_role==='admin'?'justify-end':'justify-start'}`}>
          <div className={`max-w-[70%] px-5 py-3 rounded-2xl ${r.user_role==='support'||r.user_role==='admin'?'bg-purple-600 rounded-br-md':'bg-gray-200 rounded-bl-md'}`}>
            {(r.user_role==='support'||r.user_role==='admin')&&<div className="text-sm opacity-70 mb-1"><Headphones className="w-3.5 h-3.5 inline mr-1"/>{r.user_name}</div>}
            {r.user_role!=='support'&&r.user_role!=='admin'&&<div className="text-sm opacity-70 mb-1"><User className="w-3.5 h-3.5 inline mr-1"/>{r.user_name}</div>}
            <div className="text-[15px] whitespace-pre-wrap">{r.message}</div>
            <div className="text-xs opacity-50 mt-1">{r.created_at?new Date(r.created_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}):''}</div></div></div>))}</div>
      {sel.status!=='closed'&&<div className="border-t border-gray-200">
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">{QUICK.map((q,i)=><button key={i} onClick={()=>setReply(q.t)} className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-purple-500 hover:text-purple-600 transition" title={`Шаблон: ${q.l}`}>{q.l}</button>)}</div>
        <div className="p-4 flex gap-3"><input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendReply()}}} className="flex-1 bg-gray-50 border border-gray-300 rounded-full px-5 py-3 text-[15px] focus:outline-none focus:border-purple-500" placeholder="Ответить клиенту..."/>
          <button onClick={sendReply} disabled={!reply.trim()} className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 disabled:opacity-50" title="Отправить"><Send className="w-5 h-5"/></button></div></div>}
      {sel.status==='closed'&&<div className="p-5 border-t border-gray-200 text-center text-gray-600 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/>Обращение закрыто</div>}
    </>):(<div className="flex-1 flex items-center justify-center text-gray-600"><div className="text-center">
      <Headphones className="w-20 h-20 mx-auto mb-4 opacity-20"/>
      <p className="text-xl mb-2">Панель техподдержки</p>
      <p className="mb-4">Выберите обращение из списка</p>
      {stats&&<div className="space-y-1"><p>Активных: <span className="text-yellow-600 font-bold">{stats.open_tickets}</span> из <span className="font-bold">{stats.max_per_agent}</span> макс.</p>
        <p>Решено: <span className="text-green-600 font-bold">{stats.closed_tickets}</span></p>
        {urgentCount>0&&<p className="text-red-600">⚠ Срочных: {urgentCount}</p>}</div>}

    </div></div>)}</div>

    {confirmAction&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-96">
      <h3 className="font-semibold mb-3">{confirmAction.title}</h3>
      <p className="text-sm text-gray-600 mb-5">{confirmAction.message}</p>
      <div className="flex gap-2 justify-end"><button onClick={()=>setConfirmAction(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={()=>{confirmAction.onConfirm();setConfirmAction(null)}} className={`px-4 py-2 rounded-lg text-sm ${confirmAction.danger?'bg-red-600 hover:bg-red-700':'bg-orange-600 hover:bg-orange-700'}`}>{confirmAction.confirmText||'Подтвердить'}</button></div>
    </div></div>}
  </div>);
}
