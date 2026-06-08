import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, UserPlus, Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { authAPI } from '../api/client';
export default function Register() {
  const[form,setForm]=useState({email:'',password:'',full_name:'',phone:''});
  const[error,setError]=useState('');const[loading,setLoading]=useState(false);const[step,setStep]=useState(1);
  const[code,setCode]=useState('');const[resending,setResending]=useState(false);const[sendStatus,setSendStatus]=useState('');
  const login=useAuthStore(s=>s.login);const navigate=useNavigate();
  const u=f=>e=>setForm({...form,[f]:e.target.value});
  const handleRegister=async e=>{e.preventDefault();setError('');setLoading(true);
    try{const{data}=await authAPI.register(form);login(data.access_token,{id:data.user_id,role:data.role,full_name:data.full_name,email:form.email,phone:form.phone});setStep(2);setSendStatus('Код отправлен на email')}
    catch(err){setError(err.response?.data?.detail||'Ошибка регистрации')}finally{setLoading(false)}};
  const handleVerify=async()=>{setError('');setLoading(true);
    try{await authAPI.verify(code);navigate('/vacancies')}
    catch(err){setError(err.response?.data?.detail||'Неверный код')}finally{setLoading(false)}};
  const resendEmail=async()=>{setResending(true);setSendStatus('');try{await authAPI.resendCode();setSendStatus('Код повторно отправлен на email')}catch(e){setSendStatus('Ошибка отправки на email. Код в консоли бэкенда')}finally{setResending(false)}};
  
  return(<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><div className="w-full max-w-md">
    <div className="text-center mb-8"><Brain className="w-12 h-12 text-blue-600 mx-auto mb-4"/><h1 className="text-2xl font-bold text-gray-900">{step===1?'Регистрация':'Подтверждение'}</h1>
      {step===1&&<p className="text-gray-600 text-sm mt-2">Создайте аккаунт для прохождения собеседований</p>}</div>
    {step===1?(<form onSubmit={handleRegister} className="bg-white rounded-xl p-8 space-y-5">
      {error&&<div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}
      <div><label className="block text-gray-600 text-sm mb-2">ФИО <span className="text-red-600">*</span></label><input type="text" value={form.full_name} onChange={u('full_name')} className="w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="Иванов Иван Иванович" required/></div>
      <div><label className="block text-gray-600 text-sm mb-2">Email <span className="text-red-600">*</span></label><input type="email" value={form.email} onChange={u('email')} className="w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="example@mail.ru" required/></div>
      <div><label className="block text-gray-600 text-sm mb-2">Телефон</label><input type="tel" value={form.phone} onChange={u('phone')} className="w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="+7 (900) 123-45-67"/></div>
      <div><label className="block text-gray-600 text-sm mb-2">Пароль <span className="text-red-600">*</span></label><input type="password" value={form.password} onChange={u('password')} className="w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="Минимум 6 символов" minLength={6} required/></div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-gray-900 flex items-center justify-center gap-2 disabled:opacity-50"><UserPlus className="w-5 h-5"/>{loading?'Регистрация...':'Зарегистрироваться'}</button>
      <p className="text-center text-gray-600 text-sm">Есть аккаунт? <Link to="/login" className="text-blue-600 hover:underline">Войти</Link></p>
    </form>):(<div className="bg-white rounded-xl p-8 space-y-5">
      <div className="text-center"><Mail className="w-16 h-16 text-blue-600 mx-auto mb-4"/>
        <p className="text-gray-600 mb-1">Введите 6-значный код подтверждения</p>
        <p className="text-gray-900 font-semibold">{form.email}</p>
        </div>
      {sendStatus&&<div className="bg-blue-500/10 border border-blue-500 text-blue-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0"/>{sendStatus}</div>}
      {error&&<div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}
      <div><label className="block text-gray-600 text-sm mb-2">Код подтверждения</label>
        <input type="text" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} maxLength={6} className="w-full px-4 py-4 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 text-center text-2xl tracking-[0.5em] font-mono focus:border-blue-500 focus:outline-none" placeholder="000000" autoFocus/></div>
      <button onClick={handleVerify} disabled={code.length<6||loading} className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-gray-900 flex items-center justify-center gap-2 disabled:opacity-50"><ArrowRight className="w-5 h-5"/>{loading?'Проверка...':'Подтвердить'}</button>
      <p className="text-center text-gray-600 text-xs mb-2">Не получили код? Отправить повторно:</p>
      <button onClick={resendEmail} disabled={resending} className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50" title="Отправить код повторно"><Mail className="w-4 h-4 text-blue-600"/>{resending?'Отправка...':'Отправить код повторно'}</button>
      <p className="text-center text-gray-600 text-xs">Если SMTP не настроен, код отображается в консоли сервера</p>
    </div>)}
  </div></div>);
}
