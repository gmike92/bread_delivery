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
  X,
  CheckCircle2,
  Circle,
  Truck
} from 'lucide-react';
import { getOrdersByDate, calculateOrdersSummary, updateOrderStatus, getDeliveriesByDate, calculateDeliveryProgress } from '../firebase/firestore';

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
      const [ordersData, deliveriesData] = await Promise.all([
        getOrdersByDate(selectedDate),
        getDeliveriesByDate(selectedDate)
      ]);
      
      // Calculate progress for each order
      const ordersWithProgress = calculateDeliveryProgress(ordersData, deliveriesData);
      
      setOrders(ordersWithProgress);
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

  // Print delivery slip (bolla di consegna) for a single customer
  const printDeliverySlip = (order) => {
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bolla Consegna - ${order.customerName}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 15px;
              max-width: 400px;
              margin: 0 auto;
              font-size: 14px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .logo { font-size: 24px; margin-bottom: 5px; }
            .title { font-size: 18px; font-weight: bold; color: #333; }
            .subtitle { font-size: 12px; color: #666; }
            .info-section {
              margin-bottom: 15px;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .info-label { color: #666; font-size: 12px; }
            .info-value { font-weight: bold; }
            .products-title {
              font-weight: bold;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #ddd;
            }
            .product-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dotted #ddd;
            }
            .product-name { flex: 1; }
            .product-qty { 
              font-weight: bold; 
              min-width: 80px; 
              text-align: right;
            }
            .notes-section {
              margin-top: 15px;
              padding: 10px;
              background: #fff8dc;
              border-radius: 5px;
              border: 1px solid #deb887;
            }
            .signature-section {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #333;
            }
            .signature-line {
              margin-top: 40px;
              border-top: 1px solid #333;
              padding-top: 5px;
              font-size: 11px;
              color: #666;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #999;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🍞</div>
            <div class="title">BOLLA DI CONSEGNA</div>
            <div class="subtitle">Panetteria</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span class="info-value">${order.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data Consegna:</span>
              <span class="info-value">${formatDisplayDate(selectedDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">N° Ordine:</span>
              <span class="info-value">#${order.id.slice(-6).toUpperCase()}</span>
            </div>
          </div>
          
          <div class="products-title">📦 Prodotti da Consegnare</div>
          ${order.items?.map(item => `
            <div class="product-row">
              <span class="product-name">${item.product}</span>
              <span class="product-qty">${item.ordered || item.quantity} ${item.unit}</span>
            </div>
          `).join('')}
          
          ${order.notes ? `
            <div class="notes-section">
              <strong>📝 Note:</strong><br>
              ${order.notes}
            </div>
          ` : ''}
          
          <div class="signature-section">
            <strong>Firma per ricevuta:</strong>
            <div class="signature-line">
              Data: _________________ Firma: _________________
            </div>
          </div>
          
          <div class="footer">
            Stampato il ${today}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
              <div class="customer-name">${order.isComplete ? '✅' : '📦'} ${order.customerName}</div>
              <div class="items">
                ${order.items?.map(item => `
                  <div class="item" style="color: ${item.isComplete ? '#16a34a' : item.delivered > 0 ? '#d97706' : '#444'}">
                    ${item.isComplete ? '✓' : '•'} ${item.product}: 
                    <strong>${item.delivered || 0}/${item.ordered || item.quantity}</strong> ${item.unit}
                    ${item.isComplete ? ' ✅' : item.delivered > 0 ? ' ⏳' : ''}
                  </div>
                `).join('')}
              </div>
              ${order.notes ? `<div class="notes" style="margin-top: 8px; padding: 8px; background: #eff6ff; border-radius: 4px; font-size: 12px; color: #1d4ed8;">📝 ${order.notes}</div>` : ''}
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
                className={`card ${order.isComplete ? 'border-2 border-green-300 bg-green-50/50' : ''}`}
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {order.isComplete ? (
                      <CheckCircle2 size={24} className="text-green-500" />
                    ) : order.hasPartialDelivery ? (
                      <Truck size={24} className="text-amber-500" />
                    ) : (
                      <Circle size={24} className="text-bread-300" />
                    )}
                    <div>
                      <h3 className="font-semibold text-bread-800 text-lg">
                        {order.customerName}
                      </h3>
                      <p className="text-sm text-bread-500">{order.customerEmail}</p>
                    </div>
                  </div>
                  {order.isComplete ? (
                    <span className="badge bg-green-100 text-green-700">
                      <Check size={14} className="inline mr-1" />
                      Completato
                    </span>
                  ) : (
                    getStatusBadge(order.status)
                  )}
                </div>

                {/* Items with delivery progress */}
                <div className="space-y-2 mb-3">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.isComplete ? (
                        <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle size={18} className="text-bread-300 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-bread-800">{item.product}</span>
                          <span className={`text-sm font-semibold ${
                            item.isComplete ? 'text-green-600' : 
                            item.delivered > 0 ? 'text-amber-600' : 'text-bread-500'
                          }`}>
                            {item.delivered}/{item.ordered} {item.unit}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1 h-2 bg-bread-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              item.isComplete ? 'bg-green-500' : 
                              item.delivered > 0 ? 'bg-amber-500' : 'bg-bread-200'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Notes */}
                {order.notes && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-bread">
                    <p className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="text-lg">📝</span>
                      <span>{order.notes}</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {/* Print Delivery Slip Button */}
                  <button
                    onClick={() => printDeliverySlip(order)}
                    className="py-2 px-3 bg-blue-100 text-blue-700 rounded-bread font-medium flex items-center justify-center gap-1"
                    title="Stampa Bolla"
                  >
                    <Printer size={18} />
                  </button>
                  
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'confirmed')}
                      className="flex-1 py-2 px-4 bg-green-100 text-green-700 rounded-bread font-medium flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Conferma
                    </button>
                  )}
                  {order.status === 'confirmed' && !order.isComplete && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'delivered')}
                      className="flex-1 py-2 px-4 bg-bread-100 text-bread-700 rounded-bread font-medium flex items-center justify-center gap-2"
                    >
                      <Package size={18} />
                      Consegnato
                    </button>
                  )}
                  {order.status !== 'delivered' && !order.isComplete && (
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

