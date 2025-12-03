import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Package, 
  Printer,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Check,
  X
} from 'lucide-react';
import { getOrdersByDate, calculateOrdersSummary, updateOrderStatus } from '../firebase/firestore';

const OrdiniGiorno = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const printRef = useRef();

  useEffect(() => {
    loadOrders();
  }, [selectedDate]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const ordersData = await getOrdersByDate(selectedDate);
      setOrders(ordersData);
      setSummary(calculateOrdersSummary(ordersData));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Domani';
    }
    
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordini ${formatDisplayDate(selectedDate)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              color: #3D2314;
            }
            h2 {
              font-size: 18px;
              margin-top: 30px;
              margin-bottom: 15px;
              color: #654321;
              border-bottom: 2px solid #DEB887;
              padding-bottom: 5px;
            }
            .date {
              color: #666;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background: #FFF8DC;
              font-weight: 600;
              color: #3D2314;
            }
            .total-row {
              background: #FAEBD7;
              font-weight: bold;
            }
            .customer-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .customer-name {
              font-weight: 600;
              font-size: 16px;
              color: #3D2314;
              margin-bottom: 10px;
            }
            .items {
              padding-left: 15px;
            }
            .item {
              padding: 5px 0;
              color: #444;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>🍞 Ordini del Giorno</h1>
          <p class="date">${formatDisplayDate(selectedDate)} - ${new Date(selectedDate).toLocaleDateString('it-IT')}</p>
          
          <h2>📊 Riepilogo Totale</h2>
          <table>
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Quantità Totale</th>
                <th>N° Ordini</th>
              </tr>
            </thead>
            <tbody>
              ${summary.map(item => `
                <tr>
                  <td>${item.product}</td>
                  <td><strong>${item.totalQuantity}</strong> ${item.unit}</td>
                  <td>${item.orderCount}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>TOTALE</td>
                <td>${summary.reduce((acc, item) => acc + item.totalQuantity, 0).toFixed(1)}</td>
                <td>${orders.length} ordini</td>
              </tr>
            </tbody>
          </table>

          <h2>👥 Dettaglio per Cliente</h2>
          ${orders.map(order => `
            <div class="customer-section">
              <div class="customer-name">📦 ${order.customerName}</div>
              <div class="items">
                ${order.items?.map(item => `
                  <div class="item">• ${item.product}: <strong>${item.quantity}</strong> ${item.unit}</div>
                `).join('')}
              </div>
            </div>
          `).join('')}

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge bg-amber-100 text-amber-700">In attesa</span>;
      case 'confirmed':
        return <span className="badge bg-green-100 text-green-700">Confermato</span>;
      case 'delivered':
        return <span className="badge bg-bread-100 text-bread-700">Consegnato</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-bread-600 font-medium">Caricamento ordini...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <h1 className="page-title mb-0 flex items-center gap-2">
          <Package className="text-bread-600" />
          Ordini
        </h1>
        {orders.length > 0 && (
          <button
            onClick={handlePrint}
            className="btn-icon bg-bread-600 text-white"
          >
            <Printer size={22} />
          </button>
        )}
      </div>

      {/* Date Selector */}
      <div className="card mb-6 animate-slide-up stagger-1">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="btn-icon"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center flex-1">
            <p className="text-xl font-display font-bold text-bread-800">
              {formatDisplayDate(selectedDate)}
            </p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-2 text-center text-bread-600 bg-transparent border-none cursor-pointer"
            />
          </div>
          
          <button
            onClick={() => changeDate(1)}
            className="btn-icon"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Summary Card */}
      {orders.length > 0 && (
        <div className="card mb-6 animate-slide-up stagger-2" ref={printRef}>
          <h2 className="card-header flex items-center gap-2">
            <Package size={20} className="text-bread-600" />
            Riepilogo Totale
          </h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="stat-card !p-4">
              <div className="stat-value text-2xl">{orders.length}</div>
              <div className="stat-label">Ordini</div>
            </div>
            <div className="stat-card !p-4">
              <div className="stat-value text-2xl">
                {summary.reduce((acc, item) => acc + item.totalQuantity, 0).toFixed(1)}
              </div>
              <div className="stat-label">Totale Articoli</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-bread-200">
                  <th className="text-left py-3 px-2 text-bread-700 font-semibold">
                    Prodotto
                  </th>
                  <th className="text-right py-3 px-2 text-bread-700 font-semibold">
                    Totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-bread-100 last:border-0"
                  >
                    <td className="py-3 px-2 font-medium text-bread-800">
                      {item.product}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="badge">
                        {item.totalQuantity} {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="animate-slide-up stagger-3">
        <h2 className="text-lg font-display font-semibold text-bread-700 mb-4 flex items-center gap-2">
          <Users size={20} />
          Ordini per Cliente ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-display font-semibold text-bread-700 mb-2">
              Nessun ordine
            </h3>
            <p className="text-bread-500">
              Non ci sono ordini per questa data
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <div 
                key={order.id} 
                className="card"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-bread-800 text-lg">
                      {order.customerName}
                    </h3>
                    <p className="text-sm text-bread-500">{order.customerEmail}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {order.items?.map((item, i) => (
                    <span key={i} className="badge">
                      {item.product}: {item.quantity} {item.unit}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'confirmed')}
                      className="flex-1 py-2 px-4 bg-green-100 text-green-700 rounded-bread font-medium flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Conferma
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'delivered')}
                      className="flex-1 py-2 px-4 bg-bread-100 text-bread-700 rounded-bread font-medium flex items-center justify-center gap-2"
                    >
                      <Package size={18} />
                      Consegnato
                    </button>
                  )}
                  {order.status !== 'delivered' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'pending')}
                      className="py-2 px-4 bg-gray-100 text-gray-600 rounded-bread font-medium"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdiniGiorno;

