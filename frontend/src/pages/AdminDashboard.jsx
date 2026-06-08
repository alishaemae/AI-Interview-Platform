import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Bell, LogOut, Lock, Unlock, Clock, Search, RefreshCw, CheckCircle, XCircle, Database, Cpu, Wifi, UserPlus, UserMinus, X, Plus, Headphones, Copy, Trash2, Edit, Save, Table2 } from 'lucide-react';
import { adminAPI, authAPI, notificationsAPI, supportAPI } from '../api/client';
import useAuthStore from '../stores/authStore';
const RR={admin:'Админ',hr:'HR',candidate:'Кандидат',support:'Техподд.'};
export default function AdminDashboard(){
  const[tab,_setTab]=useState(()=>sessionStorage.getItem('admin_tab')||'stats');const setTab=t=>{_setTab(t);sessionStorage.setItem('admin_tab',t)};const[stats,setStats]=useState(null);const[users,setUsers]=useState([]);const[audit,setAudit]=useState([]);
  const[userSearch,setUserSearch]=useState('');const[roleFilter,setRoleFilter]=useState('');const[auditFilter,setAuditFilter]=useState('');
  const[aiStatus,setAiStatus]=useState(null);const[aiChecking,setAiChecking]=useState(false);const[dbStatus,setDbStatus]=useState(null);
  const[companies,setCompanies]=useState([]);const[showPromote,setShowPromote]=useState(null);const[promoteType,setPromoteType]=useState('hr');const[promoteCompany,setPromoteCompany]=useState('');
  const[showCreate,setShowCreate]=useState(false);const[createForm,setCreateForm]=useState({email:'',full_name:'',role:'candidate',company_id:'',phone:''});const[createResult,setCreateResult]=useState(null);
  const[errorLog,setErrorLog]=useState('');const[auditModal,setAuditModal]=useState(null);
  const[aiDiagModal,setAiDiagModal]=useState(null);const[dbDiagModal,setDbDiagModal]=useState(null);
  const[dbTables,setDbTables]=useState([]);const[dbSelTable,setDbSelTable]=useState(null);const[dbRows,setDbRows]=useState(null);
  const[dbEditRow,setDbEditRow]=useState(null);const[dbEditData,setDbEditData]=useState({});
  const[userModal,setUserModal]=useState(null);const[blockModal,setBlockModal]=useState(null);const[blockReason,setBlockReason]=useState('spam');
  const[notifs,setNotifs]=useState([]);const[showNotifs,setShowNotifs]=useState(false);
  const[escalatedTickets,setEscalatedTickets]=useState([]);
  const[confirmAction,setConfirmAction]=useState(null);const[selEscTicket,setSelEscTicket]=useState(null);const[escReply,setEscReply]=useState('');const[escFilter,setEscFilter]=useState('open');
  const navigate=useNavigate();const user=useAuthStore(s=>s.user);const logout=useAuthStore(s=>s.logout);
  useEffect(()=>{loadAll();notificationsAPI.list().then(({data})=>setNotifs(data)).catch(()=>{});const iv=setInterval(()=>adminAPI.audit().then(({data})=>setAudit(data)).catch(()=>{}),45000);return()=>clearInterval(iv)},[]);
  const loadAll=()=>{supportAPI.tickets().then(({data})=>{const filtered=data.filter(t=>t.priority==='critical'||t.assigned_to);setEscalatedTickets(filtered);if(selEscTicket){const updated=filtered.find(t=>t.id===selEscTicket.id);if(updated)setSelEscTicket(updated)}}).catch(()=>{});adminAPI.stats().then(({data})=>setStats(data)).catch(()=>{});adminAPI.users().then(({data})=>setUsers(data)).catch(()=>{});adminAPI.audit().then(({data})=>setAudit(data)).catch(()=>{});adminAPI.companies().then(({data})=>setCompanies(data)).catch(()=>{})};
  const blockUser=async id=>{if(blockModal?.id===id){await adminAPI.blockUser(id);setBlockModal(null);loadAll()}else{const u=users.find(x=>x.id===id);if(u?.is_active){setBlockModal(u);setBlockReason('spam')}else{await adminAPI.blockUser(id);loadAll()}}};
  const confirmBlock=async()=>{if(!blockModal)return;await adminAPI.blockUser(blockModal.id);setBlockModal(null);loadAll()};
  const doPromote=async()=>{if(!showPromote)return;try{if(promoteType==='hr')await adminAPI.promoteHR(showPromote,+promoteCompany);else await adminAPI.promoteSupport(showPromote);setShowPromote(null);loadAll()}catch(e){alert(e.response?.data?.detail||'Ошибка')}};
  const demote=async(id,role)=>{try{if(role==='hr')await adminAPI.demoteHR(id);else await adminAPI.demoteSupport(id);loadAll()}catch{}};
  const checkAI=async()=>{setAiChecking(true);try{const{data}=await adminAPI.aiHealth();setAiStatus(data);const ts=new Date().toLocaleTimeString('ru');if(data.status==='error'){setErrorLog(p=>p+`[${ts}] AI ERROR\n${data.log||data.message}\n\n`)}else{setErrorLog(p=>p+`[${ts}] AI OK — ${data.provider}, ${data.response_time}ms\n`)}}catch(e){setAiStatus({status:'error',message:e.message});setErrorLog(p=>p+`[${new Date().toLocaleTimeString('ru')}] ${e.message}\n\n`)}finally{setAiChecking(false)}};
  const checkDB=async()=>{try{const{data}=await adminAPI.dbHealth();setDbStatus(data);const ts=new Date().toLocaleTimeString('ru');setErrorLog(p=>p+`[${ts}] DB ${data.status==='ok'?'OK':'ERROR'} — ${data.tables||0} tables, ${data.size||''}\n`)}catch(e){setDbStatus({status:'error'});setErrorLog(p=>p+`[${new Date().toLocaleTimeString('ru')}] DB: ${e.message}\n\n`)}};
  const deepAI=async()=>{try{const{data}=await adminAPI.aiDiagnostics();setAiDiagModal(data)}catch(e){setAiDiagModal({providers:[],error:e.message})}};
  const deepDB=async()=>{try{const{data}=await adminAPI.dbDiagnostics();setDbDiagModal(data)}catch(e){setDbDiagModal({tables:[],error:e.message})}};
  const createUser=async()=>{try{const{data}=await adminAPI.createUser({...createForm,company_id:createForm.company_id?+createForm.company_id:null});setCreateResult(data);loadAll()}catch(e){alert(e.response?.data?.detail||'Ошибка')}};
  const loadDbTables=async()=>{try{const{data}=await adminAPI.dbTables();setDbTables(data)}catch{}};
  const loadDbTable=async n=>{setDbSelTable(n);setDbEditRow(null);try{const{data}=await adminAPI.dbTableRows(n);setDbRows(data)}catch{}};
  const saveDbRow=async()=>{if(!dbEditRow||!dbSelTable)return;try{await adminAPI.dbUpdateRow(dbSelTable,dbEditRow,dbEditData);setDbEditRow(null);setDbEditData({});loadDbTable(dbSelTable);loadAll()}catch(e){alert(e.response?.data?.detail||'Ошибка сохранения')}};
  const deleteDbRow=(t,id)=>{setConfirmAction({title:'Удаление записи',message:`Удалить запись #${id} из таблицы ${t}?`,danger:true,confirmText:'Удалить',onConfirm:async()=>{try{await adminAPI.dbDeleteRow(t,id);loadDbTable(t);loadAll()}catch{}}})};
  const fU=users.filter(u=>{if(roleFilter&&u.role!==roleFilter)return false;if(userSearch&&!u.full_name.toLowerCase().includes(userSearch.toLowerCase())&&!u.email.toLowerCase().includes(userSearch.toLowerCase())&&String(u.id)!==userSearch)return false;return true});
  const fA=auditFilter?audit.filter(a=>a.action.toLowerCase().includes(auditFilter.toLowerCase())||a.user_name.toLowerCase().includes(auditFilter.toLowerCase())):audit;
  return(<div className="min-h-screen bg-gray-50 text-gray-900">
    <div className="bg-white border-b border-gray-200 px-6 py-3"><div className="flex items-center justify-between max-w-7xl mx-auto">
      <div className="flex items-center gap-3"><Shield className="w-6 h-6 text-red-600"/><h1 className="text-lg font-bold">Администратор</h1><span className="text-sm text-gray-600">{user?.full_name}</span></div>
      <div className="flex items-center gap-2">
        <div className="relative"><button onClick={()=>setShowNotifs(!showNotifs)} className="p-2 hover:bg-gray-50 rounded" title="Уведомления"><Bell className="w-4 h-4"/>{notifs.filter(n=>!n.is_read).length>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{notifs.filter(n=>!n.is_read).length}</span>}</button>{showNotifs&&<div className="absolute right-0 top-10 w-80 bg-gray-50 border border-gray-300 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"><div className="px-4 py-2 border-b border-gray-200 flex justify-between"><span className="text-sm font-semibold">Уведомления</span><button onClick={()=>{notificationsAPI.markAllRead();setNotifs(n=>n.map(x=>({...x,is_read:true})))}} className="text-xs text-blue-600">Все прочитано</button></div>{notifs.length===0?<div className="p-4 text-gray-600 text-sm">Нет</div>:notifs.map(n=><div key={n.id} className={`px-4 py-3 border-b border-gray-200/50 hover:bg-gray-50/30 cursor-pointer ${n.is_read?"opacity-50":""}`} onClick={()=>{notificationsAPI.markRead(n.id);setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,is_read:true}:x));setShowNotifs(false)}}><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-gray-600">{n.message}</div></div>)}</div>}</div>
        <button onClick={()=>setConfirmAction({title:'Выход',message:'Вы уверены, что хотите выйти из системы?',danger:false,confirmText:'Выйти',onConfirm:()=>{logout();navigate('/')}})} className="p-2 hover:bg-gray-50 rounded text-gray-600" title="Выйти"><LogOut className="w-4 h-4"/></button></div></div></div>
    <div className="max-w-7xl mx-auto p-6">
      {stats&&<div className="grid grid-cols-5 gap-4 mb-6">{[{l:'Всего',v:stats.total_users},{l:'Кандидатов',v:stats.candidates},{l:'HR',v:stats.hrs},{l:'Интервью',v:stats.interviews},{l:'Компаний',v:stats.companies}].map((c,i)=><div key={i} className="bg-white rounded-xl p-4"><div className="text-gray-600 text-xs mb-1">{c.l}</div><div className="text-2xl font-bold">{c.v}</div></div>)}</div>}
      <div className="flex gap-3 mb-5">{[['stats','Обзор'],['users','Пользователи'],['diagnostics','Диагностика'],['audit','Аудит'],['db_editor','Управление данными'],['escalations',`Эскалации${escalatedTickets.length>0?' ('+escalatedTickets.length+')':''}`]].filter(Boolean).map(([t,l])=><button key={t} onClick={()=>{setTab(t);if(t==='db_editor')loadDbTables()}} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab===t?'bg-blue-600':'bg-white hover:bg-gray-50'}`}>{l}</button>)}</div>

      {tab==='users'&&<div><div className="flex gap-3 mb-4"><div className="relative flex-1 max-w-md"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" placeholder="Поиск..."/></div>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm" title="Фильтр по роли"><option value="">Все роли</option><option value="admin">Админ</option><option value="hr">HR</option><option value="candidate">Кандидат</option><option value="support">Техподдержка</option></select>
        <button onClick={()=>{setShowCreate(true);setCreateResult(null);setCreateForm({email:'',full_name:'',role:'candidate',company_id:'',phone:''})}} className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm" title="Создать пользователя"><Plus className="w-4 h-4"/>Создать</button></div>
        <div className="bg-white rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200 text-gray-600 text-xs uppercase"><th className="px-3 py-3 w-14">ID</th><th className="text-left px-3 py-3">ФИО</th><th className="text-left px-3 py-3">Email</th><th className="text-center px-3 py-3">Роль</th><th className="text-center px-3 py-3">Действия</th></tr></thead>
        <tbody>{fU.map(u=>(<tr key={u.id} className="border-b border-gray-200/50 hover:bg-gray-50/30 cursor-pointer" onDoubleClick={async()=>{try{const{data}=await authAPI.userProfile(u.id);setUserModal({...u,...data})}catch{setUserModal(u)}}}>
          <td className="text-center px-3 py-2 text-gray-600">#{u.id}</td><td className="px-3 py-2">{u.full_name}</td><td className="px-3 py-2 text-gray-600">{u.email}</td>
          <td className="px-3 py-2 text-center"><span className={`text-xs px-1.5 py-0.5 rounded ${u.role==='admin'?'bg-red-100 text-red-600':u.role==='hr'?'bg-purple-100 text-purple-600':u.role==='support'?'bg-orange-500/20 text-orange-400':'bg-blue-100 text-blue-600'}`}>{RR[u.role]||u.role}</span></td>
          <td className="px-3 py-2 text-center"><div className="flex justify-center gap-1" onClick={e=>e.stopPropagation()}>
            {u.role!=='admin'&&<button onClick={()=>blockUser(u.id)} className="p-1 hover:bg-gray-300 rounded" title={u.is_active?'Заблокировать':'Разблокировать'}>{u.is_active?<Lock className="w-3.5 h-3.5 text-red-600"/>:<CheckCircle className="w-3.5 h-3.5 text-green-600"/>}</button>}
            {u.role==='candidate'&&<><button onClick={()=>{setShowPromote(u.id);setPromoteType('hr');setPromoteCompany(companies[0]?.id||'')}} className="p-1 hover:bg-gray-300 rounded" title="Назначить HR"><UserPlus className="w-3.5 h-3.5 text-purple-600"/></button><button onClick={()=>{setShowPromote(u.id);setPromoteType('support')}} className="p-1 hover:bg-gray-300 rounded" title="Назначить в техподдержку"><Headphones className="w-3.5 h-3.5 text-orange-400"/></button></>}
            {(u.role==='hr'||u.role==='support')&&<button onClick={()=>setConfirmAction({title:'Снятие прав',message:`Забрать права роли «${u.role==='hr'?'HR':'Техподдержка'}» у ${u.full_name}?`,danger:true,confirmText:'Забрать права',onConfirm:()=>demote(u.id,u.role)})} className="p-1 hover:bg-gray-300 rounded" title="Забрать права"><UserMinus className="w-3.5 h-3.5 text-orange-400"/></button>}
          </div></td></tr>))}</tbody></table></div></div>}

      {tab==='diagnostics'&&<div className="space-y-4"><div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-2xl border border-gray-200 cursor-pointer hover:border hover:border-blue-500 transition" onDoubleClick={deepAI} title="Двойной клик — детальная проверка"><Cpu className="w-5 h-5 text-blue-600 mb-3"/><h3 className="font-semibold mb-2">AI-модуль</h3>
          {aiStatus&&<div>{aiStatus.status==='ok'?<span className="text-green-600 text-sm">✓ Работает ({aiStatus.response_time}мс)</span>:<span className="text-red-600 text-sm">✗ Ошибка</span>}</div>}
          <button onClick={checkAI} disabled={aiChecking} className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs disabled:opacity-50 flex items-center gap-1"><RefreshCw className={`w-3 h-3 ${aiChecking?'animate-spin':''}`}/>Проверить</button></div>
        <div className="bg-white rounded-xl p-5 shadow-2xl border border-gray-200 cursor-pointer hover:border hover:border-green-500 transition" onDoubleClick={deepDB} title="Двойной клик — проверка каждой таблицы"><Database className="w-5 h-5 text-green-600 mb-3"/><h3 className="font-semibold mb-2">База данных</h3>
          {dbStatus&&<div>{dbStatus.status==='ok'?<span className="text-green-600 text-sm">✓ {dbStatus.tables} табл, {dbStatus.size}</span>:<span className="text-red-600 text-sm">✗ Ошибка</span>}</div>}
          <button onClick={checkDB} className="mt-3 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs flex items-center gap-1"><RefreshCw className="w-3 h-3"/>Проверить</button></div>
        <div className="bg-white rounded-xl p-5 shadow-2xl border border-gray-200"><Wifi className="w-5 h-5 text-purple-600 mb-3"/><h3 className="font-semibold mb-2">API-сервер</h3><span className="text-green-600 text-sm">✓ Работает</span><p className="text-xs text-gray-600 mt-1">FastAPI · порт 8000</p></div>
      </div>
      <div className="bg-white rounded-xl p-4"><div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-gray-600">Консоль</h3><div className="flex gap-2">
        {errorLog&&<><button onClick={()=>navigator.clipboard.writeText(errorLog)} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"><Copy className="w-3 h-3"/>Копировать</button><button onClick={()=>setErrorLog('')} className="text-xs text-gray-600 hover:text-red-600">Очистить</button></>}</div></div>
        <pre className="bg-gray-950 rounded-lg p-3 text-xs font-mono text-gray-600 min-h-[80px] max-h-[250px] overflow-y-auto whitespace-pre-wrap select-all">{errorLog||'Нажмите «Проверить» для запуска диагностики.'}</pre></div></div>}

      {tab==='audit'&&<div><div className="mb-4 flex gap-3"><div className="relative flex-1 max-w-md"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/><input value={auditFilter} onChange={e=>setAuditFilter(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" placeholder="Фильтр..."/></div>
        <button onClick={loadAll} className="px-3 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm flex items-center gap-1"><RefreshCw className="w-4 h-4"/>Обновить</button></div>
        <div className="bg-white rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200 text-gray-600 text-xs uppercase"><th className="text-left px-4 py-3">Время</th><th className="text-left px-4 py-3">Пользователь</th><th className="text-left px-4 py-3">Действие</th><th className="text-left px-4 py-3">Детали</th></tr></thead>
        <tbody>{fA.map(a=>(<tr key={a.id} className="border-b border-gray-200/50 hover:bg-gray-50/30 cursor-pointer" onDoubleClick={()=>setAuditModal(a)}><td className="px-4 py-2 text-gray-600">{new Date(a.timestamp).toLocaleString('ru')}</td><td className="px-4 py-2">{a.user_name}</td><td className="px-4 py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${a.action.includes('block')?'bg-red-100 text-red-600':a.action.includes('create')?'bg-green-100 text-green-600':a.action==='login'?'bg-blue-100 text-blue-600':'bg-gray-200 text-gray-600'}`}>{a.action}</span></td><td className="px-4 py-2 text-gray-600 max-w-xs truncate">{a.details?.description||a.details?.target_name||(a.details?JSON.stringify(a.details):'')}</td></tr>))}</tbody></table></div></div>}

      {tab==='stats'&&<div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200"><h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600"/>Последние действия</h3><div className="space-y-2">{audit.slice(0,10).map(a=>(<div key={a.id} className="text-sm"><span className="font-medium">{a.user_name}</span> <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{a.action}</span> <span className="text-xs text-gray-600">{new Date(a.timestamp).toLocaleString('ru')}</span></div>))}</div></div>
        <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200"><h3 className="font-semibold mb-4">По ролям</h3><div className="space-y-2">{Object.entries(RR).map(([k,v])=>{const c=users.filter(u=>u.role===k).length;return c>0&&<div key={k} className="flex justify-between text-sm"><span className="text-gray-600">{v}</span><span className="font-bold">{c}</span></div>})}</div></div>
      </div>}

      {/* DB EDITOR — horizontal table tabs on top */}
      {tab==='escalations'&&<div>
        <h2 className="text-xl font-bold mb-4">Эскалированные тикеты</h2>
        <div className="grid grid-cols-3 gap-4" style={{minHeight:'450px'}}>
          <div className="col-span-1 bg-white rounded-xl flex flex-col">
            <div className="flex border-b border-gray-200">
              {[['open','Активные'],['closed','Закрытые']].map(([k,l])=><button key={k} onClick={()=>{setEscFilter(k);setSelEscTicket(null)}} className={`flex-1 py-2.5 text-sm font-medium ${escFilter===k?'text-blue-600 border-b-2 border-blue-400':'text-gray-600 hover:text-gray-600'}`}>{l} ({escalatedTickets.filter(t=>k==='open'?t.status!=='closed':t.status==='closed').length})</button>)}
            </div>
            <div className="flex-1 overflow-y-auto" style={{maxHeight:"400px"}}>
              {escalatedTickets.filter(t=>escFilter==='open'?t.status!=='closed':t.status==='closed').length===0
                ?<div className="text-center py-10 text-gray-600 text-sm">{escFilter==='open'?'Нет активных эскалаций':'Нет закрытых'}</div>
                :escalatedTickets.filter(t=>escFilter==='open'?t.status!=='closed':t.status==='closed').map(t=>
                  <div key={t.id} onClick={()=>setSelEscTicket(t)} className={`px-4 py-3 border-b border-gray-200/50 cursor-pointer hover:bg-gray-50/30 ${selEscTicket?.id===t.id?'bg-blue-500/10 border-l-2 border-l-blue-500':''}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate flex-1">{t.subject}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 shrink-0 ${t.status==='closed'?'bg-green-100 text-green-600':t.priority==='critical'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-600'}`}>{t.status==='closed'?'Закрыт':t.priority}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">#{t.id} · {t.user_name}</div>
                  </div>)}
            </div>
          </div>
          <div className="col-span-2 bg-white rounded-xl flex flex-col">
            {selEscTicket?<>
              <div className="px-5 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center"><h3 className="font-semibold">{selEscTicket.subject}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${selEscTicket.status==='closed'?'bg-green-100 text-green-600':'bg-red-100 text-red-600'}`}>{selEscTicket.status==='closed'?'Закрыт':'Открыт'}</span></div>
                <div className="text-xs text-gray-600 mt-1">От: {selEscTicket.user_name} · Категория: {selEscTicket.category}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{maxHeight:"400px"}}>
                <div className="bg-gray-200/30 rounded-lg p-3"><p className="text-sm">{selEscTicket.message}</p><div className="text-xs text-gray-600 mt-1">{selEscTicket.user_name}</div></div>
                {selEscTicket.replies?.map((r,i)=><div key={i} className={`rounded-lg p-3 ${r.user_role==='admin'||r.user_role==='support'?'bg-purple-500/10 ml-8':'bg-gray-200/30'}`}><p className="text-sm">{r.message}</p><div className="text-xs text-gray-600 mt-1">{r.user_name}{r.user_role==='admin'?' (Администратор)':r.user_role==='support'?' (Поддержка)':''}</div></div>)}
              </div>
              {selEscTicket.status!=='closed'&&<div className="p-4 border-t border-gray-200"><div className="flex gap-2">
                <input value={escReply} onChange={e=>setEscReply(e.target.value)} onKeyDown={async e=>{if(e.key==='Enter'&&escReply.trim()){await supportAPI.reply(selEscTicket.id,escReply);setEscReply('');const{data}=await supportAPI.tickets();const filtered=data.filter(t=>t.priority==='critical'||t.assigned_to);setEscalatedTickets(filtered);const upd=filtered.find(t=>t.id===selEscTicket.id);if(upd)setSelEscTicket(upd)}}} className="flex-1 px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-sm" placeholder="Ответ администратора..."/>
                <button onClick={async()=>{if(!escReply.trim())return;await supportAPI.reply(selEscTicket.id,escReply);setEscReply('');const{data}=await supportAPI.tickets();const filtered=data.filter(t=>t.priority==='critical'||t.assigned_to);setEscalatedTickets(filtered);const upd=filtered.find(t=>t.id===selEscTicket.id);if(upd)setSelEscTicket(upd)}} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">Отправить</button>
                <button onClick={async()=>{await supportAPI.close(selEscTicket.id);const{data}=await supportAPI.tickets();const filtered=data.filter(t=>t.priority==='critical'||t.assigned_to);setEscalatedTickets(filtered);const upd=filtered.find(t=>t.id===selEscTicket.id);if(upd)setSelEscTicket(upd);else setSelEscTicket(null)}} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm">Закрыть</button>
              </div></div>}
            </>:<div className="flex items-center justify-center h-full text-gray-600">Выберите тикет</div>}
          </div>
        </div>
      </div>}
      
      {tab==='db_editor'&&<div>
        <div className="flex flex-wrap gap-2 mb-4">{dbTables.map(t=><button key={t.name} onClick={()=>loadDbTable(t.name)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dbSelTable===t.name?'bg-blue-600':'bg-white hover:bg-gray-50'}`} title={`${t.count} записей`}>{t.name} ({t.count})</button>)}</div>
        {dbRows?<div className="bg-white rounded-xl overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-gray-200 text-gray-600">{dbRows.columns.map(c=><th key={c} className="px-2 py-2 text-left whitespace-nowrap">{c}</th>)}<th className="px-2 py-2 w-16">—</th></tr></thead>
        <tbody>{dbRows.rows.map((r,ri)=><tr key={ri} className="border-b border-gray-200/50 hover:bg-gray-50/20">{dbRows.columns.map(c=><td key={c} className="px-2 py-1.5 max-w-[200px] truncate" title={String(r[c]??'')}>
          {dbEditRow===r.id&&c!=='id'?<input value={c in dbEditData?dbEditData[c]:(r[c]??'')} onChange={e=>setDbEditData({...dbEditData,[c]:e.target.value})} className="w-full bg-gray-200 px-1 py-0.5 rounded text-xs border border-gray-300 focus:border-blue-500 focus:outline-none"/>:String(r[c]??'')}</td>)}
          <td className="px-2 py-1.5 whitespace-nowrap">{dbEditRow===r.id?<div className="flex gap-1"><button onClick={saveDbRow} className="p-0.5 hover:bg-green-600 rounded" title="Сохранить"><Save className="w-3 h-3 text-green-600"/></button><button onClick={()=>{setDbEditRow(null);setDbEditData({})}} className="p-0.5 hover:bg-gray-300 rounded" title="Отмена"><X className="w-3 h-3"/></button></div>:
            <div className="flex gap-1"><button onClick={()=>{setDbEditRow(r.id);setDbEditData({})}} className="p-0.5 hover:bg-gray-300 rounded" title="Редактировать"><Edit className="w-3 h-3 text-blue-600"/></button><button onClick={()=>deleteDbRow(dbSelTable,r.id)} className="p-0.5 hover:bg-gray-300 rounded" title="Удалить"><Trash2 className="w-3 h-3 text-red-600"/></button></div>}</td></tr>)}</tbody></table></div>:<div className="text-gray-600 text-center py-16 bg-white rounded-xl">Выберите таблицу</div>}
      </div>}
    </div>

    {auditModal&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-lg">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">Действие #{auditModal.id}</h3><button onClick={()=>setAuditModal(null)}><X className="w-5 h-5 text-gray-600"/></button></div>
      <div className="space-y-3 text-sm">
        <div><span className="text-gray-600">Время:</span> {new Date(auditModal.timestamp).toLocaleString('ru')}</div>
        <div><span className="text-gray-600">Пользователь:</span> <button onClick={()=>{setAuditModal(null);if(auditModal.user_id)navigate(`/user/${auditModal.user_id}`)}} className="text-blue-600 hover:underline">{auditModal.user_name}</button></div>
        <div><span className="text-gray-600">Действие:</span> <span className="px-2 py-0.5 rounded text-xs bg-gray-200">{auditModal.action}</span></div>
        <div><span className="text-gray-600">Детали:</span><pre className="mt-1 bg-gray-950 rounded p-3 text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">{auditModal.details?JSON.stringify(auditModal.details,null,2):'—'}</pre></div>
      </div><button onClick={()=>setAuditModal(null)} className="mt-4 w-full py-2 bg-gray-200 rounded-lg text-sm">Закрыть</button></div></div>}

    {aiDiagModal&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-lg">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">Диагностика AI-провайдеров</h3><button onClick={()=>setAiDiagModal(null)}><X className="w-5 h-5 text-gray-600"/></button></div>
      <div className="space-y-3">{aiDiagModal.providers?.map((p,i)=><div key={i} className="bg-gray-200 rounded-lg p-4"><div className="flex justify-between mb-1"><span className="font-semibold">{p.name}</span><span className={`text-xs px-2 py-0.5 rounded ${p.status==='ok'?'bg-green-100 text-green-600':p.status==='not_configured'?'bg-yellow-100 text-yellow-600':'bg-red-100 text-red-600'}`}>{p.status}</span></div>
        <div className="text-xs text-gray-600">{p.url}</div>{p.time&&<div className="text-xs text-gray-600">Ответ: {p.time}мс</div>}{p.error&&<div className="text-xs text-red-600 mt-1">{p.error}</div>}</div>)}</div>
      <button onClick={()=>setAiDiagModal(null)} className="mt-4 w-full py-2 bg-gray-200 rounded-lg text-sm">Закрыть</button></div></div>}

    {dbDiagModal&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">Диагностика базы данных</h3><button onClick={()=>setDbDiagModal(null)}><X className="w-5 h-5 text-gray-600"/></button></div>
      <div className="mb-3 flex gap-4 text-sm"><span className="text-gray-600">Размер: <span className="text-gray-900 font-bold">{dbDiagModal.size}</span></span><span className="text-gray-600">Целостность: <span className={dbDiagModal.integrity==='ok'?'text-green-600':'text-red-600'}>{dbDiagModal.integrity}</span></span></div>
      <div className="space-y-1">{dbDiagModal.tables?.map((t,i)=><div key={i} className="flex justify-between items-center bg-gray-200 rounded px-3 py-2 text-sm"><span>{t.name}</span><div className="flex items-center gap-3"><span className="text-xs text-gray-600">{t.rows} записей</span><span className={t.status==='ok'?'text-green-600 text-xs':'text-red-600 text-xs'}>{t.status==='ok'?'✓':'✗'}</span></div></div>)}</div>
      <button onClick={()=>setDbDiagModal(null)} className="mt-4 w-full py-2 bg-gray-200 rounded-lg text-sm">Закрыть</button></div></div>}

    {showPromote&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-96">
      <h3 className="font-semibold mb-4">Назначить {promoteType==='hr'?'HR':'Техподдержку'}</h3>
      {promoteType==='hr'&&<div className="mb-4"><label className="text-sm text-gray-600 block mb-1">Компания</label><select value={promoteCompany} onChange={e=>setPromoteCompany(e.target.value)} className="w-full bg-gray-200 border border-gray-300 rounded-lg px-3 py-2 text-sm">{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
      <div className="flex justify-end gap-2"><button onClick={()=>setShowPromote(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={doPromote} className="px-4 py-2 bg-purple-600 rounded-lg text-sm">Назначить</button></div></div></div>}
    {showCreate&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-md">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">Создать пользователя</h3><button onClick={()=>setShowCreate(false)}><X className="w-5 h-5 text-gray-600"/></button></div>
      {createResult?(<div className="space-y-3"><div className="bg-green-500/10 border border-green-500 rounded-lg p-4"><p className="text-green-600 font-semibold">Создан! ID: #{createResult.user_id}</p><p className="text-sm text-gray-600 mt-2">Пароль: <span className="font-mono bg-gray-200 px-2 py-0.5 rounded select-all">{createResult.temp_password}</span></p></div>
        <button onClick={()=>setShowCreate(false)} className="w-full py-2 bg-gray-200 rounded-lg text-sm">OK</button></div>):(
      <div className="space-y-3">
        <div><label className="text-sm text-gray-600 block mb-1">ФИО</label><input value={createForm.full_name} onChange={e=>setCreateForm({...createForm,full_name:e.target.value})} className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-sm" placeholder="Иванов Иван"/></div>
        <div><label className="text-sm text-gray-600 block mb-1">Email</label><input value={createForm.email} onChange={e=>setCreateForm({...createForm,email:e.target.value})} className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-sm" placeholder="user@mail.ru"/></div>
        <div><label className="text-sm text-gray-600 block mb-1">Роль</label><select value={createForm.role} onChange={e=>setCreateForm({...createForm,role:e.target.value})} className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-sm"><option value="candidate">Кандидат</option><option value="hr">HR</option><option value="support">Техподдержка</option></select></div>
        {createForm.role==='hr'&&<div><label className="text-sm text-gray-600 block mb-1">Компания</label><select value={createForm.company_id} onChange={e=>setCreateForm({...createForm,company_id:e.target.value})} className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-sm"><option value="">—</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
        <div className="flex justify-end gap-2"><button onClick={()=>setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={createUser} disabled={!createForm.email||!createForm.full_name} className="px-4 py-2 bg-blue-600 rounded-lg text-sm disabled:opacity-50">Создать</button></div></div>)}</div></div>}

    {/* User Profile Modal */}
    {userModal&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-md">
      <div className="flex justify-between mb-4"><h3 className="font-semibold text-lg">Профиль пользователя</h3><button onClick={()=>setUserModal(null)}><X className="w-5 h-5 text-gray-600"/></button></div>
      <div className="text-center mb-4"><div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl text-blue-600 mx-auto mb-3">{(userModal.full_name||'?')[0]}</div>
        <h4 className="text-lg font-semibold">{userModal.full_name}</h4>
        <span className={`text-xs px-2 py-0.5 rounded ${userModal.role==='admin'?'bg-red-100 text-red-600':userModal.role==='hr'?'bg-purple-100 text-purple-600':userModal.role==='support'?'bg-orange-500/20 text-orange-400':'bg-blue-100 text-blue-600'}`}>{RR[userModal.role]||userModal.role}</span></div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">ID</span><span>#{userModal.id}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Email</span><span>{userModal.email}</span></div>
        {userModal.phone&&<div className="flex justify-between"><span className="text-gray-600">Телефон</span><span>{userModal.phone}</span></div>}
        {userModal.company_name&&<div className="flex justify-between"><span className="text-gray-600">Компания</span><span>{userModal.company_name}</span></div>}
        <div className="flex justify-between"><span className="text-gray-600">Статус</span><span className={userModal.is_active?'text-green-600':'text-red-600'}>{userModal.is_active?'Активен':'Заблокирован'}</span></div>
      </div>
      <div className="flex gap-2 mt-5"><button onClick={()=>{setUserModal(null);navigate(`/user/${userModal.id}`)}} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">Открыть профиль</button><button onClick={()=>setUserModal(null)} className="flex-1 py-2 bg-gray-200 rounded-lg text-sm">Закрыть</button></div>
    </div></div>}

    {/* Block Reason Modal */}
    {blockModal&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-sm">
      <h3 className="font-semibold mb-4">Блокировка: {blockModal.full_name}</h3>
      <div className="mb-4"><label className="text-sm text-gray-600 block mb-2">Причина блокировки</label>
        <select value={blockReason} onChange={e=>setBlockReason(e.target.value)} className="w-full bg-gray-200 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="spam">Спам / Нежелательная активность</option>
          <option value="cheating">Мошенничество на собеседовании</option>
          <option value="abuse">Оскорбления / Нарушение правил</option>
          <option value="fake">Поддельный аккаунт</option>
          <option value="inactive">Неактивный аккаунт</option>
          <option value="other">Другое</option>
        </select></div>
      <div className="flex gap-2"><button onClick={()=>setBlockModal(null)} className="flex-1 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={confirmBlock} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Заблокировать</button></div>
    </div></div>}

    {/* Confirm Dialog */}
    {confirmAction&&<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"><div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-96">
      <h3 className="font-semibold mb-3">{confirmAction.title}</h3>
      <p className="text-sm text-gray-600 mb-5">{confirmAction.message}</p>
      <div className="flex gap-2 justify-end"><button onClick={()=>setConfirmAction(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Отмена</button><button onClick={()=>{confirmAction.onConfirm();setConfirmAction(null)}} className={`px-4 py-2 rounded-lg text-sm ${confirmAction.danger?'bg-red-600 hover:bg-red-700':'bg-blue-600 hover:bg-blue-700'}`}>{confirmAction.confirmText||'Подтвердить'}</button></div>
    </div></div>}
  </div>);
}
