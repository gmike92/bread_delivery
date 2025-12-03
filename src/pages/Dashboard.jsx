import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Users, Package, BarChart3, Plus, RefreshCw } from 'lucide-react';
import { getTodayDeliveries, getCustomers, calculateDeliverySummary } from '../firebase/firestore';

const Dashboard = () => {
  const [todayStats, setTodayStats] = useState({
    deliveryCount: 0,
    customerCount: 0,
    totalItems: 0,
    productSummary: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [deliveries, customers] = await Promise.all([
        getTodayDeliveries(),
        getCustomers()
      ]);

      const summary = calculateDeliverySummary(deliveries);
      const totalItems = summary.reduce((acc, item) => acc + item.totalQuantity, 0);

      setTodayStats({
        deliveryCount: deliveries.length,
        customerCount: customers.length,
        totalItems,
        productSummary: summary.slice(0, 5) // Top 5 products
      });
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

