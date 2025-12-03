import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  User, 
  Download, 
  Loader2,
  Package,
  Truck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getCustomers, 
  getDeliveriesByDateRange, 
  calculateDeliverySummary 
} from '../firebase/firestore';

const Reports = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [showDeliveries, setShowDeliveries] = useState(false);

  // Get current month dates
  const getMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const [filters, setFilters] = useState({
    customerId: '',
    startDate: getMonthDates().start,
    endDate: getMonthDates().end
  });

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch (error) {
        console.error('Error loading customers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    setReport(null);
    
    try {
      const deliveries = await getDeliveriesByDateRange(
        filters.startDate,
        filters.endDate,
        filters.customerId || null
      );
      
      const summary = calculateDeliverySummary(deliveries);
      const totalQuantity = summary.reduce((acc, item) => acc + item.totalQuantity, 0);
      
      setReport({
        deliveries,
        summary,
        totalQuantity,
        totalDeliveries: deliveries.length,
        customerName: filters.customerId 
          ? customers.find(c => c.id === filters.customerId)?.name 
          : 'Tutti i Clienti',
        dateRange: `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDeliveryDate = (timestamp) => {
    if (!timestamp) return 'N/D';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    if (!report) return;
    
    let csv = 'Prodotto,Quantità,Unità,Numero Consegne\n';
    report.summary.forEach(item => {
      csv += `"${item.product}",${item.totalQuantity},${item.unit},${item.deliveryCount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-consegne-${filters.startDate}-a-${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <h1 className="page-title flex items-center gap-2 animate-slide-up">
        <BarChart3 className="text-bread-600" />
        Report
      </h1>

      {/* Filters */}
      <div className="card mb-6 animate-slide-up stagger-1">
        <h2 className="card-header">Genera Report</h2>
        
        <div className="space-y-4">
          {/* Customer Filter */}
          <div>
            <label className="label">
              <User className="inline mr-2" size={18} />
              Cliente
            </label>
            <select
              value={filters.customerId}
              onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
              className="select-field"
            >
              <option value="">Tutti i Clienti</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                <Calendar className="inline mr-2" size={18} />
                Data Inizio
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Data Fine</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateReport}
            className="btn-primary"
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Generazione...
              </>
            ) : (
              <>
                <BarChart3 size={24} />
                Genera Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {report && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <Truck size={28} className="mx-auto mb-2 text-bread-600" />
              <div className="stat-value">{report.totalDeliveries}</div>
              <div className="stat-label">Consegne Totali</div>
            </div>
            <div className="stat-card">
              <Package size={28} className="mx-auto mb-2 text-bread-600" />
              <div className="stat-value">{report.totalQuantity.toFixed(1)}</div>
              <div className="stat-label">Totale Articoli</div>
            </div>
          </div>

          {/* Report Header */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-bread-800">
                  {report.customerName}
                </h3>
                <p className="text-sm text-bread-500">{report.dateRange}</p>
              </div>
              <button
                onClick={exportToCSV}
                className="btn-icon"
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          {/* Product Summary Table */}
          <div className="card">
            <h3 className="card-header flex items-center gap-2">
              <Package size={20} className="text-bread-600" />
              Totali Prodotti
            </h3>

            {report.summary.length === 0 ? (
              <p className="text-bread-500 text-center py-6">
                Nessuna consegna trovata per questo periodo
              </p>
            ) : (
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
                      <th className="text-right py-3 px-2 text-bread-700 font-semibold">
                        N°
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.summary.map((item, index) => (
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
                        <td className="py-3 px-2 text-right text-bread-600">
                          {item.deliveryCount}×
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-bread-100 font-semibold">
                      <td className="py-3 px-2 text-bread-800">
                        Totale
                      </td>
                      <td className="py-3 px-2 text-right text-bread-800">
                        {report.totalQuantity.toFixed(1)}
                      </td>
                      <td className="py-3 px-2 text-right text-bread-600">
                        {report.totalDeliveries}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Individual Deliveries (Collapsible) */}
          {report.deliveries.length > 0 && (
            <div className="card">
              <button
                onClick={() => setShowDeliveries(!showDeliveries)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="card-header mb-0 flex items-center gap-2">
                  <Truck size={20} className="text-bread-600" />
                  Dettaglio Consegne
                </h3>
                {showDeliveries ? (
                  <ChevronUp size={24} className="text-bread-500" />
                ) : (
                  <ChevronDown size={24} className="text-bread-500" />
                )}
              </button>

              {showDeliveries && (
                <div className="mt-4 space-y-3">
                  {report.deliveries.map((delivery, index) => (
                    <div
                      key={delivery.id || index}
                      className="border-l-4 border-bread-300 pl-4 py-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-bread-800">
                          {delivery.customerName}
                        </span>
                        <span className="text-sm text-bread-500">
                          {formatDeliveryDate(delivery.date)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {delivery.items?.map((item, i) => (
                          <span key={i} className="badge text-xs">
                            {item.product}: {item.quantity} {item.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!report && !generating && (
        <div className="card text-center py-10 animate-slide-up stagger-2">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-display font-semibold text-bread-700 mb-2">
            Nessun Report Generato
          </h3>
          <p className="text-bread-500">
            Seleziona i filtri e genera un report per vedere i riepiloghi
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;

