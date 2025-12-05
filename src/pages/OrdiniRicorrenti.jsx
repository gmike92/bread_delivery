import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Calendar,
  Package,
  Loader2,
  Play,
  Pause,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getRecurringOrders, 
  addRecurringOrder, 
  updateRecurringOrder, 
  deleteRecurringOrder,
  toggleRecurringOrder,
  getCustomers,
  getProducts,
  DAYS_OF_WEEK,
  generateOrdersFromRecurring
} from '../firebase/firestore';

const OrdiniRicorrenti = () => {
  const { userProfile, linkedCustomer, isAdmin, isAutista } = useAuth();
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    days: [],
    items: [],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [linkedCustomer]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData, customersData] = await Promise.all([
        // If client, only get their recurring orders
        linkedCustomer ? getRecurringOrders(linkedCustomer.id) : getRecurringOrders(),
        getProducts(),
        isAutista || isAdmin ? getCustomers() : Promise.resolve([])
      ]);
      
      setRecurringOrders(ordersData);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: linkedCustomer?.id || '',
      customerName: linkedCustomer?.name || '',
      days: [],
      items: [],
      notes: ''
    });
    setEditingOrder(null);
    setShowForm(false);
  };

  const handleDayToggle = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(dayValue)
        ? prev.days.filter(d => d !== dayValue)
        : [...prev.days, dayValue].sort((a, b) => a - b)
    }));
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        product: products[0].name, 
        quantity: 1, 
        unit: products[0].defaultUnit || 'kg' 
      }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        if (field === 'product') {
          const product = products.find(p => p.name === value);
          return { ...item, product: value, unit: product?.defaultUnit || 'kg' };
        }
        return { ...item, [field]: field === 'quantity' ? parseFloat(value) || 0 : value };
      })
    }));
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData(prev => ({
      ...prev,
      customerId,
      customerName: customer?.name || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.days.length === 0) {
      alert('Seleziona almeno un giorno della settimana');
      return;
    }
    
    if (formData.items.length === 0) {
      alert('Aggiungi almeno un prodotto');
      return;
    }

    try {
      if (editingOrder) {
        await updateRecurringOrder(editingOrder.id, formData);
      } else {
        await addRecurringOrder(formData);
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving recurring order:', error);
      alert('Errore nel salvataggio');
    }
  };

  const handleEdit = (order) => {
    setFormData({
      customerId: order.customerId,
      customerName: order.customerName,
      days: order.days || [],
      items: order.items || [],
      notes: order.notes || ''
    });
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleDelete = async (orderId) => {
    if (!confirm('Eliminare questo ordine ricorrente?')) return;
    
    try {
      await deleteRecurringOrder(orderId);
      await loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleToggleActive = async (order) => {
    try {
      await toggleRecurringOrder(order.id, !order.isActive);
      await loadData();
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  const handleGenerateOrders = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toISOString().split('T')[0];
    
    if (!confirm(`Generare gli ordini per domani (${formatDate(targetDate)})?`)) return;
    
    setGenerating(true);
    try {
      const generated = await generateOrdersFromRecurring(targetDate);
      if (generated.length > 0) {
        alert(`✅ Generati ${generated.length} ordini per domani!`);
      } else {
        alert('Nessun nuovo ordine da generare (potrebbero già esistere)');
      }
    } catch (error) {
      console.error('Error generating orders:', error);
      alert('Errore nella generazione');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const getDaysLabel = (days) => {
    if (!days || days.length === 0) return 'Nessun giorno';
    if (days.length === 7) return 'Ogni giorno';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Lun-Ven';
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-bread-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-bread-800 flex items-center gap-2">
          <RefreshCw className="text-bread-600" />
          Ordini Ricorrenti
        </h1>
        
        <div className="flex gap-2">
          {(isAdmin || isAutista) && (
            <button
              onClick={handleGenerateOrders}
              disabled={generating}
              className="btn-icon bg-green-100 text-green-700"
              title="Genera ordini per domani"
            >
              {generating ? <Loader2 className="animate-spin" size={20} /> : <Calendar size={20} />}
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-icon bg-bread-600 text-white"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>💡 Ordini Ricorrenti:</strong> Imposta gli ordini che si ripetono automaticamente ogni settimana. 
          Gli ordini verranno generati automaticamente per i giorni selezionati.
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-slide-up">
          <h2 className="card-header flex items-center gap-2">
            {editingOrder ? <Edit2 size={18} /> : <Plus size={18} />}
            {editingOrder ? 'Modifica Ordine Ricorrente' : 'Nuovo Ordine Ricorrente'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Selection (for admin/autista) */}
            {(isAdmin || isAutista) && (
              <div>
                <label className="block text-sm font-medium text-bread-700 mb-1">
                  Cliente
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">Seleziona cliente...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Days Selection */}
            <div>
              <label className="block text-sm font-medium text-bread-700 mb-2">
                Giorni di Consegna
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-2 rounded-bread text-sm font-medium transition-all ${
                      formData.days.includes(day.value)
                        ? 'bg-bread-600 text-white'
                        : 'bg-bread-100 text-bread-700 hover:bg-bread-200'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, days: [1, 2, 3, 4, 5] }))}
                  className="text-xs text-bread-600 underline"
                >
                  Lun-Ven
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, days: [0, 1, 2, 3, 4, 5, 6] }))}
                  className="text-xs text-bread-600 underline"
                >
                  Tutti
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, days: [] }))}
                  className="text-xs text-bread-600 underline"
                >
                  Nessuno
                </button>
              </div>
            </div>

            {/* Products */}
            <div>
              <label className="block text-sm font-medium text-bread-700 mb-2">
                Prodotti
              </label>
              
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    className="input-field flex-1"
                  >
                    {products.map(product => (
                      <option key={product.id} value={product.name}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="0.1"
                    step="0.1"
                    className="input-field w-20"
                  />
                  <span className="flex items-center text-bread-600 text-sm w-8">
                    {item.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="btn-icon !p-2 text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 border-2 border-dashed border-bread-300 rounded-bread text-bread-600 hover:border-bread-400 hover:bg-bread-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Aggiungi Prodotto
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-bread-700 mb-1">
                Note (opzionale)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Note per la consegna..."
                className="input-field"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 bg-bread-100 text-bread-700 rounded-bread font-medium"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-bread-600 text-white rounded-bread font-medium flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {editingOrder ? 'Salva Modifiche' : 'Crea Ordine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recurring Orders List */}
      {recurringOrders.length === 0 ? (
        <div className="card text-center py-8">
          <RefreshCw size={48} className="mx-auto text-bread-300 mb-3" />
          <p className="text-bread-600">Nessun ordine ricorrente</p>
          <p className="text-sm text-bread-400 mt-1">
            Crea un ordine ricorrente per automatizzare le consegne settimanali
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recurringOrders.map(order => (
            <div 
              key={order.id} 
              className={`card transition-all ${!order.isActive ? 'opacity-60' : ''}`}
            >
              {/* Order Header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${order.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {order.isActive ? (
                      <RefreshCw size={20} className="text-green-600" />
                    ) : (
                      <Pause size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-bread-800">
                      {order.customerName}
                    </h3>
                    <p className="text-sm text-bread-500">
                      {getDaysLabel(order.days)} • {order.items?.length || 0} prodotti
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {expandedOrder === order.id ? (
                    <ChevronUp size={20} className="text-bread-400" />
                  ) : (
                    <ChevronDown size={20} className="text-bread-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="mt-4 pt-4 border-t border-bread-100 animate-slide-up">
                  {/* Days */}
                  <div className="mb-3">
                    <span className="text-xs text-bread-500 uppercase tracking-wide">Giorni</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {DAYS_OF_WEEK.map(day => (
                        <span
                          key={day.value}
                          className={`px-2 py-1 rounded text-xs ${
                            order.days?.includes(day.value)
                              ? 'bg-bread-600 text-white'
                              : 'bg-bread-100 text-bread-400'
                          }`}
                        >
                          {day.short}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Products */}
                  <div className="mb-4">
                    <span className="text-xs text-bread-500 uppercase tracking-wide">Prodotti</span>
                    <div className="mt-1 space-y-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-bread-700">{item.product}</span>
                          <span className="font-medium">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mb-4 p-2 bg-amber-50 rounded text-sm text-amber-800">
                      📝 {order.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(order)}
                      className={`flex-1 py-2 rounded-bread font-medium flex items-center justify-center gap-2 ${
                        order.isActive
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {order.isActive ? <Pause size={16} /> : <Play size={16} />}
                      {order.isActive ? 'Pausa' : 'Attiva'}
                    </button>
                    <button
                      onClick={() => handleEdit(order)}
                      className="flex-1 py-2 bg-bread-100 text-bread-700 rounded-bread font-medium flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} />
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="py-2 px-3 bg-red-100 text-red-600 rounded-bread"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Weekly Summary (for admin/autista) */}
      {(isAdmin || isAutista) && recurringOrders.length > 0 && (
        <div className="card">
          <h2 className="card-header flex items-center gap-2">
            <Calendar size={18} className="text-bread-600" />
            Riepilogo Settimanale
          </h2>
          
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map(day => {
              const dayOrders = recurringOrders.filter(o => 
                o.isActive && o.days?.includes(day.value)
              );
              return (
                <div 
                  key={day.value}
                  className={`text-center p-2 rounded ${
                    dayOrders.length > 0 ? 'bg-bread-100' : 'bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-medium text-bread-600">{day.short}</div>
                  <div className={`text-lg font-bold ${
                    dayOrders.length > 0 ? 'text-bread-700' : 'text-gray-300'
                  }`}>
                    {dayOrders.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdiniRicorrenti;

