import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Camera, FileText, Save, Mail, Phone, Briefcase, Star, Upload, Trophy, Building2 } from 'lucide-react';
import { hrAPI, interviewAPI, authAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const COLORS=['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#84cc16'];
export default function Profile(){
  const navigate=useNavigate();const{user,login}=useAuthStore();const uid=user?.id||0;
  const[form,setForm]=useState({full_name:'',phone:'',bio:'',skills:''});
  const[color,setColor]=useState(COLORS[0]);const[photo,setPhoto]=useState(null);
  const[resumeName,setResumeName]=useState('');const[resumeData,setResumeData]=useState(null);
  const[saved,setSaved]=useState(false);const[stats,setStats]=useState(null);const[history,setHistory]=useState([]);
  const[companyName,setCompanyName]=useState('');
  const photoRef=useRef();
  useEffect(()=>{if(!user)return;setForm({full_name:user.full_name||'',phone:user.phone||'',bio:user.bio||'',skills:user.skills||''});
    const s=localStorage.getItem(`profile_${uid}`);if(s){const p=JSON.parse(s);setColor(p.color||COLORS[uid%COLORS.length]);setPhoto(p.photo||null);setResumeName(p.resumeName||'');setResumeData(p.resumeData||null)}
    if(user.role==='hr'){hrAPI.analytics().then(({data})=>setStats(data)).catch(()=>{});authAPI.userProfile(uid).then(({data})=>{if(data.company_name)setCompanyName(data.company_name)}).catch(()=>{})}
    if(user.role==='candidate')interviewAPI.myInterviews().then(({data})=>setHistory(data.interviews||[])).catch(()=>{});
  },[user]);
  const handleSave=async()=>{try{await authAPI.updateProfile(form)}catch{};const u={...user,...form};localStorage.setItem('user',JSON.stringify(u));
    localStorage.setItem(`profile_${uid}`,JSON.stringify({color,photo,resumeName,resumeData}));login(localStorage.getItem('token'),u);setSaved(true);setTimeout(()=>setSaved(false),2000)};
  const handlePhoto=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>setPhoto(r.result);r.readAsDataURL(f)};
  const handleResume=e=>{const f=e.target.files[0];if(!f)return;setResumeName(f.name);const r=new FileReader();r.onload=()=>setResumeData(r.result);r.readAsDataURL(f)};
  const openResume=()=>{if(!resumeData)return;const a=document.createElement('a');a.href=resumeData;a.download=resumeName||'resume.pdf';a.click()};
  const isHR=user?.role==='hr';
  return(<div className="min-h-screen bg-gray-50 text-gray-900 p-8"><div className="max-w-2xl mx-auto">
    <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4"/>Назад</button>
    <h1 className="text-2xl font-bold mb-2">{isHR?'Профиль HR-менеджера':'Мой профиль'}</h1>
    {isHR&&companyName&&<p className="text-gray-600 mb-6 flex items-center gap-2"><Building2 className="w-4 h-4"/>{companyName}</p>}
    <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6"><h3 className="text-sm text-gray-600 mb-4">Фотография</h3>
      <div className="flex items-center gap-6"><div className="relative">
        {photo?<img src={photo} alt="" className="w-24 h-24 rounded-full object-cover"/>:<div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl text-gray-900" style={{backgroundColor:color}}>{(form.full_name||'?')[0]}</div>}
        <button onClick={()=>photoRef.current?.click()} className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 hover:bg-blue-700"><Camera className="w-4 h-4"/></button>
        <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden"/></div>
      <div><p className="text-sm text-gray-600 mb-2">Цвет фона:</p><div className="flex gap-2">{COLORS.map(c=><button key={c} onClick={()=>setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color===c?'border-white scale-110':'border-transparent'}`} style={{backgroundColor:c}}/>)}</div></div></div></div>
    <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6 space-y-4"><h3 className="text-sm text-gray-600 mb-2">Личная информация</h3>
      <div><label className="text-sm text-gray-600 mb-1 flex items-center gap-1"><User className="w-3 h-3"/>ФИО</label><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} className="w-full px-4 py-2.5 bg-gray-200 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"/></div>
      <div><label className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/>Телефон</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full px-4 py-2.5 bg-gray-200 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"/></div>
      <div><label className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/>Email</label><input value={form.email||user?.email||''} onChange={e=>setForm({...form,email:e.target.value})} className="w-full px-4 py-2.5 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="example@mail.ru"/></div>
      <div><label className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3"/>О себе</label><textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} className="w-full px-4 py-2.5 bg-gray-200 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-24 resize-none"/></div>
      {!isHR&&<div><label className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Star className="w-3 h-3"/>Навыки</label><input value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})} className="w-full px-4 py-2.5 bg-gray-200 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Python, SQL..."/></div>}
    </div>
    {!isHR&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6"><h3 className="text-sm text-gray-600 mb-3 flex items-center gap-1"><FileText className="w-3 h-3"/>Резюме</h3>
      {resumeName&&<button onClick={openResume} className="flex items-center gap-3 p-3 bg-gray-200 hover:bg-gray-300 rounded-lg mb-3 w-full text-left"><FileText className="w-5 h-5 text-blue-600"/><span className="text-sm flex-1">{resumeName}</span><span className="text-xs text-gray-600">Открыть</span></button>}
      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"><Upload className="w-4 h-4"/>{resumeName?'Заменить':'Загрузить резюме'}<input type="file" accept=".pdf,.doc,.docx" onChange={handleResume} className="hidden"/></label></div>}
    {/* Результаты тестирования кандидата */}
    {!isHR&&history.length>0&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6"><h3 className="text-sm text-gray-600 mb-3 flex items-center gap-1"><Trophy className="w-3 h-3"/>Результаты тестирования</h3>
      <div className="space-y-3">{history.map(h=>(
        <div key={h.id} className="flex items-center justify-between p-3 bg-gray-200 rounded-lg">
          <div><span className="font-medium">{h.level.toUpperCase()}</span><span className="text-gray-600 ml-3 text-sm">{h.started_at?new Date(h.started_at).toLocaleDateString('ru'):''}</span></div>
          <div className="flex items-center gap-3">
            <span className={`font-bold ${h.total_score>=70?'text-green-600':h.total_score>=40?'text-yellow-600':'text-red-600'}`}>{h.total_score.toFixed(0)}%</span>
            <span className={`text-xs px-2 py-1 rounded ${h.status==='completed'?'bg-green-100 text-green-600':'bg-yellow-100 text-yellow-600'}`}>{h.status==='completed'?'Завершено':'В процессе'}</span>
          </div></div>))}</div></div>}
    {isHR&&stats&&<div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 mb-6"><h3 className="text-sm text-gray-600 mb-3">Статистика</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-200 rounded-lg p-4"><div className="text-2xl font-bold text-blue-600">{stats.completed_interviews}</div><div className="text-xs text-gray-600 mt-1">Проведено</div></div>
        <div className="bg-gray-200 rounded-lg p-4"><div className="text-2xl font-bold text-green-600">{stats.by_recommendation?.hire||0}</div><div className="text-xs text-gray-600 mt-1">Нанято</div></div>
        <div className="bg-gray-200 rounded-lg p-4"><div className="text-2xl font-bold text-yellow-600">{stats.by_recommendation?.maybe||0}</div><div className="text-xs text-gray-600 mt-1">На рассмотрении</div></div>
      </div></div>}
    <button onClick={handleSave} className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold flex items-center justify-center gap-2"><Save className="w-5 h-5"/>{saved?'✓ Сохранено!':'Сохранить'}</button>
  </div></div>);
}
