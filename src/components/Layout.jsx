import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff, Wifi } from 'lucide-react';
import Navbar from './Navbar';

const Layout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bread-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-slide-down">
          <WifiOff size={18} />
          <span>You're offline - changes will sync when connected</span>
        </div>
      )}

      {/* Back Online Toast */}
      {showOnlineToast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-bread flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-slide-down">
          <Wifi size={18} />
          <span>Back online - syncing data...</span>
        </div>
      )}

      {/* Decorative Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-bread-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-crust-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-bread-300/20 rounded-full blur-2xl"></div>
      </div>

      {/* Main Content */}
      <main className={`relative z-10 ${!isOnline ? 'pt-10' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation - Hidden on login page */}
      {!isLoginPage && <Navbar />}
    </div>
  );
};

export default Layout;

