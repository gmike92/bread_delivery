import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  Euro,
  Calendar,
  TrendingUp,
  Loader2,
  User,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getCustomer,
  getOrdersByCustomer,
  getDeliveriesByDateRange,
  getPayments,
  getRecurringOrders
} from '../firebase/firestore';

const StoricoCliente = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [customerId, isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load customer info
      const customerData = await getCustomer(customerId);
      setCustomer(customerData);

      // Load orders
      const ordersData = await getOrdersByCustomer(customerId);
      setOrders(ordersData);

      // Load deliveries (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const today = new Date();
      const deliveriesData = await getDeliveriesByDateRange(
        sixMonthsAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
        customerId
      );
      setDeliveries(deliveriesData);

      // Load payments
      const paymentsData = await getPayments(customerId);
      setPayments(paymentsData);

      // Load recurring orders
      const recurringData = await getRecurringOrders(customerId);
      setRecurringOrders(recurringData);

    } catch (error) {
      console.error('Error loading customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    totalDeliveries: deliveries.length,
    totalPayments: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    avgOrderValue: orders.length > 0 
      ? orders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0) / orders.length
      : 0,
    mostOrderedProducts: getMostOrderedProducts(),
    lastOrder: orders.length > 0 ? orders[0] : null,
    lastDelivery: deliveries.length > 0 ? deliveries[0] : null
  };

  function getMostOrderedProducts() {
    const productCounts = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const key = item.product;
        if (!productCounts[key]) {
          productCounts[key] = { name: item.product, quantity: 0, count: 0 };
        }
        productCounts[key].quantity += item.quantity || 0;
        productCounts[key].count += 1;
      });
    });
    return Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-bread-600" size={40} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-container text-center py-10">
        <p className="text-bread-600">Cliente non trovato</p>
        <button onClick={() => navigate('/customers')} className="btn-secondary mt-4">
          Torna ai Clienti
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="btn-icon">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-bread-800">
            Storico Cliente
          </h1>
          <p className="text-bread-500 text-sm">{customer.name}</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="card bg-gradient-to-br from-bread-50 to-amber-50">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-bread-200 flex items-center justify-center">
            <User size={28} className="text-bread-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-bread-800">{customer.name}</h2>
            {customer.phone && (
              <p className="text-bread-600 flex items-center gap-2 mt-1">
                <Phone size={14} />
                {customer.phone}
              </p>
            )}
            {customer.address && (
              <p className="text-bread-500 flex items-center gap-2 mt-1 text-sm">
                <MapPin size={14} />
                {customer.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'summary', label: 'Riepilogo', icon: TrendingUp },
          { id: 'orders', label: 'Ordini', icon: ShoppingBag },
          { id: 'deliveries', label: 'Consegne', icon: Truck },
          { id: 'payments', label: 'Pagamenti', icon: Euro }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-bread font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-bread-600 text-white'
                : 'bg-bread-100 text-bread-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-4 animate-slide-up">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card">
              <div className="stat-value text-2xl">{stats.totalOrders}</div>
              <div className="stat-label">Ordini Totali</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-2xl">{stats.totalDeliveries}</div>
              <div className="stat-label">Consegne (6 mesi)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-2xl">€{stats.totalPayments.toFixed(0)}</div>
              <div className="stat-label">Pagamenti</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-2xl">{stats.avgOrderValue.toFixed(1)}</div>
              <div className="stat-label">Media kg/Ordine</div>
            </div>
          </div>

          {/* Last Activity */}
          <div className="card">
            <h3 className="card-header flex items-center gap-2">
              <Clock size={18} className="text-bread-600" />
              Ultima Attività
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-bread-600">Ultimo Ordine:</span>
                <span className="font-medium">
                  {stats.lastOrder ? formatDate(stats.lastOrder.deliveryDate) : 'Nessuno'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-bread-600">Ultima Consegna:</span>
                <span className="font-medium">
                  {stats.lastDelivery ? formatDate(stats.lastDelivery.date) : 'Nessuna'}
                </span>
              </div>
            </div>
          </div>

          {/* Most Ordered Products */}
          {stats.mostOrderedProducts.length > 0 && (
            <div className="card">
              <h3 className="card-header flex items-center gap-2">
                <Package size={18} className="text-bread-600" />
                Prodotti Più Ordinati
              </h3>
              <div className="space-y-2">
                {stats.mostOrderedProducts.map((product, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-bread-700">{product.name}</span>
                    <span className="text-sm">
                      <span className="font-bold text-bread-800">{product.quantity.toFixed(1)} kg</span>
                      <span className="text-bread-400 ml-2">({product.count}x)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Orders */}
          {recurringOrders.length > 0 && (
            <div className="card">
              <h3 className="card-header flex items-center gap-2">
                <Calendar size={18} className="text-bread-600" />
                Ordini Ricorrenti Attivi
              </h3>
              {recurringOrders.filter(r => r.isActive).map(ro => (
                <div key={ro.id} className="p-3 bg-bread-50 rounded-bread mb-2">
                  <div className="text-sm text-bread-500 mb-1">
                    {ro.days?.map(d => ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d]).join(', ')}
                  </div>
                  <div className="text-bread-700">
                    {ro.items?.map(i => `${i.product} ${i.quantity}${i.unit}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-3 animate-slide-up">
          {orders.length === 0 ? (
            <div className="card text-center py-8">
              <ShoppingBag size={40} className="mx-auto text-bread-300 mb-2" />
              <p className="text-bread-500">Nessun ordine</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="card">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div>
                    <div className="font-medium text-bread-800">
                      {formatDate(order.deliveryDate)}
                    </div>
                    <div className="text-sm text-bread-500">
                      {order.items?.length || 0} prodotti • 
                      <span className={`ml-1 ${
                        order.status === 'delivered' ? 'text-green-600' :
                        order.status === 'confirmed' ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {order.status === 'delivered' ? 'Consegnato' :
                         order.status === 'confirmed' ? 'Confermato' : 'In attesa'}
                      </span>
                    </div>
                  </div>
                  {expandedItems[order.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedItems[order.id] && (
                  <div className="mt-3 pt-3 border-t border-bread-100">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>{item.product}</span>
                        <span className="font-medium">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-800">
                        📝 {order.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div className="space-y-3 animate-slide-up">
          {deliveries.length === 0 ? (
            <div className="card text-center py-8">
              <Truck size={40} className="mx-auto text-bread-300 mb-2" />
              <p className="text-bread-500">Nessuna consegna negli ultimi 6 mesi</p>
            </div>
          ) : (
            deliveries.map(delivery => (
              <div key={delivery.id} className="card">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(delivery.id)}
                >
                  <div>
                    <div className="font-medium text-bread-800">
                      {formatDateTime(delivery.date)}
                    </div>
                    <div className="text-sm text-bread-500">
                      {delivery.items?.length || 0} prodotti
                    </div>
                  </div>
                  {expandedItems[delivery.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedItems[delivery.id] && (
                  <div className="mt-3 pt-3 border-t border-bread-100">
                    {delivery.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>{item.product}</span>
                        <span className="font-medium">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-3 animate-slide-up">
          {payments.length === 0 ? (
            <div className="card text-center py-8">
              <Euro size={40} className="mx-auto text-bread-300 mb-2" />
              <p className="text-bread-500">Nessun pagamento registrato</p>
            </div>
          ) : (
            <>
              <div className="card bg-green-50">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-700">
                    €{stats.totalPayments.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-600">Totale Pagamenti</div>
                </div>
              </div>
              
              {payments.map(payment => (
                <div key={payment.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-bread-800">
                        €{payment.amount?.toFixed(2)}
                      </div>
                      <div className="text-sm text-bread-500">
                        {formatDate(payment.date)} • {payment.method || 'Contanti'}
                      </div>
                    </div>
                    <div className="text-green-600 font-bold">+</div>
                  </div>
                  {payment.notes && (
                    <div className="mt-2 text-sm text-bread-500">
                      {payment.notes}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StoricoCliente;

