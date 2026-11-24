import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { isSignedIn } from './lib/api';
import { LeagueProvider } from './lib/league';
import AppShell from './components/AppShell';
import Home from './pages/Home';
import Standings from './pages/Standings';
import Players from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import Matches from './pages/Matches';
import ReportMatch from './pages/ReportMatch';
import Approvals from './pages/Approvals';
import Statistics from './pages/Statistics';
import HeadToHead from './pages/HeadToHead';
import MatchHistory from './pages/MatchHistory';
import HallOfFame from './pages/HallOfFame';
import Tournaments from './pages/Tournaments';
import Tournament from './pages/Tournament';
import More from './pages/More';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminShell';
import AdminOverview from './pages/AdminOverview';
import AdminApprovals from './pages/AdminApprovals';
import AdminPlayers from './pages/AdminPlayers';
import AdminTrophies from './pages/AdminTrophies';
import AdminSeasons from './pages/AdminSeasons';
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

// League data is loaded once for the public pages; admin pages fetch their own.
function PublicLayout() {
  return (
    <LeagueProvider>
      <AppShell />
    </LeagueProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public pages share the sidebar / bottom-navigation shell. */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:id" element={<PlayerProfile />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/report" element={<ReportMatch />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/stats" element={<Statistics />} />
          <Route path="/head-to-head" element={<HeadToHead />} />
          <Route path="/history" element={<MatchHistory />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<Tournament />} />
          <Route path="/more" element={<More />} />
        </Route>

        {/* Every admin section shares the admin shell. */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={admin(<AdminLayout />)}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/players" element={<AdminPlayers />} />
          <Route path="/admin/trophies" element={<AdminTrophies />} />
          <Route path="/admin/seasons" element={<AdminSeasons />} />
          <Route path="/admin/tournaments" element={<AdminTournaments />} />
          <Route path="/admin/tournaments/:id" element={<AdminTournament />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
