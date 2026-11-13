import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { isSignedIn } from './lib/api';
import Home from './pages/Home';
import PlayerProfile from './pages/PlayerProfile';
import Tournament from './pages/Tournament';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminTournaments from './pages/AdminTournaments';
import AdminTournament from './pages/AdminTournament';

// Admin pages need a valid session; the API enforces it too.
function RequireAdmin({ children }) {
  const [state, setState] = useState('checking');
  useEffect(() => {
    isSignedIn().then((ok) => setState(ok ? 'in' : 'out'));
  }, []);
  if (state === 'checking') return <p className="text-center text-sm text-muted py-20">Loading…</p>;
  if (state === 'out') return <Navigate to="/admin/login" replace />;
  return children;
}

const admin = (page) => <RequireAdmin>{page}</RequireAdmin>;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/tournaments/:id" element={<Tournament />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={admin(<AdminDashboard />)} />
        <Route path="/admin/tournaments" element={admin(<AdminTournaments />)} />
        <Route path="/admin/tournaments/:id" element={admin(<AdminTournament />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
