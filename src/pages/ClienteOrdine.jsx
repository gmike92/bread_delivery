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
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProducts, addOrder, getOrdersByCustomer } from '../firebase/firestore';

const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

const ClienteOrdine = () => {
  const { user, userProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('nuovo'); // 'nuovo' or 'storico'

  // Get tomorrow's date as default
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    deliveryDate: getTomorrow(),
    items: [{ product: '', quantity: '', unit: 'pezzi' }]
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [productsData, ordersData] = await Promise.all([
        getProducts(),
        user ? getOrdersByCustomer(user.uid) : []
      ]);
      setProducts(productsData);
      setMyOrders(ordersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validItems = formData.items.filter(
      item => item.product && item.quantity && parseFloat(item.quantity) > 0
    );
    
    if (validItems.length === 0) {
      alert('Aggiungi almeno un prodotto');
      return;
    }

    setSaving(true);
    try {
      await addOrder({
        customerId: user.uid,
        customerName: userProfile?.name || user.email,
        customerEmail: user.email,
        deliveryDate: formData.deliveryDate,
        items: validItems.map(item => ({
          product: item.product,
          quantity: parseFloat(item.quantity),
          unit: item.unit
        }))
      });
      
      setSaved(true);
      // Reset form
      setFormData({
        deliveryDate: getTomorrow(),
        items: [{ product: '', quantity: '', unit: 'pezzi' }]
      });
      // Reload orders
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
          <span>Ordine inviato con successo!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-slide-up stagger-1">
        <button
          onClick={() => setActiveTab('nuovo')}
          className={`flex-1 py-3 px-4 rounded-bread font-semibold transition-all ${
            activeTab === 'nuovo'
              ? 'bg-bread-600 text-white'
              : 'bg-white text-bread-600 border-2 border-bread-200'
          }`}
        >
          <Plus size={20} className="inline mr-2" />
          Nuovo Ordine
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
                  Invio in corso...
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
            myOrders.map((order, index) => (
              <div 
                key={order.id} 
                className="card"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-bread-600" />
                    <span className="font-semibold text-bread-800">
                      {formatDate(order.deliveryDate)}
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.items?.map((item, i) => (
                    <span key={i} className="badge text-xs">
                      {item.product}: {item.quantity} {item.unit}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClienteOrdine;

