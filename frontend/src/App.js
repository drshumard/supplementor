import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Toaster } from 'sonner';
import { setAuthToken } from './lib/api';
import DashboardPage from './pages/DashboardPage';
import PlanEditorPage from './pages/PlanEditorPage';
import NewPlanPage from './pages/NewPlanPage';
import SupplementsPage from './pages/SupplementsPage';
import TemplatesPage from './pages/TemplatesPage';
import UsersPage from './pages/UsersPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AppShell from './components/AppShell';
import './App.css';

// App user context — holds the local DB user (with role)
const AppUserContext = createContext(null);
export const useAppUser = () => useContext(AppUserContext);

// Also export useAuth for backward compat (maps to app user)
export const useAuth = () => {
  const ctx = useContext(AppUserContext);
  return {
    user: ctx?.appUser,
    loading: ctx?.loading,
    logout: ctx?.signOut,
  };
};

function AppUserProvider({ children }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn || !clerkUser) {
      setAppUser(null);
      setLoading(false);
      setAuthToken(null);
      return;
    }

    // Sync with our backend — get or create local user
    const syncUser = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setTimeout(syncUser, 2000);
          return;
        }
        // Store token for all future API calls
        setAuthToken(token);
        const backendUrl = (process.env.REACT_APP_BACKEND_URL || '') + '/api/auth/sync';
        const res = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            clerk_user_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || '',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAppUser(data);
        } else {
          const err = await res.text();
          console.error('Sync failed:', res.status, err);
        }
      } catch (err) {
        console.error('Failed to sync user:', err);
      } finally {
        setLoading(false);
      }
    };
    syncUser();
    
    // Refresh token every 50s (Clerk tokens expire after ~60s)
    const refresh = setInterval(async () => {
      try { const t = await getToken(); if (t) setAuthToken(t); } catch {}
    }, 50000);
    return () => clearInterval(refresh);
  }, [isSignedIn, clerkLoaded, clerkUser, getToken]);

  return (
    <AppUserContext.Provider value={{ appUser, loading, signOut }}>
      {children}
    </AppUserContext.Provider>
  );
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
      <div className="text-center">
        <img src="https://portal-drshumard.b-cdn.net/logo.png" alt="Dr. Shumard" className="h-10 w-auto mx-auto mb-8" />
        <SignIn routing="hash" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { appUser, loading } = useContext(AppUserContext);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!appUser) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { isSignedIn, isLoaded } = useClerkAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
        <div className="w-8 h-8 border-2 border-[#0D5F68] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:patientId" element={<PatientDetailPage />} />
          <Route path="/plans/new" element={<NewPlanPage />} />
          <Route path="/plans/:planId" element={<PlanEditorPage />} />
          <Route path="/admin/supplements" element={<SupplementsPage />} />
          <Route path="/admin/templates" element={<TemplatesPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppUserProvider>
        <Toaster position="top-right" richColors closeButton />
        <AppRoutes />
      </AppUserProvider>
    </BrowserRouter>
  );
}

export default App;
