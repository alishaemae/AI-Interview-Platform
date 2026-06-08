import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import InterviewSelector from './pages/InterviewSelector';
import InterviewWorkspace from './pages/InterviewWorkspace';
import Results from './pages/Results';
import HRDashboard from './pages/HRDashboard';
import HRReplay from './pages/HRReplay';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import UserProfileView from './pages/UserProfileView';
import Vacancies from './pages/Vacancies';
import AdminDashboard from './pages/AdminDashboard';
import SupportDashboard from './pages/SupportDashboard';
import VacancyDetail from './pages/VacancyDetail';
import SupportRequest from './pages/SupportRequest';

function P({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/interviews" element={<P roles={['candidate']}><InterviewSelector /></P>} />
        <Route path="/interview/:interviewId" element={<P roles={['candidate']}><InterviewWorkspace /></P>} />
        <Route path="/results/:interviewId" element={<P roles={['candidate']}><Results /></P>} />
        <Route path="/vacancies" element={<P roles={['candidate']}><Vacancies /></P>} />
        <Route path="/hr/dashboard" element={<P roles={['hr']}><HRDashboard /></P>} />
        <Route path="/hr/replay/:sessionId" element={<P roles={['hr']}><HRReplay /></P>} />
        <Route path="/admin" element={<P roles={['admin']}><AdminDashboard /></P>} />
        <Route path="/support" element={<P roles={['support']}><SupportDashboard /></P>} />
        <Route path="/support-request" element={<P roles={['candidate','hr','admin','support']}><SupportRequest /></P>} />
        <Route path="/vacancy/:id" element={<P roles={['candidate','hr','admin','support']}><VacancyDetail /></P>} />
        <Route path="/messages" element={<P roles={['candidate','hr','admin','support']}><Messages /></P>} />
        <Route path="/profile" element={<P roles={['candidate','hr','admin','support']}><Profile /></P>} />
        <Route path="/user/:userId" element={<P roles={['candidate','hr','admin','support']}><UserProfileView /></P>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
}
