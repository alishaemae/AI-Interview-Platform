import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:8000', headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c });
api.interceptors.response.use(r => r, e => { if (e.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.hash = '#/login' } return Promise.reject(e) });

export const notificationsAPI = {
  list: () => api.get('/api/auth/notifications'),
  markRead: id => api.post(`/api/auth/notifications/${id}/read`),
  markAllRead: () => api.post('/api/auth/notifications/read-all'),
};
export const authAPI = { register: d => api.post('/api/auth/register', d), login: d => api.post('/api/auth/login', d), me: () => api.get('/api/auth/me'), userProfile: id => api.get(`/api/auth/user/${id}`), verify: code => api.post('/api/auth/verify', { code }), resendCode: () => api.post('/api/auth/resend-code'), resendCodePhone: () => api.post('/api/auth/resend-code-phone'), updateProfile: d => api.put('/api/auth/profile', d) };
export const interviewAPI = { create: (level, specialty) => api.post('/api/interviews/', { level, specialty: specialty || 'developer' }), start: id => api.post(`/api/interviews/${id}/start`), get: id => api.get(`/api/interviews/${id}`), getCurrentTask: id => api.get(`/api/interviews/${id}/current-task`), submitSolution: (iid, tid, d) => api.post(`/api/interviews/${iid}/tasks/${tid}/submit`, d), myInterviews: () => api.get('/api/interviews/my'), report: id => api.get(`/api/interviews/${id}/report`) };
export const chatAPI = { send: d => api.post('/api/chat/send', d), history: id => api.get(`/api/chat/${id}/history`) };
export const hrAPI = { candidates: p => api.get('/api/hr/candidates', { params: p }), candidateSessions: id => api.get(`/api/hr/candidate/${id}/sessions`), sessionTasks: id => api.get(`/api/hr/session/${id}/tasks`), replayData: id => api.get(`/api/hr/session/${id}/replay`), analytics: () => api.get('/api/hr/analytics'), exportPDF: sid => api.get(`/api/hr/report/session/${sid}/pdf`, { responseType: 'blob' }), exportXLSX: () => api.get('/api/hr/report/export/xlsx', { responseType: 'blob' }), setDecision: (sid, d) => api.post(`/api/hr/session/${sid}/decision`, { decision: d }), compare: ids => api.get('/api/hr/compare', { params: { ids: ids.join(',') } }), sessionCode: sid => api.get(`/api/hr/session/${sid}/code`), userProfile: id => api.get(`/api/auth/user/${id}`) };
export const metricsAPI = { recordEvent: d => api.post('/api/metrics/event', d) };
export const anticheatAPI = { reportEvent: d => api.post('/api/anticheat/event', d) };
export const messagesAPI = { send: (to, content) => api.post('/api/messages/send', { to_user_id: to, content }), conversations: () => api.get('/api/messages/conversations'), withUser: uid => api.get(`/api/messages/with/${uid}`), searchUsers: q => api.get('/api/messages/search', { params: { q } }), unreadCount: () => api.get('/api/messages/unread-count') };
export const vacanciesAPI = { list: () => api.get('/api/vacancies/'), my: () => api.get('/api/vacancies/my'), get: id => api.get(`/api/vacancies/${id}`), create: d => api.post('/api/vacancies/', d), update: (id, d) => api.put(`/api/vacancies/${id}`, d), remove: id => api.delete(`/api/vacancies/${id}`) };
export const adminAPI = {
  dbTables: () => api.get('/api/admin/db/tables'),
  dbTableRows: (name,limit=50,offset=0) => api.get(`/api/admin/db/table/${name}?limit=${limit}&offset=${offset}`),
  dbUpdateRow: (table,id,data) => api.put(`/api/admin/db/table/${table}/${id}`,data),
  dbDeleteRow: (table,id) => api.delete(`/api/admin/db/table/${table}/${id}`),
  aiDiagnostics: () => api.get('/api/admin/ai-diagnostics'),
  dbDiagnostics: () => api.get('/api/admin/db-diagnostics'), users: () => api.get('/api/admin/users'), blockUser: id => api.post(`/api/admin/users/${id}/block`), stats: () => api.get('/api/admin/stats'), audit: () => api.get('/api/admin/audit'), companies: () => api.get('/api/admin/companies'), aiHealth: () => api.get('/api/admin/ai-health'), dbHealth: () => api.get('/api/admin/db-health'), promoteHR: (uid, cid) => api.post(`/api/admin/users/${uid}/promote-hr`, { company_id: cid }), demoteHR: uid => api.post(`/api/admin/users/${uid}/demote-hr`), promoteSupport: uid => api.post(`/api/admin/users/${uid}/promote-support`), demoteSupport: uid => api.post(`/api/admin/users/${uid}/demote-support`), createUser: d => api.post('/api/admin/users/create', d) };
export const supportAPI = { createTicket: d => api.post('/api/support/tickets', d), tickets: () => api.get('/api/support/tickets'), reply: (id, msg) => api.post(`/api/support/tickets/${id}/reply`, { message: msg }), close: id => api.post(`/api/support/tickets/${id}/close`), escalate: id => api.post(`/api/support/tickets/${id}/escalate`), myStats: () => api.get('/api/support/my-stats') };
export const shareAPI = { getLink: (type, id) => api.get(`/api/auth/share/${type}/${id}`) };
export default api;
