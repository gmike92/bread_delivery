import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  Calendar,
  User,
  Package,
  Check,
  ShoppingBag,
  AlertCircle
} from 'lucide-react';
import { getCustomers, getProducts, addDelivery, addProduct, getOrdersByDate, getDeliveriesByDate, calculateDeliveryProgress } from '../firebase/firestore';

const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

const NewDelivery = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ product: '', quantity: '', unit: 'kg' }]
  });

  const [newProductName, setNewProductName] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [customerOrder, setCustomerOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersData, productsData] = await Promise.all([
          getCustomers(),
          getProducts()
        ]);
        setCustomers(customersData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load customer's order when customer or date changes
  useEffect(() => {
    const loadCustomerOrder = async () => {
      if (!formData.customerId || !formData.date) {
        setCustomerOrder(null);
        return;
      }

      setLoadingOrder(true);
      try {
        const [orders, deliveries] = await Promise.all([
          getOrdersByDate(formData.date),
          getDeliveriesByDate(formData.date)
        ]);

        // Find order for this customer
        const customerOrders = orders.filter(o => o.customerId === formData.customerId);
        
        if (customerOrders.length > 0) {
          const ordersWithProgress = calculateDeliveryProgress(customerOrders, deliveries);
          setCustomerOrder(ordersWithProgress[0]);
        } else {
          setCustomerOrder(null);
        }
      } catch (error) {
        console.error('Error loading customer order:', error);
        setCustomerOrder(null);
      } finally {
        setLoadingOrder(false);
      }
    };

    loadCustomerOrder();
  }, [formData.customerId, formData.date]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: '', unit: 'kg' }]
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
    
    // Auto-set unit based on product selection
    if (field === 'product' && value) {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct?.defaultUnit) {
        newItems[index].unit = selectedProduct.defaultUnit;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    
    try {
      await addProduct({ name: newProductName.trim(), defaultUnit: 'kg' });
      setProducts([...products, { name: newProductName.trim(), defaultUnit: 'kg' }]);
      setNewProductName('');
      setShowAddProduct(false);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.customerId) {
      alert('Seleziona un cliente');
      return;
    }
    
    const validItems = formData.items.filter(
      item => item.product && item.quantity && parseFloat(item.quantity) > 0
    );
    
    if (validItems.length === 0) {
      alert('Aggiungi almeno un prodotto');
      return;
    }

    setSaving(true);
    try {
      await addDelivery({
        customerId: formData.customerId,
        customerName: customers.find(c => c.id === formData.customerId)?.name || '',
        date: formData.date,
        items: validItems.map(item => ({
          product: item.product,
          quantity: parseFloat(item.quantity),
          unit: item.unit
        }))
      });
      
      setSaved(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Errore nel salvataggio. Riprova.');
    } finally {
      setSaving(false);
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

  // Success State
  if (saved) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-screen animate-fade-in">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check size={48} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-bread-800 mb-2">
          Consegna Salvata!
        </h2>
        <p className="text-bread-600">Ritorno alla home...</p>
      </div>
    );
  }

  return (
    <div className="page-container pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-slide-up">
        <button onClick={() => navigate(-1)} className="btn-icon">
          <ChevronLeft size={24} />
        </button>
        <h1 className="page-title mb-0">Nuova Consegna</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="card animate-slide-up stagger-1">
          <label className="label">
            <User className="inline mr-2" size={18} />
            Seleziona Cliente *
          </label>
          <select
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="select-field"
            required
          >
            <option value="">Scegli un cliente...</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        <div className="card animate-slide-up stagger-2">
          <label className="label">
            <Calendar className="inline mr-2" size={18} />
            Data Consegna
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="input-field"
          />
        </div>

        {/* Customer Order Info */}
        {loadingOrder && (
          <div className="card animate-fade-in border-2 border-bread-200">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-bread-500" size={24} />
              <span className="ml-2 text-bread-600">Caricamento ordine...</span>
            </div>
          </div>
        )}

        {customerOrder && !loadingOrder && (
          <div className={`card animate-fade-in border-2 ${customerOrder.isComplete ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag size={20} className={customerOrder.isComplete ? 'text-green-600' : 'text-amber-600'} />
              <h3 className="font-semibold text-bread-800">
                Ordine del Cliente
              </h3>
              {customerOrder.isComplete && (
                <span className="badge bg-green-100 text-green-700 text-xs ml-auto">
                  <Check size={12} className="inline mr-1" />
                  Completato
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              {customerOrder.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-bread-200 last:border-0">
                  <span className="text-bread-700">{item.product}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      item.isComplete ? 'text-green-600' : 
                      item.delivered > 0 ? 'text-amber-600' : 'text-bread-800'
                    }`}>
                      {item.delivered}/{item.ordered} {item.unit}
                    </span>
                    {item.isComplete ? (
                      <Check size={18} className="text-green-500" />
                    ) : item.delivered > 0 ? (
                      <AlertCircle size={18} className="text-amber-500" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {!customerOrder.isComplete && (
              <p className="text-xs text-amber-700 mt-3">
                💡 Inserisci la quantità consegnata per aggiornare il progresso
              </p>
            )}
          </div>
        )}

        {formData.customerId && !customerOrder && !loadingOrder && (
          <div className="card animate-fade-in border-2 border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle size={20} />
              <span className="text-sm">Nessun ordine per questo cliente in questa data</span>
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <label className="label mb-0">
              <Package className="inline mr-2" size={18} />
              Prodotti *
            </label>
            <button
              type="button"
              onClick={() => setShowAddProduct(true)}
              className="text-bread-600 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              Nuovo Prodotto
            </button>
          </div>

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="card mb-4 border-2 border-bread-400 animate-fade-in">
              <label className="label">Aggiungi Nuovo Prodotto</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Nome prodotto"
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="btn-icon bg-bread-600 text-white"
                >
                  <Check size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setNewProductName('');
                  }}
                  className="btn-icon"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Product Items */}
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge">Articolo {index + 1}</span>
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

          {/* Add Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="btn-secondary mt-4"
          >
            <Plus size={24} />
            Aggiungi Altro Articolo
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
                Salvataggio...
              </>
            ) : (
              <>
                <Save size={24} />
                Salva Consegna
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDelivery;

