import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipForward, Download, Code, Clock } from 'lucide-react';
import { hrAPI } from '../api/client';
export default function HRReplay(){
  const{sessionId}=useParams();const navigate=useNavigate();
  const[data,setData]=useState(null);const[tasks,setTasks]=useState([]);const[idx,setIdx]=useState(0);const[playing,setPlaying]=useState(false);
  useEffect(()=>{hrAPI.replayData(sessionId).then(({data:d})=>setData(d)).catch(()=>{});hrAPI.sessionTasks(sessionId).then(({data:d})=>setTasks(d)).catch(()=>{})},[sessionId]);
  const exportCode=async()=>{try{const{data:files}=await hrAPI.sessionCode(sessionId);
    const txt=files.map(f=>`# === Задача ${f.task_number}: ${f.task_title} ===\n# Балл: ${f.score}%\n# Язык: ${f.language}\n\n${f.code}\n\n`).join('\n'+'-'.repeat(60)+'\n\n');
    const b=new Blob([txt],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`code_session_${sessionId}.py`;a.click()}catch{alert('Ошибка экспорта кода')}};
  if(!data)return<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Загрузка...</div>;
  return(<div className="min-h-screen bg-gray-50 text-gray-900 p-8"><div className="max-w-5xl mx-auto">
    <div className="flex items-center justify-between mb-6">
      <button onClick={()=>navigate('/hr/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4"/>Назад к дашборду</button>
      <div className="flex gap-2">
        <button onClick={exportCode} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"><Download className="w-4 h-4"/>Скачать код (.py)</button>
      </div></div>
    <h1 className="text-2xl font-bold mb-6">Replay сессии #{sessionId}</h1>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200"><h3 className="font-semibold mb-4">Информация о сессии</h3>
        <div className="space-y-2 text-sm text-gray-600">
          {data.candidate_name&&<div>Кандидат: <span className="text-gray-900 font-semibold">{data.candidate_name}</span></div>}
          <div>Статус: <span className="text-gray-900">{data.status==='completed'?'Завершено':data.status}</span></div>
          <div>Уровень: <span className="text-gray-900">{data.level?.toUpperCase()}</span></div>
          <div>Общий балл: <span className={`font-bold ${data.total_score>=70?'text-green-600':data.total_score>=40?'text-yellow-600':'text-red-600'}`}>{data.total_score?.toFixed(0)}%</span></div>
          <div>Задач: {data.completed_tasks}/{data.total_tasks}</div>
          {data.started_at&&<div>Начало: {new Date(data.started_at).toLocaleString('ru')}</div>}
          {data.finished_at&&<div>Конец: {new Date(data.finished_at).toLocaleString('ru')}</div>}
        </div></div>
      <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200"><h3 className="font-semibold mb-4">Задачи</h3>
        <div className="space-y-3">{tasks.map(t=>(<div key={t.id} className="flex items-center justify-between p-3 bg-gray-200 rounded-lg">
          <div><span className="font-medium">#{t.order_number} {t.title}</span><br/><span className="text-xs text-gray-600">{t.domain} · {t.level}</span></div>
          <span className={`font-bold ${t.best_score>=70?'text-green-600':t.best_score>=40?'text-yellow-600':'text-red-600'}`}>{t.best_score?.toFixed(0)}%</span></div>))}</div></div>
    </div>
    {data.chat_messages&&data.chat_messages.length>0&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mt-6"><h3 className="font-semibold mb-4">Диалог с AI-интервьюером</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">{data.chat_messages.map((m,i)=>(
        <div key={i} className={`flex ${m.sender==='candidate'?'justify-end':'justify-start'}`}>
          <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${m.sender==='candidate'?'bg-blue-600':'bg-gray-200'}`}>
            <div className="whitespace-pre-wrap">{m.content}</div>
            <div className="text-[10px] text-gray-600 mt-1">{m.timestamp?new Date(m.timestamp).toLocaleTimeString('ru'):''}</div></div></div>))}</div></div>}
    {data.anticheat_events&&data.anticheat_events.length>0&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mt-6"><h3 className="font-semibold mb-4 text-red-600">Античит-события</h3>
      <div className="space-y-2">{data.anticheat_events.map((e,i)=>(
        <div key={i} className="flex items-center gap-3 p-2 bg-red-900/20 rounded">
          <span className="text-sm">{e.event_type==='paste'?'Вставка кода':e.event_type==='tab_switch'?'Переключение вкладки':e.event_type==='devtools'?'DevTools':e.event_type}</span>
          <span className="text-xs text-gray-600">{e.timestamp?new Date(e.timestamp).toLocaleTimeString('ru'):''}</span>
        </div>))}</div></div>}
  </div></div>);
}
