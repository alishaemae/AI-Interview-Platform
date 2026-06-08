import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, LogIn, Headphones } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { authAPI } from '../api/client';
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const login = useAuthStore(s=>s.login); const navigate = useNavigate();
  const handleSubmit = async(e)=>{e.preventDefault();setError('');setLoading(true);
    try{const{data}=await authAPI.login({email,password});login(data.access_token,{id:data.user_id,role:data.role,full_name:data.full_name});
      navigate(data.role==='admin'?'/admin':data.role==='support'?'/support':data.role==='hr'?'/hr/dashboard':'/vacancies');
    }catch(err){setError(err.response?.data?.detail||'Ошибка авторизации')}finally{setLoading(false)}};
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><Brain className="w-12 h-12 text-blue-600 mx-auto mb-4"/><h1 className="text-2xl font-bold text-gray-900">Вход в систему</h1></div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 space-y-5">
          {error&&<div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg text-sm">{error}{error.includes("деактивирован")&&<div className="mt-3 p-3 bg-purple-500/10 border border-purple-500 rounded-lg"><p className="text-purple-300 text-xs mb-1">Ваш аккаунт заблокирован администратором.</p><p className="text-purple-300 text-xs">Для восстановления обратитесь в техподдержку:</p><p className="text-purple-600 text-sm font-semibold mt-1">support@ai-interview.ru</p></div>}</div>}
          <div><label className="block text-gray-600 text-sm mb-2">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="email@example.com" required/></div>
          <div><label className="block text-gray-600 text-sm mb-2">Пароль</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="••••••••" required/></div>
          <button type="submit" disabled={loading} title="Войти в систему" className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-gray-900 flex items-center justify-center gap-2 transition disabled:opacity-50">
            <LogIn className="w-5 h-5"/>{loading?'Вход...':'Войти'}</button>
          <p className="text-center text-gray-600 text-sm">Нет аккаунта? <Link to="/register" title="Создать новый аккаунт" className="text-blue-600 hover:underline">Зарегистрироваться</Link></p>
        </form>
      </div>
    </div>);
}
