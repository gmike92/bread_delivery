import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Users, Package, BarChart3, Plus, RefreshCw, ShoppingBag, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTodayDeliveries, getCustomers, calculateDeliverySummary, getOrdersByDate, getOrdersByCustomer } from '../firebase/firestore';

const Dashboard = () => {
  const { isCliente, user, userProfile } = useAuth();
  const [todayStats, setTodayStats] = useState({
    deliveryCount: 0,
    customerCount: 0,
    totalItems: 0,
    productSummary: [],
    todayOrders: 0,
    myOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (isCliente) {
        // Client view - load their orders
        const myOrders = user ? await getOrdersByCustomer(user.uid) : [];
        const pendingOrders = myOrders.filter(o => o.status === 'pending').length;
        
        setTodayStats({
          deliveryCount: 0,
          customerCount: 0,
          totalItems: 0,
          productSummary: [],
          todayOrders: pendingOrders,
          myOrders: myOrders.slice(0, 3) // Last 3 orders
        });
      } else {
        // Driver/Admin view
        const [deliveries, customers, todayOrders] = await Promise.all([
          getTodayDeliveries(),
          getCustomers(),
          getOrdersByDate(new Date().toISOString().split('T')[0])
        ]);

        const summary = calculateDeliverySummary(deliveries);
        const totalItems = summary.reduce((acc, item) => acc + item.totalQuantity, 0);

        setTodayStats({
          deliveryCount: deliveries.length,
          customerCount: customers.length,
          totalItems,
          productSummary: summary.slice(0, 5),
          todayOrders: todayOrders.length,
          myOrders: []
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = () => {
    return new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-bread-600 font-medium">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Client Dashboard
  if (isCliente) {
    return (
      <div className="page-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-2xl font-display font-bold text-bread-800">
              Ciao, {userProfile?.name || 'Cliente'}! 👋
            </h1>
            <p className="text-bread-600 mt-1">{formatDate()}</p>
          </div>
          <button
            onClick={() => loadData(true)}
            className="btn-icon"
            disabled={refreshing}
          >
            <RefreshCw size={22} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Quick Actions */}
        <Link to="/ordine" className="btn-primary mb-6 animate-slide-up stagger-1">
          <ShoppingBag size={24} />
          <span>Effettua Ordine</span>
        </Link>

        {/* Pending Orders */}
        {todayStats.todayOrders > 0 && (
          <div className="card mb-6 animate-slide-up stagger-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Package size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-bread-800">Ordini in attesa</h3>
                <p className="text-2xl font-display font-bold text-amber-600">{todayStats.todayOrders}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Orders */}
        {todayStats.myOrders.length > 0 && (
          <div className="animate-slide-up stagger-3">
            <h2 className="text-lg font-display font-semibold text-bread-700 mb-4">
              Ultimi Ordini
            </h2>
            <div className="space-y-3">
              {todayStats.myOrders.map((order, index) => (
                <div key={order.id} className="card !p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-bread-500" />
                      <span className="text-sm text-bread-600">
                        {order.deliveryDate?.toDate?.().toLocaleDateString('it-IT') || 'N/D'}
                      </span>
                    </div>
                    <span className={`badge text-xs ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      'bg-bread-100 text-bread-700'
                    }`}>
                      {order.status === 'pending' ? 'In attesa' :
                       order.status === 'confirmed' ? 'Confermato' : 'Consegnato'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {order.items?.slice(0, 3).map((item, i) => (
                      <span key={i} className="text-xs text-bread-600">
                        {item.product} ({item.quantity})
                        {i < Math.min(order.items.length - 1, 2) ? ',' : ''}
                      </span>
                    ))}
                    {order.items?.length > 3 && (
                      <span className="text-xs text-bread-400">+{order.items.length - 3}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Link to="/ordine" className="block mt-4 text-center text-bread-600 font-medium">
              Vedi tutti gli ordini →
            </Link>
          </div>
        )}

        {/* Empty State */}
        {todayStats.myOrders.length === 0 && (
          <div className="card text-center py-10 animate-slide-up stagger-2">
            <div className="text-6xl mb-4">🍞</div>
            <h3 className="text-xl font-display font-semibold text-bread-700 mb-2">
              Nessun ordine recente
            </h3>
            <p className="text-bread-500 mb-6">
              Effettua il tuo primo ordine!
            </p>
            <Link to="/ordine" className="btn-primary max-w-xs mx-auto">
              <ShoppingBag size={24} />
              Ordina Ora
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Driver/Admin Dashboard
  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-bread-800">
            Buongiorno! 🌅
          </h1>
          <p className="text-bread-600 mt-1">{formatDate()}</p>
        </div>
        <button
          onClick={() => loadData(true)}
          className="btn-icon"
          disabled={refreshing}
        >
          <RefreshCw size={22} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Today's Orders Alert */}
      {todayStats.todayOrders > 0 && (
        <Link to="/ordini" className="block mb-6 animate-slide-up stagger-1">
          <div className="card bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-200 rounded-full flex items-center justify-center">
                <Package size={28} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Ordini di Oggi</h3>
                <p className="text-2xl font-display font-bold text-amber-700">{todayStats.todayOrders} ordini</p>
              </div>
              <span className="text-amber-600">→</span>
            </div>
          </div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8 animate-slide-up stagger-1">
        <Link to="/delivery" className="btn-primary">
          <Plus size={24} />
          <span>Nuova Consegna</span>
        </Link>
        <Link to="/customers" className="btn-secondary">
          <Users size={24} />
          <span>Clienti</span>
        </Link>
      </div>

      {/* Today's Stats */}
      <h2 className="text-lg font-display font-semibold text-bread-700 mb-4 animate-slide-up stagger-2">
        Riepilogo di Oggi
      </h2>
      
      <div className="grid grid-cols-3 gap-3 mb-8 animate-slide-up stagger-2">
        <div className="stat-card">
          <Truck size={28} className="mx-auto mb-2 text-bread-600" />
          <div className="stat-value">{todayStats.deliveryCount}</div>
          <div className="stat-label">Consegne</div>
        </div>
        <div className="stat-card">
          <Package size={28} className="mx-auto mb-2 text-bread-600" />
          <div className="stat-value">{todayStats.totalItems.toFixed(1)}</div>
          <div className="stat-label">Totale</div>
        </div>
        <div className="stat-card">
          <Users size={28} className="mx-auto mb-2 text-bread-600" />
          <div className="stat-value">{todayStats.customerCount}</div>
          <div className="stat-label">Clienti</div>
        </div>
      </div>

      {/* Product Breakdown */}
      {todayStats.productSummary.length > 0 && (
        <div className="card animate-slide-up stagger-3">
          <h3 className="card-header flex items-center gap-2">
            <BarChart3 size={20} className="text-bread-600" />
            Prodotti di Oggi
          </h3>
          <div className="space-y-3">
            {todayStats.productSummary.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-bread-100 last:border-0"
              >
                <span className="font-medium text-bread-800">{item.product}</span>
                <span className="badge">
                  {item.totalQuantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {todayStats.deliveryCount === 0 && (
        <div className="card text-center py-10 animate-slide-up stagger-3">
          <div className="text-6xl mb-4">🍞</div>
          <h3 className="text-xl font-display font-semibold text-bread-700 mb-2">
            Nessuna consegna oggi
          </h3>
          <p className="text-bread-500 mb-6">
            Inizia a registrare le consegne per vedere il riepilogo
          </p>
          <Link to="/delivery" className="btn-primary max-w-xs mx-auto">
            <Plus size={24} />
            Prima Consegna
          </Link>
        </div>
      )}

      {/* Quick Link to Reports */}
      <Link 
        to="/reports" 
        className="block mt-6 card hover:shadow-bread-lg transition-shadow animate-slide-up stagger-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bread-100 rounded-full flex items-center justify-center">
              <BarChart3 size={24} className="text-bread-600" />
            </div>
            <div>
              <h3 className="font-semibold text-bread-800">Report Mensili</h3>
              <p className="text-sm text-bread-500">Visualizza i riepiloghi</p>
            </div>
          </div>
          <span className="text-bread-400">→</span>
        </div>
      </Link>
    </div>
  );
};

export default Dashboard;

