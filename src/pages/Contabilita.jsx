import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Euro,
  FileText,
  Download,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Receipt,
  AlertCircle,
  Check,
  Printer
} from 'lucide-react';
import { 
  getCustomers, 
  getProducts,
  generateBillingStatement,
  calculateCustomerBalance,
  addPayment,
  deletePayment,
  getPayments
} from '../firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const Contabilita = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  });
  
  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [customerBalances, setCustomerBalances] = useState({});
  
  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    customerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'contanti',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);
  
  // All payments view
  const [recentPayments, setRecentPayments] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState({});

  const PAYMENT_METHODS = [
    { value: 'contanti', label: 'Contanti' },
    { value: 'bonifico', label: 'Bonifico' },
    { value: 'assegno', label: 'Assegno' },
    { value: 'carta', label: 'Carta' },
    { value: 'altro', label: 'Altro' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, productsData, paymentsData] = await Promise.all([
        getCustomers(),
        getProducts(),
        getPayments()
      ]);
      setCustomers(customersData);
      setProducts(productsData);
      setRecentPayments(paymentsData.slice(0, 20));
      
      // Load balances for all customers
      const balances = {};
      for (const customer of customersData) {
        try {
          balances[customer.id] = await calculateCustomerBalance(customer.id);
        } catch (e) {
          balances[customer.id] = { totalDue: 0, totalPaid: 0, balance: 0 };
        }
      }
      setCustomerBalances(balances);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStatement = async () => {
    if (!selectedCustomer) {
      alert('Seleziona un cliente');
      return;
    }
    
    setLoadingStatement(true);
    try {
      const data = await generateBillingStatement(
        selectedCustomer,
        dateRange.start,
        dateRange.end
      );
      setStatement(data);
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Errore nella generazione dell\'estratto conto');
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentForm.customerId || !paymentForm.amount) {
      alert('Compila cliente e importo');
      return;
    }
    
    setSavingPayment(true);
    try {
      await addPayment({
        customerId: paymentForm.customerId,
        customerName: customers.find(c => c.id === paymentForm.customerId)?.name || '',
        amount: parseFloat(paymentForm.amount),
        date: Timestamp.fromDate(new Date(paymentForm.date)),
        method: paymentForm.method,
        notes: paymentForm.notes
      });
      
      setShowPaymentForm(false);
      setPaymentForm({
        customerId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'contanti',
        notes: ''
      });
      
      await loadData();
      
      // Refresh statement if viewing same customer
      if (selectedCustomer === paymentForm.customerId && statement) {
        handleGenerateStatement();
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Errore nel salvataggio del pagamento');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Eliminare questo pagamento?')) return;
    
    try {
      await deletePayment(paymentId);
      await loadData();
      if (statement) {
        handleGenerateStatement();
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/D';
    const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const toggleCustomerExpand = (customerId) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!statement) return;
    
    let csv = 'Data,Prodotto,Quantità,Unità,Prezzo,Totale\n';
    
    statement.deliveries.forEach(d => {
      d.items.forEach(item => {
        csv += `${formatDate(d.date)},${item.product},${item.quantity},${item.unit},${item.price},${item.lineTotal}\n`;
      });
    });
    
    csv += '\n\nPagamenti\n';
    csv += 'Data,Importo,Metodo,Note\n';
    statement.payments.forEach(p => {
      csv += `${formatDate(p.date)},${p.amount},${p.method},${p.notes || ''}\n`;
    });
    
    csv += `\n\nRiepilogo\n`;
    csv += `Saldo Precedente,${statement.previousBalance}\n`;
    csv += `Totale Periodo,${statement.periodTotal}\n`;
    csv += `Pagamenti Periodo,${statement.periodPayments}\n`;
    csv += `Saldo Attuale,${statement.currentBalance}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estratto_${statement.customer?.name}_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  };

  // Print statement
  const printStatement = () => {
    if (!statement) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Estratto Conto - ${statement.customer?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 18px; color: #666; margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
          .header { margin-bottom: 30px; }
          .customer-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .period { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .amount { text-align: right; }
          .summary { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 30px; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .summary-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
          .balance-due { color: #dc2626; }
          .balance-credit { color: #16a34a; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍞 Estratto Conto</h1>
          <p class="period">Periodo: ${formatDate(new Date(dateRange.start))} - ${formatDate(new Date(dateRange.end))}</p>
        </div>
        
        <div class="customer-info">
          <strong>${statement.customer?.name}</strong><br>
          ${statement.customer?.address || ''}<br>
          ${statement.customer?.phone || ''}
        </div>
        
        <h2>📦 Consegne</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Prodotto</th>
              <th>Qtà</th>
              <th class="amount">Prezzo</th>
              <th class="amount">Totale</th>
            </tr>
          </thead>
          <tbody>
            ${statement.deliveries.map(d => 
              d.items.map(item => `
                <tr>
                  <td>${formatDate(d.date)}</td>
                  <td>${item.product}</td>
                  <td>${item.quantity} ${item.unit}</td>
                  <td class="amount">${formatCurrency(item.price)}</td>
                  <td class="amount">${formatCurrency(item.lineTotal)}</td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
        
        <h2>💰 Pagamenti</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Metodo</th>
              <th>Note</th>
              <th class="amount">Importo</th>
            </tr>
          </thead>
          <tbody>
            ${statement.payments.length > 0 ? statement.payments.map(p => `
              <tr>
                <td>${formatDate(p.date)}</td>
                <td>${p.method}</td>
                <td>${p.notes || '-'}</td>
                <td class="amount">${formatCurrency(p.amount)}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;">Nessun pagamento nel periodo</td></tr>'}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>Saldo Precedente:</span>
            <span>${formatCurrency(statement.previousBalance)}</span>
          </div>
          <div class="summary-row">
            <span>Totale Consegne Periodo:</span>
            <span>+ ${formatCurrency(statement.periodTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Pagamenti Periodo:</span>
            <span>- ${formatCurrency(statement.periodPayments)}</span>
          </div>
          <div class="summary-row total ${statement.currentBalance > 0 ? 'balance-due' : 'balance-credit'}">
            <span>SALDO ATTUALE:</span>
            <span>${formatCurrency(statement.currentBalance)}</span>
          </div>
        </div>
        
        <p style="margin-top: 40px; color: #999; font-size: 12px; text-align: center;">
          Generato il ${new Date().toLocaleString('it-IT')}
        </p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
    <div className="page-container pb-32">
      {/* Header */}
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-display font-bold text-bread-800">
          💰 Contabilità
        </h1>
        <p className="text-bread-600 mt-1">Estratti conto e pagamenti</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up stagger-1">
        <div className="card !p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-xs text-red-600 font-medium">Da Incassare</span>
          </div>
          <p className="text-xl font-bold text-red-700">
            {formatCurrency(
              Object.values(customerBalances).reduce((sum, b) => sum + Math.max(0, b.balance), 0)
            )}
          </p>
        </div>
        <div className="card !p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Check size={16} className="text-green-600" />
            <span className="text-xs text-green-600 font-medium">Incassato (Totale)</span>
          </div>
          <p className="text-xl font-bold text-green-700">
            {formatCurrency(
              Object.values(customerBalances).reduce((sum, b) => sum + b.totalPaid, 0)
            )}
          </p>
        </div>
      </div>

      {/* Add Payment Button */}
      <button
        onClick={() => setShowPaymentForm(true)}
        className="btn-primary mb-6 animate-slide-up stagger-2"
      >
        <Plus size={20} />
        Registra Pagamento
      </button>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
            <h3 className="text-lg font-display font-bold text-bread-800 mb-4">
              💵 Nuovo Pagamento
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">Cliente *</label>
                <select
                  value={paymentForm.customerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                  className="select-field"
                >
                  <option value="">Seleziona cliente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {customerBalances[c.id]?.balance > 0 && `(${formatCurrency(customerBalances[c.id].balance)})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Importo (€) *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Metodo Pagamento</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="select-field"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">Note</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Es: Fattura n. 123"
                  className="input-field"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddPayment}
                className="btn-primary flex-1"
                disabled={savingPayment}
              >
                {savingPayment ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                Salva
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="btn-secondary flex-1"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Balances */}
      <div className="mb-6 animate-slide-up stagger-3">
        <h2 className="text-lg font-display font-bold text-bread-800 mb-3 flex items-center gap-2">
          <Users size={20} />
          Saldi Clienti
        </h2>
        
        <div className="space-y-2">
          {customers.map(customer => {
            const balance = customerBalances[customer.id] || { totalDue: 0, totalPaid: 0, balance: 0 };
            const isExpanded = expandedCustomers[customer.id];
            
            return (
              <div key={customer.id} className="card !p-0 overflow-hidden">
                <button
                  onClick={() => toggleCustomerExpand(customer.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-bread-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      balance.balance > 0 ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      <Euro size={18} className={balance.balance > 0 ? 'text-red-600' : 'text-green-600'} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-bread-800">{customer.name}</p>
                      <p className={`text-sm font-medium ${
                        balance.balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {balance.balance > 0 ? 'Da pagare: ' : 'Saldo: '}
                        {formatCurrency(Math.abs(balance.balance))}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-bread-100 bg-bread-50">
                    <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                      <div>
                        <p className="text-bread-500">Totale Consegne</p>
                        <p className="font-semibold text-bread-800">{formatCurrency(balance.totalDue)}</p>
                      </div>
                      <div>
                        <p className="text-bread-500">Totale Pagato</p>
                        <p className="font-semibold text-green-600">{formatCurrency(balance.totalPaid)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(customer.id);
                        setPaymentForm({ ...paymentForm, customerId: customer.id, amount: balance.balance > 0 ? balance.balance.toString() : '' });
                        setShowPaymentForm(true);
                      }}
                      className="w-full py-2 bg-bread-100 text-bread-700 rounded-bread text-sm font-medium hover:bg-bread-200 transition-colors"
                    >
                      <CreditCard size={16} className="inline mr-2" />
                      Registra Pagamento
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Statement Generator */}
      <div className="card animate-slide-up stagger-4">
        <h2 className="text-lg font-display font-bold text-bread-800 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Estratto Conto
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="label">Cliente</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="select-field"
            >
              <option value="">Seleziona cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Da</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">A</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          
          <button
            onClick={handleGenerateStatement}
            className="btn-primary"
            disabled={loadingStatement || !selectedCustomer}
          >
            {loadingStatement ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Receipt size={20} />
            )}
            Genera Estratto
          </button>
        </div>
      </div>

      {/* Statement Result */}
      {statement && (
        <div className="mt-6 animate-slide-up">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-bread-800">
                📄 {statement.customer?.name}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="p-2 bg-green-100 text-green-700 rounded-bread hover:bg-green-200"
                  title="Esporta CSV"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={printStatement}
                  className="p-2 bg-blue-100 text-blue-700 rounded-bread hover:bg-blue-200"
                  title="Stampa"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-bread-500 mb-4">
              Periodo: {formatDate(new Date(dateRange.start))} - {formatDate(new Date(dateRange.end))}
            </p>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-bread-50 rounded-bread p-3">
                <p className="text-xs text-bread-500">Saldo Precedente</p>
                <p className="font-bold text-bread-800">{formatCurrency(statement.previousBalance)}</p>
              </div>
              <div className="bg-blue-50 rounded-bread p-3">
                <p className="text-xs text-blue-500">Consegne Periodo</p>
                <p className="font-bold text-blue-700">+{formatCurrency(statement.periodTotal)}</p>
              </div>
              <div className="bg-green-50 rounded-bread p-3">
                <p className="text-xs text-green-500">Pagamenti Periodo</p>
                <p className="font-bold text-green-700">-{formatCurrency(statement.periodPayments)}</p>
              </div>
              <div className={`rounded-bread p-3 ${
                statement.currentBalance > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <p className={`text-xs ${statement.currentBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  Saldo Attuale
                </p>
                <p className={`font-bold text-lg ${
                  statement.currentBalance > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {formatCurrency(statement.currentBalance)}
                </p>
              </div>
            </div>
            
            {/* Deliveries */}
            {statement.deliveries.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-bread-700 mb-2 text-sm">📦 Consegne ({statement.deliveries.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statement.deliveries.map(d => (
                    <div key={d.id} className="text-sm bg-bread-50 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{formatDate(d.date)}</span>
                        <span className="text-bread-600">{formatCurrency(d.total)}</span>
                      </div>
                      <div className="text-xs text-bread-500 mt-1">
                        {d.items.map(i => `${i.product} ${i.quantity}${i.unit}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Payments */}
            {statement.payments.length > 0 && (
              <div>
                <h4 className="font-semibold text-bread-700 mb-2 text-sm">💰 Pagamenti ({statement.payments.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {statement.payments.map(p => (
                    <div key={p.id} className="text-sm bg-green-50 rounded-lg p-2 flex justify-between items-center">
                      <div>
                        <span className="font-medium">{formatDate(p.date)}</span>
                        <span className="text-green-600 ml-2">{p.method}</span>
                        {p.notes && <span className="text-xs text-green-500 ml-2">({p.notes})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-700">{formatCurrency(p.amount)}</span>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <div className="mt-6 animate-slide-up stagger-5">
          <h2 className="text-lg font-display font-bold text-bread-800 mb-3 flex items-center gap-2">
            <CreditCard size={20} />
            Ultimi Pagamenti
          </h2>
          <div className="space-y-2">
            {recentPayments.map(payment => (
              <div key={payment.id} className="card !p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-bread-800">{payment.customerName}</p>
                  <p className="text-xs text-bread-500">
                    {formatDate(payment.date)} • {payment.method}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                  <button
                    onClick={() => handleDeletePayment(payment.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Contabilita;

