import { NavLink } from 'react-router-dom';
import { Home, Users, Truck, BarChart3, Settings, ShoppingBag, Package, Euro, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isCliente, isAutista, isAdmin } = useAuth();

  // Navigation items based on role
  let navItems;
  
  if (isCliente) {
    navItems = [
      { to: '/', icon: Home, label: 'Home' },
      { to: '/ordine', icon: ShoppingBag, label: 'Ordina' },
      { to: '/ricorrenti', icon: RefreshCw, label: 'Ricorrenti' },
      { to: '/settings', icon: Settings, label: 'Profilo' },
    ];
  } else if (isAdmin) {
    // Admin sees everything including Contabilità
    navItems = [
      { to: '/', icon: Home, label: 'Home' },
      { to: '/ordini', icon: Package, label: 'Ordini' },
      { to: '/ricorrenti', icon: RefreshCw, label: 'Ricorrenti' },
      { to: '/delivery', icon: Truck, label: 'Consegna' },
      { to: '/contabilita', icon: Euro, label: 'Conti' },
      { to: '/settings', icon: Settings, label: 'Altro' },
    ];
  } else {
    // Autista - no Contabilità
    navItems = [
      { to: '/', icon: Home, label: 'Home' },
      { to: '/ordini', icon: Package, label: 'Ordini' },
      { to: '/ricorrenti', icon: RefreshCw, label: 'Ricorrenti' },
      { to: '/delivery', icon: Truck, label: 'Consegna' },
      { to: '/settings', icon: Settings, label: 'Altro' },
    ];
  }

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

