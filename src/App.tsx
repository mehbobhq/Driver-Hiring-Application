import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DriverPortal } from './components/driver/DriverPortal';

function AppContent() {
  const { admin, loading } = useAuth();
  const [route, setRoute] = useState<string>('');

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash);
    updateRoute();
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  // Driver invite link: #invite/<token>
  const inviteMatch = route.match(/^#invite\/(.+)$/);
  if (inviteMatch) {
    return <DriverPortal inviteToken={inviteMatch[1]} />;
  }

  // Admin routes
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
