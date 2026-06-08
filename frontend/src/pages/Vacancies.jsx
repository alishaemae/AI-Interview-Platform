import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Bell, Forward, DollarSign, ArrowRight, Search, Building2, Code, Database, Server, BarChart3, TestTube, User, MessageCircle, LogOut, Play, Headphones, Share2 } from 'lucide-react';
import { vacanciesAPI, messagesAPI, notificationsAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const IC={developer:Code,analyst:BarChart3,devops:Server,qa:TestTube,data_science:Database};
const SR={developer:'Разработка',analyst:'Аналитика',devops:'DevOps',qa:'Тестирование',data_science:'Data Science'};
const LR={junior:'Junior',middle:'Middle',senior:'Senior'};
const LC={junior:'bg-green-100 text-green-600',middle:'bg-yellow-100 text-yellow-600',senior:'bg-red-100 text-red-600'};
export default function Vacancies(){
  const[vacs,setVacs]=useState([]);const[search,setSearch]=useState('');const[fSpec,setFSpec]=useState('');
  const[confirmAction,setConfirmAction]=useState(null);
  const navigate=useNavigate();const user=useAuthStore(s=>s.user);const logout=useAuthStore(s=>s.logout);
  const[unreadMsgs,setUnreadMsgs]=useState(0);const[notifs,setNotifs]=useState([]);const[showNotifs,setShowNotifs]=useState(false);
  useEffect(()=>{vacanciesAPI.list().then(({data})=>setVacs(data)).catch(()=>{});
    messagesAPI.unreadCount().then(({data})=>setUnreadMsgs(data.count)).catch(()=>{});
    notificationsAPI.list().then(({data})=>setNotifs(data)).catch(()=>{});
    const pi=setInterval(()=>messagesAPI.unreadCount().then(({data})=>setUnreadMsgs(data.count)).catch(()=>{}),30000);return()=>clearInterval(pi)},[]);
  const f=vacs.filter(v=>{if(search&&!v.title.toLowerCase().includes(search.toLowerCase())&&!v.company_name.toLowerCase().includes(search.toLowerCase()))return false;if(fSpec&&v.specialty!==fSpec)return false;return true});
  return(<div className="min-h-screen bg-gray-50 text-gray-900">
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-bold text-blue-600">AI Interview Platform</span>
      <div className="flex items-center gap-3"><span className="text-sm text-gray-600">{user?.full_name}</span>
        <button onClick={()=>navigate('/interviews')} className="p-2 hover:bg-gray-50 rounded" title="Тренировочное собеседование"><Play className="w-4 h-4"/></button>
        <button onClick={()=>navigate('/profile')} className="p-2 hover:bg-gray-50 rounded" title="Мой профиль"><User className="w-4 h-4"/></button>
        <div className="relative"><button onClick={()=>setShowNotifs(!showNotifs)} className="p-2 hover:bg-gray-50 rounded" title="Уведомления"><Bell className="w-4 h-4"/>{notifs.filter(n=>!n.is_read).length>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{notifs.filter(n=>!n.is_read).length}</span>}</button>{showNotifs&&<div className="absolute right-0 top-10 w-80 bg-gray-50 border border-gray-300 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"><div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center"><span className="text-sm font-semibold">Уведомления</span><button onClick={()=>{notificationsAPI.markAllRead();setNotifs(n=>n.map(x=>({...x,is_read:true})))}} className="text-xs text-blue-600">Прочитать все</button></div>{notifs.length===0?<div className="p-4 text-gray-600 text-sm">Нет уведомлений</div>:notifs.map(n=><div key={n.id} className={`px-4 py-3 border-b border-gray-200/50 hover:bg-gray-50/30 cursor-pointer ${n.is_read?"opacity-50":""}`} onClick={()=>{notificationsAPI.markRead(n.id);setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,is_read:true}:x));if(n.link)navigate(n.link);setShowNotifs(false)}}><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-gray-600">{n.message}</div></div>)}</div>}</div><div className="relative"><button onClick={()=>navigate('/messages')} className="p-2 hover:bg-gray-50 rounded" title="Сообщения"><MessageCircle className="w-4 h-4"/>{unreadMsgs>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unreadMsgs}</span>}</button></div>
        <button onClick={()=>navigate('/support-request')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center gap-1" title="Написать в техподдержку"><Headphones className="w-4 h-4"/>Поддержка</button>
        <button onClick={()=>setConfirmAction({title:'Выход',message:'Вы уверены, что хотите выйти из системы?',danger:false,confirmText:'Выйти',onConfirm:()=>{logout();navigate('/')}})} className="p-2 hover:bg-gray-50 rounded text-gray-600" title="Выйти из аккаунта"><LogOut className="w-4 h-4"/></button></div></div>
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Вакансии</h1><p className="text-gray-600 mb-6">Выберите вакансию и пройдите собеседование</p>
      <div className="flex gap-3 mb-6"><div className="relative flex-1 max-w-md"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" placeholder="Поиск по названию или компании..."/></div>
        <select value={fSpec} onChange={e=>setFSpec(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm" title="Фильтр по направлению"><option value="">Все направления</option>{Object.entries(SR).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
      <div className="space-y-4">{f.map(v=>{const I=IC[v.specialty]||Briefcase;return(
        <div key={v.id} className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 border border-gray-200 hover:border-blue-500 transition cursor-pointer" onDoubleClick={()=>navigate(`/vacancy/${v.id}`)}>
          <div className="flex items-start justify-between"><div className="flex-1">
            <div className="flex items-center gap-3 mb-2"><I className="w-5 h-5 text-blue-600"/><h3 className="text-lg font-semibold">{v.title}</h3><span className={`text-xs px-2 py-0.5 rounded ${LC[v.level]}`}>{LR[v.level]}</span></div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3"><span className="flex items-center gap-1"><Building2 className="w-4 h-4"/>{v.company_name}</span><span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/>{SR[v.specialty]}</span>{v.salary_from&&<span className="flex items-center gap-1"><DollarSign className="w-4 h-4"/>{v.salary_from?.toLocaleString('ru')} – {v.salary_to?.toLocaleString('ru')} ₽</span>}</div>
            <p className="text-gray-600 text-sm">{v.description}</p></div>
          <div className="flex flex-col gap-2 ml-4 shrink-0">
            <button onClick={()=>navigate(`/vacancy/${v.id}`)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium" title="Просмотр полного описания вакансии">Посмотреть</button>
            <button onClick={()=>navigate(`/interviews?specialty=${v.specialty}&level=${v.level}&company=${v.company_id}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" title="Начать техническое собеседование">Пройти<ArrowRight className="w-4 h-4"/></button>
          </div></div></div>)})}{f.length===0&&<div className="text-center py-12 text-gray-600">Нет вакансий</div>}</div>
    </div>
    {confirmAction&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-96">
      <h3 className="font-semibold mb-3">{confirmAction.title}</h3>
      <p className="text-sm text-gray-600 mb-5">{confirmAction.message}</p>
      <div className="flex gap-2 justify-end"><button onClick={()=>setConfirmAction(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={()=>{confirmAction.onConfirm();setConfirmAction(null)}} className={`px-4 py-2 rounded-lg text-sm ${confirmAction.danger?'bg-red-600 hover:bg-red-700':'bg-blue-600 hover:bg-blue-700'}`}>{confirmAction.confirmText||'Подтвердить'}</button></div>
    </div></div>}
    </div>);
}
