import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Briefcase, DollarSign, Code, Database, Server, BarChart3, TestTube, ArrowRight, Globe } from 'lucide-react';
import { vacanciesAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const IC={developer:Code,analyst:BarChart3,devops:Server,qa:TestTube,data_science:Database};
const SR={developer:'Разработка',analyst:'Аналитика',devops:'DevOps',qa:'Тестирование',data_science:'Data Science'};
const LR={junior:'Junior',middle:'Middle',senior:'Senior'};
const LC={junior:'bg-green-100 text-green-600',middle:'bg-yellow-100 text-yellow-600',senior:'bg-red-100 text-red-600'};
export default function VacancyDetail(){
  const{id}=useParams();const navigate=useNavigate();const[v,setV]=useState(null);
  const user=useAuthStore(s=>s.user);const isCandidate=user?.role==='candidate';
  useEffect(()=>{vacanciesAPI.get(id).then(({data})=>setV(data)).catch(()=>navigate(-1))},[id]);
  if(!v)return<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Загрузка...</div>;
  const I=IC[v.specialty]||Briefcase;
  return(<div className="min-h-screen bg-gray-50 text-gray-900"><div className="max-w-3xl mx-auto p-8">
    <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm" title="Вернуться назад"><ArrowLeft className="w-4 h-4"/>Назад</button>
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 border border-gray-200">
      <div className="flex items-start gap-4 mb-6"><div className="p-3 bg-blue-500/10 rounded-xl"><I className="w-8 h-8 text-blue-600"/></div>
        <div className="flex-1"><h1 className="text-2xl font-bold mb-2">{v.title}</h1>
          <div className="flex flex-wrap items-center gap-3"><span className={`text-sm px-3 py-1 rounded-full ${LC[v.level]}`}>{LR[v.level]}</span><span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-600">{SR[v.specialty]}</span></div></div></div>
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3 text-gray-600"><Building2 className="w-5 h-5 text-gray-600"/><div><div className="font-medium">{v.company_name}</div>{v.company_description&&<div className="text-sm text-gray-600">{v.company_description}</div>}</div></div>
        {v.salary_from&&<div className="flex items-center gap-3 text-gray-600"><DollarSign className="w-5 h-5 text-gray-600"/><span className="text-lg font-semibold text-green-600">{v.salary_from?.toLocaleString('ru')} – {v.salary_to?.toLocaleString('ru')} ₽</span></div>}
        {v.company_website&&<div className="flex items-center gap-3 text-gray-600"><Globe className="w-5 h-5 text-gray-600"/><span className="text-blue-600">{v.company_website}</span></div>}
      </div>
      <div className="mb-8"><h2 className="text-lg font-semibold mb-3">Описание</h2><p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{v.description||'Описание не указано.'}</p></div>
      <div className="mb-8"><h2 className="text-lg font-semibold mb-3">Направление</h2>
        <p className="text-gray-600">Техническое собеседование по направлению «{SR[v.specialty]}» уровня {LR[v.level]}. Собеседование включает 5 задач по программированию с AI-интервьюером, оценку кода и soft skills.</p></div>
      {isCandidate&&<button onClick={()=>navigate(`/interviews?specialty=${v.specialty}&level=${v.level}&company=${v.company_id}`)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold flex items-center justify-center gap-2 text-lg" title="Начать техническое собеседование по этой вакансии">Пройти собеседование<ArrowRight className="w-5 h-5"/></button>}
    </div></div></div>);
}
