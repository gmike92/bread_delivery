import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-bread-50">
      {/* Decorative Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-bread-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-crust-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-bread-300/20 rounded-full blur-2xl"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10">
        <Outlet />
      </main>

      {/* Bottom Navigation - Hidden on login page */}
      {!isLoginPage && <Navbar />}
    </div>
  );
};

export default Layout;

