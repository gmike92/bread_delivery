import { useState, useEffect } from 'react';
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
  X
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

const ClienteOrdine = () => {
  const { user, userProfile, linkedCustomer } = useAuth();
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('nuovo'); // 'nuovo' or 'storico'
  const [editingOrder, setEditingOrder] = useState(null); // Order being edited

  // Get tomorrow's date as default
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getEmptyFormData = () => ({
    deliveryDate: getTomorrow(),
    items: [{ product: '', quantity: '', unit: 'pezzi' }]
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

  useEffect(() => {
    loadData();
  }, [linkedCustomer]);

  const loadData = async () => {
    // Load products first (always needed)
    try {
      let productsData = await getProducts();
      
      // If no products, seed default ones
      if (productsData.length === 0) {
        productsData = await seedDefaultProducts(true);
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
      }))
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
        }))
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-slide-up stagger-1">
        <button
          onClick={() => {
            setActiveTab('nuovo');
            if (!editingOrder) setFormData(getEmptyFormData());
          }}
          className={`flex-1 py-3 px-4 rounded-bread font-semibold transition-all ${
            activeTab === 'nuovo'
              ? 'bg-bread-600 text-white'
              : 'bg-white text-bread-600 border-2 border-bread-200'
          }`}
        >
          {editingOrder ? (
            <>
              <Edit2 size={20} className="inline mr-2" />
              Modifica
            </>
          ) : (
            <>
              <Plus size={20} className="inline mr-2" />
              Nuovo Ordine
            </>
          )}
        </button>
        <button
          onClick={() => setActiveTab('storico')}
          className={`flex-1 py-3 px-4 rounded-bread font-semibold transition-all ${
            activeTab === 'storico'
              ? 'bg-bread-600 text-white'
              : 'bg-white text-bread-600 border-2 border-bread-200'
          }`}
        >
          <Clock size={20} className="inline mr-2" />
          I Miei Ordini
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
      ) : (
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
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.items?.map((item, i) => (
                      <span key={i} className="badge text-xs">
                        {item.product}: {item.quantity} {item.unit}
                      </span>
                    ))}
                  </div>

                  {/* Edit/Delete buttons or deadline passed message */}
                  {isEditable ? (
                    <div className="flex gap-2 pt-2 border-t border-bread-100">
                      <button
                        onClick={() => handleEditOrder(order)}
                        disabled={isCurrentlyEditing}
                        className={`flex-1 py-2 px-3 rounded-bread text-sm font-medium flex items-center justify-center gap-1 transition-all ${
                          isCurrentlyEditing 
                            ? 'bg-amber-200 text-amber-700 cursor-not-allowed' 
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-300'
                        }`}
                      >
                        <Edit2 size={16} />
                        {isCurrentlyEditing ? 'In modifica...' : 'Modifica'}
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id, order.deliveryDate)}
                        disabled={deleting}
                        className="py-2 px-3 rounded-bread text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 size={16} />
                        Elimina
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-bread-100">
                      <p className="text-xs text-bread-400 flex items-center gap-1">
                        <Clock size={12} />
                        Termine modifica scaduto
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ClienteOrdine;

