import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, MessageCircle, Briefcase, FileText } from 'lucide-react';
import { hrAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const COLORS=['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#84cc16'];
export default function UserProfileView(){
  const{userId}=useParams();const navigate=useNavigate();const me=useAuthStore(s=>s.user);
  const[profile,setProfile]=useState(null);const[sessions,setSessions]=useState([]);
  const[photo,setPhoto]=useState(null);const[color,setColor]=useState(COLORS[0]);
  const[resumeName,setResumeName]=useState('');const[resumeData,setResumeData]=useState(null);
  useEffect(()=>{hrAPI.userProfile(userId).then(({data})=>{setProfile(data);
    const s=localStorage.getItem(`profile_${userId}`);
    if(s){const p=JSON.parse(s);if(p.photo)setPhoto(p.photo);if(p.color)setColor(p.color);if(p.resumeName)setResumeName(p.resumeName);if(p.resumeData)setResumeData(p.resumeData)}
    else setColor(COLORS[+userId%COLORS.length])}).catch(()=>{});
    if(me?.role==='hr')hrAPI.candidateSessions(userId).then(({data})=>setSessions(data)).catch(()=>{});
  },[userId]);
  const openResume=()=>{if(!resumeData)return;const a=document.createElement('a');a.href=resumeData;a.download=resumeName||'resume.pdf';a.click()};
  if(!profile)return<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Загрузка...</div>;
  return(<div className="min-h-screen bg-gray-50 text-gray-900 p-8"><div className="max-w-2xl mx-auto">
    <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4"/>Назад</button>
    <div className="flex items-center gap-6 mb-8">
      {photo?<img src={photo} alt="" className="w-20 h-20 rounded-full object-cover"/>:<div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl text-gray-900" style={{backgroundColor:color}}>{(profile.full_name||'?')[0]}</div>}
      <div><h1 className="text-2xl font-bold">{profile.full_name}</h1>
        <span className={`text-sm px-3 py-1 rounded-full ${profile.role==='hr'?'bg-purple-100 text-purple-600':'bg-blue-100 text-blue-600'}`}>{profile.role==='hr'?'HR-менеджер':'Кандидат'}</span>
        {profile.company_name&&<span className="text-sm text-gray-600 ml-2">· {profile.company_name}</span>}</div></div>
    <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6 space-y-3">
      <div className="flex items-center gap-3 text-gray-600"><Mail className="w-4 h-4 text-gray-600"/>{profile.email}</div>
      {profile.phone&&<div className="flex items-center gap-3 text-gray-600"><Phone className="w-4 h-4 text-gray-600"/>{profile.phone}</div>}
      {profile.created_at&&<div className="flex items-center gap-3 text-gray-600 text-sm"><Calendar className="w-4 h-4 text-gray-600"/>Зарегистрирован: {new Date(profile.created_at).toLocaleDateString('ru')}</div>}</div>

    {/* Резюме */}
    {profile.role==='candidate'&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600"/>Резюме</h3>
      {resumeName?<button onClick={openResume} className="flex items-center gap-3 p-3 bg-gray-200 hover:bg-gray-300 rounded-lg w-full text-left">
        <FileText className="w-5 h-5 text-blue-600"/><span className="text-sm flex-1">{resumeName}</span><span className="text-xs text-gray-600">Открыть</span></button>
      :<p className="text-gray-600 text-sm">Резюме не предоставлено</p>}</div>}

    {sessions.length>0&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6"><h3 className="font-semibold mb-4">Собеседования</h3><div className="space-y-3">{sessions.map(s=>(
      <div key={s.id} className="flex items-center justify-between p-3 bg-gray-200 rounded-lg">
        <div><span className={`px-2 py-0.5 rounded text-xs font-bold ${s.level==='junior'?'bg-green-100 text-green-600':s.level==='middle'?'bg-yellow-100 text-yellow-600':'bg-red-100 text-red-600'}`}>{s.level.toUpperCase()}</span>
          <span className="text-sm text-gray-600 ml-2">{s.started_at?new Date(s.started_at).toLocaleDateString('ru'):''}</span></div>
        <span className={`font-bold ${s.total_score>=70?'text-green-600':s.total_score>=40?'text-yellow-600':'text-red-600'}`}>{s.total_score.toFixed(0)}%</span></div>))}</div></div>}
    <div className="flex gap-3">
      <button onClick={()=>navigate('/messages')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"><MessageCircle className="w-4 h-4"/>Написать</button>
      {me?.role==='candidate'&&<button onClick={()=>navigate('/vacancies')} className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"><Briefcase className="w-4 h-4"/>Вакансии</button>}</div>
  </div></div>);
}
