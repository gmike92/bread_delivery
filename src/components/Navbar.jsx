import { NavLink } from 'react-router-dom';
import { Home, Users, Truck, BarChart3, Settings } from 'lucide-react';

const Navbar = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/delivery', icon: Truck, label: 'Deliver' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-bread-200 shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-bread-100 text-bread-700'
                  : 'text-bread-400 hover:text-bread-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="mb-1"
                />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;

