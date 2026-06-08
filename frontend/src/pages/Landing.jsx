import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, Shield, Cpu, Users, BarChart3, Headphones, Code } from 'lucide-react';
export default function Landing(){
  const navigate=useNavigate();
  return(<div className="min-h-screen bg-gray-50 text-gray-900">
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3"><Brain className="w-8 h-8 text-blue-600"/><span className="text-xl font-bold">AI Interview Platform</span></div>
      <div className="flex gap-3"><button onClick={()=>navigate('/login')} className="px-5 py-2 text-gray-600 hover:text-gray-900 transition" title="Войти в аккаунт">Войти</button><button onClick={()=>navigate('/register')} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition" title="Создать аккаунт">Регистрация</button></div></nav>
    <section className="max-w-6xl mx-auto px-8 py-24 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-600 text-sm mb-6"><Cpu className="w-4 h-4"/>AI-powered технические собеседования</div>
      <h1 className="text-5xl font-bold mb-6 leading-tight">Автоматизированное<br/>техническое собеседование<br/>с <span className="text-blue-600">AI-интервьюером</span></h1>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">Объективная оценка IT-специалистов за 30 минут. Редактор кода, AI-анализ, готовые отчёты для HR.</p>
      <div className="flex gap-4 justify-center"><button onClick={()=>navigate('/register')} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg flex items-center gap-2 transition">Начать бесплатно<ArrowRight className="w-5 h-5"/></button><button onClick={()=>navigate('/login')} className="px-8 py-3.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl font-semibold text-lg transition">Войти</button></div>
    </section>
    <section className="max-w-6xl mx-auto px-8 py-16"><div className="grid md:grid-cols-3 gap-6">
      {[{i:Code,t:'Редактор кода',d:'Встроенный редактор с подсветкой, нумерацией строк и консолью выполнения'},
        {i:Cpu,t:'AI-интервьюер',d:'Интеллектуальный диалог с кандидатом, оценка soft skills и качества кода'},
        {i:BarChart3,t:'Аналитика для HR',d:'Сравнение кандидатов, Replay Mode, экспорт отчётов в PDF и Excel'},
        {i:Shield,t:'Безопасность',d:'JWT-аутентификация, bcrypt, RBAC, античит-система'},
        {i:Users,t:'5 ролей',d:'Кандидат, HR-менеджер, администратор, техподдержка, гость'},
        {i:Headphones,t:'Техподдержка',d:'Встроенная тикет-система с автораспределением обращений'},
      ].map((f,i)=><div key={i} className="bg-gray-50 border border-gray-300 rounded-xl p-6 hover:border-blue-500/50 transition"><f.i className="w-8 h-8 text-blue-600 mb-4"/><h3 className="text-lg font-semibold mb-2">{f.t}</h3><p className="text-gray-600 text-sm">{f.d}</p></div>)}</div></section>
    <section className="max-w-4xl mx-auto px-8 py-16 text-center">
      <h2 className="text-3xl font-bold mb-4">Готовы начать?</h2>
      <p className="text-gray-600 mb-8">Создайте аккаунт и пройдите первое собеседование прямо сейчас</p>
      <button onClick={()=>navigate('/register')} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition">Зарегистрироваться</button>
    </section>
    <footer className="border-t border-gray-100 px-8 py-6 text-center text-gray-600 text-sm">AI Interview Platform · 2026</footer>
  </div>);
}
