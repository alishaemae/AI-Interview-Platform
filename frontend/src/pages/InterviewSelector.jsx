import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Bell, Clock, MessageCircle, LogOut, User, Code, Database, Server, BarChart3, TestTube, Briefcase, Pause } from 'lucide-react';
import { interviewAPI, vacanciesAPI, notificationsAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const SPECS=[{id:'developer',label:'Разработка',icon:Code,color:'blue',desc:'Python, алгоритмы, ООП'},{id:'analyst',label:'Аналитика',icon:BarChart3,color:'purple',desc:'SQL, метрики, A/B тесты'},{id:'devops',label:'DevOps',icon:Server,color:'orange',desc:'Linux, Docker, CI/CD'},{id:'qa',label:'Тестирование',icon:TestTube,color:'green',desc:'Тест-кейсы, pytest'},{id:'data_science',label:'Data Science',icon:Database,color:'pink',desc:'ML, статистика, pandas'}];
const LVLS=[{id:'junior',label:'Junior',desc:'0-1 год опыта. Базовые алгоритмы, синтаксис языка, простые структуры данных',color:'green',time:'30 мин'},{id:'middle',label:'Middle',desc:'1-3 года опыта. Алгоритмы средней сложности, ООП, работа с API и базами данных',color:'yellow',time:'40 мин'},{id:'senior',label:'Senior',desc:'3+ лет опыта. Сложные алгоритмы, системный дизайн, оптимизация, архитектурные паттерны',color:'red',time:'50 мин'}];
export default function InterviewSelector(){
  const[step,setStep]=useState(1);const[spec,setSpec]=useState(null);const[level,setLevel]=useState(null);
  const[loading,setLoading]=useState(false);const[history,setHistory]=useState([]);const[companySpecs,setCompanySpecs]=useState(null);const[companyId,setCompanyId]=useState(null);
  const[notifs,setNotifs]=useState([]);const[showNotifP,setShowNotifP]=useState(false);
  const[confirmAction,setConfirmAction]=useState(null);
  const navigate=useNavigate();const logout=useAuthStore(s=>s.logout);const user=useAuthStore(s=>s.user);const[params]=useSearchParams();
  useEffect(()=>{notificationsAPI.list().then(({data})=>setNotifs(data)).catch(()=>{});interviewAPI.myInterviews().then(({data})=>setHistory(data.interviews||[])).catch(()=>{});
    const s=params.get('specialty');const l=params.get('level');const cid=params.get('company');
    if(cid){setCompanyId(+cid);vacanciesAPI.list().then(({data})=>{const cv=data.filter(v=>v.company_id===+cid);const specs=[...new Set(cv.map(v=>v.specialty))];setCompanySpecs(specs)}).catch(()=>{})}
    if(s){setSpec(s);setStep(2)}if(l)setLevel(l);
  },[]);
  const start=async()=>{if(!level)return;setLoading(true);try{const{data:iv}=await interviewAPI.create(level,spec||'developer');await interviewAPI.start(iv.id);navigate(`/interview/${iv.id}`)}catch(e){alert(e.response?.data?.detail||'Ошибка')}finally{setLoading(false)}};
  const clr=c=>({blue:'border-blue-500 bg-blue-500/10',purple:'border-purple-500 bg-purple-500/10',orange:'border-orange-500 bg-orange-500/10',green:'border-green-500 bg-green-500/10',pink:'border-pink-500 bg-pink-500/10',yellow:'border-yellow-500 bg-yellow-500/10',red:'border-red-500 bg-red-500/10'}[c]||'');
  const bdg=c=>({blue:'bg-blue-500',purple:'bg-purple-500',orange:'bg-orange-500',green:'bg-green-500',pink:'bg-pink-500',yellow:'bg-yellow-500',red:'bg-red-500'}[c]||'bg-gray-500');
  // Filter specs — only company's open positions if coming from vacancy
  const availableSpecs=companySpecs?SPECS.filter(s=>companySpecs.includes(s.id)):SPECS;
  return(<div className="min-h-screen bg-gray-50 text-gray-900">
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-bold text-blue-600">AI Interview Platform</span>
      <div className="flex items-center gap-3"><span className="text-sm text-gray-600">{user?.full_name}</span>
        <button onClick={()=>navigate('/vacancies')} className="p-2 hover:bg-gray-50 rounded" title="Вакансии"><Briefcase className="w-4 h-4"/></button>
        <button onClick={()=>navigate('/profile')} className="p-2 hover:bg-gray-50 rounded" title="Профиль"><User className="w-4 h-4"/></button>
        <div className="relative"><button onClick={()=>setShowNotifP(!showNotifP)} className="p-2 hover:bg-gray-50 rounded" title="Уведомления"><Bell className="w-4 h-4"/>{notifs.filter(n=>!n.is_read).length>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{notifs.filter(n=>!n.is_read).length}</span>}</button>{showNotifP&&<div className="absolute right-0 top-10 w-72 bg-gray-50 border border-gray-300 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">{notifs.map(n=><div key={n.id} className={`px-3 py-2 border-b border-gray-200/50 text-sm cursor-pointer hover:bg-gray-50/30 ${n.is_read?"opacity-50":""}`} onClick={()=>{notificationsAPI.markRead(n.id);setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,is_read:true}:x));if(n.link)navigate(n.link);setShowNotifP(false)}}><div className="font-medium text-xs">{n.title}</div><div className="text-xs text-gray-600">{n.message}</div></div>)}</div>}</div><button onClick={()=>navigate('/messages')} className="p-2 hover:bg-gray-50 rounded" title="Сообщения"><MessageCircle className="w-4 h-4"/></button>
        <button onClick={()=>setConfirmAction({title:'Выход',message:'Вы уверены, что хотите выйти из системы?',danger:false,confirmText:'Выйти',onConfirm:()=>{logout();navigate('/')}})} className="p-2 hover:bg-gray-50 rounded text-gray-600" title="Выйти"><LogOut className="w-4 h-4"/></button></div></div>
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8"><div className={`px-4 py-2 rounded-full text-sm font-medium ${step>=1?'bg-blue-600':'bg-gray-200'}`}>1. Направление</div><div className="w-8 h-px bg-gray-300"/><div className={`px-4 py-2 rounded-full text-sm font-medium ${step>=2?'bg-blue-600':'bg-gray-200'}`}>2. Уровень</div></div>
      {step===1&&(<><h1 className="text-3xl font-bold mb-2">Выберите направление</h1>
        {companySpecs&&<p className="text-gray-600 mb-4">Доступные направления этой компании. Для тренировки по всем направлениям используйте <button onClick={()=>{setCompanySpecs(null);setCompanyId(null)}} className="text-blue-600 hover:underline">свободный режим</button>.</p>}
        {!companySpecs&&<p className="text-gray-600 mb-8">Задачи подбираются под специальность.</p>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">{availableSpecs.map(s=>(
          <button key={s.id} onClick={()=>{setSpec(s.id);setStep(2)}} className={`p-5 rounded-xl border-2 text-left transition hover:scale-[1.02] ${spec===s.id?clr(s.color):'border-gray-200 hover:border-gray-500'}`}>
            <s.icon className="w-8 h-8 mb-3 text-blue-600"/><h3 className="text-lg font-semibold mb-1">{s.label}</h3><p className="text-gray-600 text-sm">{s.desc}</p></button>))}</div></>)}
      {step===2&&(<><button onClick={()=>setStep(1)} className="text-blue-600 text-sm hover:underline mb-4 block">← Назад к направлениям</button>
        <h1 className="text-3xl font-bold mb-2">Выберите уровень</h1><p className="text-gray-600 mb-8">Направление: <span className="text-gray-900 font-medium">{SPECS.find(s=>s.id===spec)?.label}</span></p>
        <div className="grid md:grid-cols-3 gap-6 mb-8">{LVLS.map(l=>(<button key={l.id} onClick={()=>setLevel(l.id)} className={`p-6 rounded-xl border-2 text-left transition ${level===l.id?clr(l.color):'border-gray-200 hover:border-gray-500'}`}><div className="flex items-center justify-between mb-3"><span className={`px-3 py-1 rounded-full text-xs font-bold text-gray-900 ${bdg(l.color)}`}>{l.label}</span><Clock className="w-4 h-4 text-gray-600"/></div><p className="text-gray-600 text-sm mb-2">{l.desc}</p><p className="text-gray-600 text-xs">{l.time}</p></button>))}</div>
        <button onClick={start} disabled={!level||loading} className="px-8 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"><Play className="w-5 h-5"/>{loading?'Подготовка...':'Начать интервью'}</button></>)}
      {history.length>0&&<div className="mt-12"><h2 className="text-xl font-semibold mb-4">История интервью</h2><div className="space-y-3">{history.map(h=>(<div key={h.id} className="flex items-center justify-between bg-white rounded-lg px-5 py-4"><div><span className="font-medium">{h.level.toUpperCase()}</span><span className="text-gray-600 ml-3 text-sm">{h.started_at?new Date(h.started_at).toLocaleDateString('ru'):''}</span></div><div className="flex items-center gap-4"><span className={`text-sm font-bold ${h.total_score>=70?'text-green-600':h.total_score>=40?'text-yellow-600':'text-red-600'}`}>{h.total_score.toFixed(0)}%</span><span className={`text-xs px-2 py-1 rounded ${h.status==='completed'?'bg-green-100 text-green-600':'bg-yellow-100 text-yellow-600'}`}>{h.status==='completed'?'Завершено':'В процессе'}</span></div></div>))}</div></div>}
    </div>
    {confirmAction&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-96">
      <h3 className="font-semibold mb-3">{confirmAction.title}</h3>
      <p className="text-sm text-gray-600 mb-5">{confirmAction.message}</p>
      <div className="flex gap-2 justify-end"><button onClick={()=>setConfirmAction(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={()=>{confirmAction.onConfirm();setConfirmAction(null)}} className={`px-4 py-2 rounded-lg text-sm ${confirmAction.danger?'bg-red-600 hover:bg-red-700':'bg-blue-600 hover:bg-blue-700'}`}>{confirmAction.confirmText||'Подтвердить'}</button></div>
    </div></div>}
    </div>);
}
