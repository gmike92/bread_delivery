import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Package, 
  Plus, 
  Trash2, 
  Send, 
  Loader2,
  Check,
  ShoppingBag,
  Clock,
  Edit2,
  AlertCircle,
  X,
  RefreshCw,
  MessageSquare,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getProducts, 
  addOrder, 
  updateOrder,
  deleteOrder,
  getOrdersByCustomer, 
  seedDefaultProducts,
  canModifyOrder 
} from '../firebase/firestore';

const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

// Helper to get week dates
const getWeekDates = (baseDate = new Date()) => {
  const dates = [];
  const startOfWeek = new Date(baseDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
  startOfWeek.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Day names in Italian
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const ClienteOrdine = () => {
  const { user, userProfile, linkedCustomer } = useAuth();
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('nuovo'); // 'nuovo', 'storico', or 'calendario'
  const [editingOrder, setEditingOrder] = useState(null); // Order being edited
  const [calendarWeekStart, setCalendarWeekStart] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Get tomorrow's date as default
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getEmptyFormData = () => ({
    deliveryDate: getTomorrow(),
    items: [{ product: '', quantity: '', unit: 'pezzi' }],
    notes: '' // Note consegna
  });

  const [formData, setFormData] = useState(getEmptyFormData());

  // Format delivery date for form input
  const formatDateForInput = (date) => {
    if (!date) return getTomorrow();
    if (typeof date === 'string') return date;
    if (date?.toDate) {
      return date.toDate().toISOString().split('T')[0];
    }
    return new Date(date).toISOString().split('T')[0];
  };

  // Get deadline string for display
  const getDeadlineString = (deliveryDate) => {
    let dateObj;
    if (typeof deliveryDate === 'string') {
      dateObj = new Date(deliveryDate + 'T00:00:00');
    } else if (deliveryDate?.toDate) {
      dateObj = deliveryDate.toDate();
    } else {
      dateObj = new Date(deliveryDate);
    }
    
    const deadline = new Date(dateObj);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(21, 0, 0, 0);
    
    return deadline.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      // Check if user had enabled notifications before
      const savedPref = localStorage.getItem('breadDeliveryNotifications');
      if (savedPref === 'enabled' && Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        scheduleDeadlineReminder();
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [linkedCustomer]);

  // Schedule notification for 20:00 deadline reminder
  const scheduleDeadlineReminder = useCallback(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(20, 0, 0, 0);
    
    // If it's already past 20:00, schedule for tomorrow
    if (now > reminderTime) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    const timeUntilReminder = reminderTime.getTime() - now.getTime();
    
    // Clear any existing timeout
    if (window.deadlineReminderTimeout) {
      clearTimeout(window.deadlineReminderTimeout);
    }
    
    window.deadlineReminderTimeout = setTimeout(() => {
      new Notification('🍞 Ricordati di ordinare!', {
        body: 'Hai tempo fino alle 21:00 per ordinare il pane per domani.',
        icon: '/apple-touch-icon.svg',
        tag: 'deadline-reminder',
        requireInteraction: true
      });
      // Reschedule for next day
      scheduleDeadlineReminder();
    }, timeUntilReminder);
    
    console.log(`Notification scheduled for ${reminderTime.toLocaleString()}`);
  }, []);

  // Toggle notifications
  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Il tuo browser non supporta le notifiche');
      return;
    }

    if (notificationsEnabled) {
      // Disable
      setNotificationsEnabled(false);
      localStorage.setItem('breadDeliveryNotifications', 'disabled');
      if (window.deadlineReminderTimeout) {
        clearTimeout(window.deadlineReminderTimeout);
      }
    } else {
      // Request permission and enable
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('breadDeliveryNotifications', 'enabled');
        scheduleDeadlineReminder();
        // Show test notification
        new Notification('🍞 Notifiche attivate!', {
          body: 'Riceverai un promemoria alle 20:00 per ordinare.',
          icon: '/apple-touch-icon.svg'
        });
      } else {
        alert('Permesso notifiche negato. Abilita le notifiche nelle impostazioni del browser.');
      }
    }
  };

  // Quick reorder - copy items from past order
  const handleQuickReorder = (order) => {
    setFormData({
      deliveryDate: getTomorrow(),
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity.toString(),
        unit: item.unit
      })),
      notes: order.notes || ''
    });
    setEditingOrder(null);
    setActiveTab('nuovo');
  };

  // Calendar navigation
  const navigateWeek = (direction) => {
    const newDate = new Date(calendarWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCalendarWeekStart(newDate);
  };

  // Get orders for a specific date (for calendar)
  const getOrdersForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return myOrders.filter(order => {
      const orderDate = order.deliveryDate?.toDate 
        ? order.deliveryDate.toDate().toISOString().split('T')[0]
        : order.deliveryDate;
      return orderDate === dateStr;
    });
  };

  const loadData = async () => {
    // Load products first (always needed)
    try {
      let productsData = await getProducts();
      
      // If no products, seed default ones
      if (productsData.length === 0) {
        productsData = await seedDefaultProducts(true);
      }
      
      // Add customer-specific products if available
      if (linkedCustomer?.customProducts && linkedCustomer.customProducts.length > 0) {
        const customProducts = linkedCustomer.customProducts.map((p, idx) => ({
          ...p,
          id: `custom-${idx}`,
          isCustom: true // Mark as custom product
        }));
        productsData = [...productsData, ...customProducts];
      }
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }

    // Load orders using linkedCustomer from context
    try {
      if (linkedCustomer?.id) {
        const ordersData = await getOrdersByCustomer(linkedCustomer.id);
        setMyOrders(ordersData);
      }
    } catch (error) {
      console.error('Error loading orders (index may be needed):', error);
      setMyOrders([]);
    }
    
    setLoading(false);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: '', unit: 'pezzi' }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product' && value) {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct?.defaultUnit) {
        newItems[index].unit = selectedProduct.defaultUnit;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  // Start editing an existing order
  const handleEditOrder = (order) => {
    // Check if order can still be modified
    if (!canModifyOrder(order.deliveryDate)) {
      alert('Il termine per modificare questo ordine è scaduto (ore 21:00 del giorno precedente)');
      return;
    }
    
    setEditingOrder(order);
    setFormData({
      deliveryDate: formatDateForInput(order.deliveryDate),
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity.toString(),
        unit: item.unit
      })),
      notes: order.notes || ''
    });
    setActiveTab('nuovo');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingOrder(null);
    setFormData(getEmptyFormData());
  };

  // Delete an order
  const handleDeleteOrder = async (orderId, deliveryDate) => {
    if (!canModifyOrder(deliveryDate)) {
      alert('Il termine per eliminare questo ordine è scaduto (ore 21:00 del giorno precedente)');
      return;
    }
    
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    
    setDeleting(true);
    try {
      await deleteOrder(orderId);
      await loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Errore nell\'eliminazione. Riprova.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!linkedCustomer?.id) {
      alert('Errore: impossibile identificare il cliente. Ricarica la pagina.');
      return;
    }
    
    const validItems = formData.items.filter(
      item => item.product && item.quantity && parseFloat(item.quantity) > 0
    );
    
    if (validItems.length === 0) {
      alert('Aggiungi almeno un prodotto');
      return;
    }

    // Check deadline for the selected delivery date
    if (!canModifyOrder(formData.deliveryDate)) {
      alert('Il termine per ordinare per questa data è scaduto (ore 21:00 del giorno precedente)');
      return;
    }

    setSaving(true);
    try {
      const orderData = {
        deliveryDate: formData.deliveryDate,
        items: validItems.map(item => ({
          product: item.product,
          quantity: parseFloat(item.quantity),
          unit: item.unit
        })),
        notes: formData.notes.trim() || null // Note consegna
      };

      if (editingOrder) {
        // Update existing order
        await updateOrder(editingOrder.id, orderData);
      } else {
        // Create new order
        await addOrder({
          customerId: linkedCustomer.id,
          customerName: linkedCustomer.name || userProfile?.name || user.email,
          customerEmail: user.email,
          ...orderData
        });
      }
      
      setSaved(true);
      setEditingOrder(null);
      setFormData(getEmptyFormData());
      await loadData();
      
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Errore nel salvataggio. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/D';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
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
          Ciao, {userProfile?.name || 'Cliente'}! 👋
        </h1>
        <p className="text-bread-600 mt-1">Effettua il tuo ordine</p>
      </div>

      {/* Success Toast */}
      {saved && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-bread flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-slide-down">
          <Check size={18} />
          <span>{editingOrder ? 'Ordine modificato!' : 'Ordine inviato con successo!'}</span>
        </div>
      )}

      {/* Editing Banner */}
      {editingOrder && (
        <div className="mb-4 bg-amber-50 border-2 border-amber-300 rounded-bread p-3 flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-2">
            <Edit2 size={18} className="text-amber-600" />
            <span className="text-amber-800 font-medium text-sm">
              Modifica ordine per {formatDate(editingOrder.deliveryDate)}
            </span>
          </div>
          <button 
            onClick={handleCancelEdit}
            className="text-amber-600 hover:text-amber-800 p-1"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Notification Toggle */}
      <div className="mb-4 animate-slide-up">
        <button
          onClick={handleToggleNotifications}
          className={`w-full py-3 px-4 rounded-bread font-medium flex items-center justify-center gap-2 transition-all ${
            notificationsEnabled
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
          }`}
        >
          {notificationsEnabled ? (
            <>
              <Bell size={18} />
              Promemoria ore 20:00 attivo
            </>
          ) : (
            <>
              <BellOff size={18} />
              Attiva promemoria ore 20:00
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-slide-up stagger-1">
        <button
          onClick={() => {
            setActiveTab('nuovo');
            if (!editingOrder) setFormData(getEmptyFormData());
          }}
          className={`flex-1 py-2.5 px-3 rounded-bread font-semibold transition-all text-sm ${
            activeTab === 'nuovo'
              ? 'bg-bread-600 text-white'
              : 'bg-white text-bread-600 border-2 border-bread-200'
          }`}
        >
          {editingOrder ? (
            <>
              <Edit2 size={16} className="inline mr-1" />
              Modifica
            </>
          ) : (
            <>
              <Plus size={16} className="inline mr-1" />
              Nuovo
            </>
          )}
        </button>
        <button
          onClick={() => setActiveTab('storico')}
          className={`flex-1 py-2.5 px-3 rounded-bread font-semibold transition-all text-sm ${
            activeTab === 'storico'
              ? 'bg-bread-600 text-white'
              : 'bg-white text-bread-600 border-2 border-bread-200'
          }`}
        >
          <Clock size={16} className="inline mr-1" />
          Storico
        </button>
        <button
          onClick={() => setActiveTab('calendario')}
          className={`flex-1 py-2.5 px-3 rounded-bread font-semibold transition-all text-sm ${
            activeTab === 'calendario'
              ? 'bg-bread-600 text-white'
              : 'bg-white text-bread-600 border-2 border-bread-200'
          }`}
        >
          <CalendarDays size={16} className="inline mr-1" />
          Calendario
        </button>
      </div>

      {activeTab === 'nuovo' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* No Products Warning */}
          {products.length === 0 && (
            <div className="card bg-amber-50 border-2 border-amber-200 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Package size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Nessun prodotto disponibile</h3>
                  <p className="text-sm text-amber-600">
                    Contatta l'amministratore per aggiungere i prodotti
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date Selection */}
          <div className="card animate-slide-up stagger-2">
            <label className="label">
              <Calendar className="inline mr-2" size={18} />
              Data Consegna *
            </label>
            <input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="input-field"
              required
            />
          </div>

          {/* Products List */}
          <div className="animate-slide-up stagger-3">
            <label className="label mb-4">
              <Package className="inline mr-2" size={18} />
              Prodotti *
            </label>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge">
                      <ShoppingBag size={14} className="inline mr-1" />
                      Articolo {index + 1}
                    </span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 p-2"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-bread-600 mb-1 block">Prodotto</label>
                      <select
                        value={item.product}
                        onChange={(e) => updateItem(index, 'product', e.target.value)}
                        className="select-field"
                        required
                      >
                        <option value="">Seleziona prodotto...</option>
                        {products.map(product => (
                          <option key={product.id || product.name} value={product.name}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-bread-600 mb-1 block">Quantità</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="0"
                          className="input-field text-center text-xl font-semibold"
                          min="0"
                          step="0.1"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-bread-600 mb-1 block">Unità</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="select-field"
                        >
                          {UNITS.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="btn-secondary mt-4"
            >
              <Plus size={24} />
              Aggiungi Altro Prodotto
            </button>
          </div>

          {/* Note Consegna */}
          <div className="card animate-slide-up stagger-4">
            <label className="label">
              <MessageSquare className="inline mr-2" size={18} />
              Note Consegna (opzionale)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Es: Lasciare al bar se chiuso, chiamare prima..."
              className="input-field min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          {/* Deadline Info */}
          {formData.deliveryDate && (
            <div className="card bg-blue-50 border-2 border-blue-200 animate-slide-up">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">
                    Termine per modifiche:
                  </p>
                  <p className="text-blue-600">
                    {getDeadlineString(formData.deliveryDate)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="fixed bottom-24 left-0 right-0 px-4 z-40">
            <button
              type="submit"
              className="btn-primary shadow-bread-lg"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  {editingOrder ? 'Salvataggio...' : 'Invio in corso...'}
                </>
              ) : editingOrder ? (
                <>
                  <Check size={24} />
                  Salva Modifiche
                </>
              ) : (
                <>
                  <Send size={24} />
                  Invia Ordine
                </>
              )}
            </button>
          </div>
        </form>
      ) : activeTab === 'storico' ? (
        <div className="space-y-4 animate-slide-up">
          {myOrders.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-display font-semibold text-bread-700 mb-2">
                Nessun ordine
              </h3>
              <p className="text-bread-500">
                Non hai ancora effettuato ordini
              </p>
            </div>
          ) : (
            myOrders.map((order, index) => {
              const isEditable = canModifyOrder(order.deliveryDate);
              const isCurrentlyEditing = editingOrder?.id === order.id;
              
              return (
                <div 
                  key={order.id} 
                  className={`card ${isCurrentlyEditing ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-bread-600" />
                      <span className="font-semibold text-bread-800">
                        {formatDate(order.deliveryDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {order.items?.map((item, i) => (
                      <span key={i} className="badge text-xs">
                        {item.product}: {item.quantity} {item.unit}
                      </span>
                    ))}
                  </div>

                  {/* Show notes if present */}
                  {order.notes && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700 flex items-start gap-1">
                        <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                        {order.notes}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-bread-100">
                    {/* Quick Reorder - always visible */}
                    <button
                      onClick={() => handleQuickReorder(order)}
                      className="flex-1 py-2 px-3 rounded-bread text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300 transition-all flex items-center justify-center gap-1"
                    >
                      <RefreshCw size={16} />
                      Riordina
                    </button>
                    
                    {isEditable ? (
                      <>
                        <button
                          onClick={() => handleEditOrder(order)}
                          disabled={isCurrentlyEditing}
                          className={`py-2 px-3 rounded-bread text-sm font-medium flex items-center justify-center gap-1 transition-all ${
                            isCurrentlyEditing 
                              ? 'bg-amber-200 text-amber-700 cursor-not-allowed' 
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-300'
                          }`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.deliveryDate)}
                          disabled={deleting}
                          className="py-2 px-3 rounded-bread text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-bread-400 flex items-center gap-1 py-2">
                        <Clock size={12} />
                        Scaduto
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="animate-slide-up">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 rounded-bread bg-bread-100 text-bread-700 hover:bg-bread-200"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="font-semibold text-bread-800">
              {getWeekDates(calendarWeekStart)[0].toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 rounded-bread bg-bread-100 text-bread-700 hover:bg-bread-200"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DAY_NAMES.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-bread-500 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {getWeekDates(calendarWeekStart).map((date, index) => {
              const orders = getOrdersForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date() && !isToday;
              const dateStr = date.toISOString().split('T')[0];
              
              return (
                <div 
                  key={index}
                  className={`card p-3 ${isToday ? 'ring-2 ring-bread-500 bg-bread-50' : ''} ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${isToday ? 'text-bread-700' : 'text-bread-800'}`}>
                        {date.getDate()}
                      </span>
                      <span className="text-sm text-bread-500">
                        {DAY_NAMES[index]}
                      </span>
                      {isToday && (
                        <span className="badge text-xs bg-bread-500 text-white">Oggi</span>
                      )}
                    </div>
                    {!isPast && orders.length === 0 && (
                      <button
                        onClick={() => {
                          setFormData({ ...getEmptyFormData(), deliveryDate: dateStr });
                          setActiveTab('nuovo');
                        }}
                        className="text-xs bg-bread-100 text-bread-600 px-2 py-1 rounded-full hover:bg-bread-200"
                      >
                        + Ordina
                      </button>
                    )}
                  </div>
                  
                  {orders.length > 0 ? (
                    <div className="space-y-1">
                      {orders.map(order => (
                        <div key={order.id} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center justify-between">
                          <span>
                            {order.items?.map(i => `${i.product} ${i.quantity}${i.unit}`).join(', ')}
                          </span>
                          {canModifyOrder(order.deliveryDate) && (
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-bread-400">
                      {isPast ? 'Nessun ordine' : 'Nessun ordine previsto'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteOrdine;

