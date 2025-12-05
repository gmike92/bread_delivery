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
import { useAuth } from '../context/AuthContext';
import { getCustomers, getProducts, addDelivery, addProduct, getOrdersByDate, getDeliveriesByDate, calculateDeliveryProgress, seedDefaultProducts } from '../firebase/firestore';

const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

// Default products that are always shown (fixed kg unit)
const DEFAULT_PRODUCTS = [
  { name: 'Pane Comune', unit: 'kg' },
  { name: 'Pane Speciale', unit: 'kg' },
  { name: 'Pane di Segale', unit: 'kg' },
  { name: 'Segalini', unit: 'kg' },
  { name: 'Pizza', unit: 'kg' },
  { name: 'Focaccia', unit: 'kg' }
];

const NewDelivery = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Default items are always shown
  const [defaultItems, setDefaultItems] = useState(
    DEFAULT_PRODUCTS.map(p => ({ product: p.name, quantity: '', unit: p.unit }))
  );
  
  // Extra items can be added
  const [extraItems, setExtraItems] = useState([]);
  
  // Customer-specific products
  const [customerProducts, setCustomerProducts] = useState([]);

  const [formData, setFormData] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0]
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
        
        // If no products, seed default ones
        let finalProducts = productsData;
        if (productsData.length === 0) {
          finalProducts = await seedDefaultProducts(true);
        }
        
        setCustomers(customersData);
        setProducts(finalProducts);
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

  const updateDefaultItem = (index, quantity) => {
    const newItems = [...defaultItems];
    newItems[index] = { ...newItems[index], quantity };
    setDefaultItems(newItems);
  };

  const addExtraItem = () => {
    setExtraItems([...extraItems, { product: '', quantity: '', unit: 'kg' }]);
  };

  const removeExtraItem = (index) => {
    setExtraItems(extraItems.filter((_, i) => i !== index));
  };

  const updateExtraItem = (index, field, value) => {
    const newItems = [...extraItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product' && value) {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct?.defaultUnit) {
        newItems[index].unit = selectedProduct.defaultUnit;
      }
    }
    
    setExtraItems(newItems);
  };

  // Only admin can create new products
  const handleAddProduct = async () => {
    if (!newProductName.trim() || !isAdmin) return;
    
    try {
      await addProduct({ name: newProductName.trim(), defaultUnit: 'kg' });
      setProducts([...products, { name: newProductName.trim(), defaultUnit: 'kg' }]);
      setNewProductName('');
      setShowAddProduct(false);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  // Get order info for a specific product
  const getOrderInfo = (productName) => {
    if (!customerOrder?.items) return null;
    return customerOrder.items.find(item => item.product === productName);
  };

  // Quick fill from order
  const fillFromOrder = (productName, index) => {
    const orderInfo = getOrderInfo(productName);
    if (orderInfo) {
      const remaining = orderInfo.ordered - orderInfo.delivered;
      if (remaining > 0) {
        updateDefaultItem(index, remaining.toString());
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      alert('Seleziona un cliente');
      return;
    }
    
    // Combine default and extra items, filter only those with quantity
    const allItems = [
      ...defaultItems.filter(item => item.quantity && parseFloat(item.quantity) > 0),
      ...extraItems.filter(item => item.product && item.quantity && parseFloat(item.quantity) > 0)
    ];
    
    if (allItems.length === 0) {
      alert('Inserisci almeno una quantità');
      return;
    }

    setSaving(true);
    try {
      await addDelivery({
        customerId: formData.customerId,
        customerName: customers.find(c => c.id === formData.customerId)?.name || '',
        date: formData.date,
        items: allItems.map(item => ({
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

  // Get non-default products for extra items dropdown
  const extraProductOptions = products.filter(
    p => !DEFAULT_PRODUCTS.some(dp => dp.name === p.name)
  );

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
            Cliente *
          </label>
          <select
            value={formData.customerId}
            onChange={(e) => {
              const customerId = e.target.value;
              setFormData({ ...formData, customerId });
              
              // Load customer-specific products
              const customer = customers.find(c => c.id === customerId);
              if (customer?.customProducts && customer.customProducts.length > 0) {
                setCustomerProducts(customer.customProducts);
              } else {
                setCustomerProducts([]);
              }
            }}
            className="select-field"
            required
          >
            <option value="">Scegli un cliente...</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.customProducts?.length > 0 && ' ★'}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        <div className="card animate-slide-up stagger-2">
          <label className="label">
            <Calendar className="inline mr-2" size={18} />
            Data
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
            <div className="flex items-center justify-center py-2">
              <Loader2 className="animate-spin text-bread-500" size={20} />
              <span className="ml-2 text-bread-600 text-sm">Caricamento ordine...</span>
            </div>
          </div>
        )}

        {customerOrder && !loadingOrder && (
          <div className={`card animate-fade-in border-2 ${customerOrder.isComplete ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={18} className={customerOrder.isComplete ? 'text-green-600' : 'text-amber-600'} />
              <span className="font-semibold text-bread-800 text-sm">Ordine Cliente</span>
              {customerOrder.isComplete && (
                <span className="badge bg-green-100 text-green-700 text-xs ml-auto">
                  <Check size={12} className="inline" /> Completo
                </span>
              )}
            </div>
            <p className="text-xs text-amber-700">
              💡 Tocca i valori sotto per riempire automaticamente
            </p>
          </div>
        )}

        {formData.customerId && !customerOrder && !loadingOrder && (
          <div className="card animate-fade-in border-2 border-gray-200 bg-gray-50 !py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle size={18} />
              <span className="text-sm">Nessun ordine per questa data</span>
            </div>
          </div>
        )}

        {/* Default Products - Compact Single Line Layout */}
        <div className="card animate-slide-up stagger-3">
          <label className="label mb-4">
            <Package className="inline mr-2" size={18} />
            Prodotti
          </label>

          <div className="space-y-3">
            {defaultItems.map((item, index) => {
              const orderInfo = getOrderInfo(item.product);
              const hasOrder = orderInfo && orderInfo.ordered > 0;
              const remaining = hasOrder ? orderInfo.ordered - orderInfo.delivered : 0;
              const isComplete = hasOrder && orderInfo.isComplete;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 py-2 px-3 rounded-bread ${
                    hasOrder 
                      ? isComplete 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-amber-50 border border-amber-200'
                      : 'bg-bread-50 border border-bread-100'
                  }`}
                >
                  {/* Product Name */}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-bread-800 text-sm truncate block">
                      {item.product}
                    </span>
                    {hasOrder && (
                      <button
                        type="button"
                        onClick={() => fillFromOrder(item.product, index)}
                        className={`text-xs ${
                          isComplete ? 'text-green-600' : 'text-amber-600 underline'
                        }`}
                      >
                        {isComplete ? (
                          <><Check size={10} className="inline" /> {orderInfo.delivered}/{orderInfo.ordered}</>
                        ) : (
                          <>Ord: {orderInfo.ordered} • Manca: {remaining}</>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Quantity Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateDefaultItem(index, e.target.value)}
                      placeholder="0"
                      className="w-20 h-12 text-center text-lg font-bold border-2 border-bread-200 rounded-bread focus:border-bread-500 focus:outline-none"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-bread-500 font-medium w-8">kg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer-Specific Products */}
        {customerProducts.length > 0 && (
          <div className="animate-slide-up stagger-4 mb-6">
            <label className="label flex items-center gap-2">
              <Package className="text-purple-600" size={18} />
              <span className="text-purple-700">Prodotti Personalizzati</span>
              <span className="text-xs text-purple-500">(solo per questo cliente)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {customerProducts.map((product, index) => {
                const itemIndex = defaultItems.length + index;
                const existingExtra = extraItems.find(e => e.product === product.name);
                const value = existingExtra?.quantity || '';
                
                return (
                  <div key={`custom-${index}`} className="bg-purple-50 rounded-bread p-3 border border-purple-200">
                    <label className="text-sm font-medium text-purple-800 mb-1 block truncate">
                      {product.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (existingExtra) {
                            // Update existing
                            setExtraItems(extraItems.map(item =>
                              item.product === product.name
                                ? { ...item, quantity: newValue }
                                : item
                            ));
                          } else if (newValue) {
                            // Add new
                            setExtraItems([...extraItems, {
                              product: product.name,
                              quantity: newValue,
                              unit: product.defaultUnit || 'kg'
                            }]);
                          }
                        }}
                        placeholder="0"
                        min="0"
                        step="0.1"
                        className="input-field !py-2 text-center flex-1"
                      />
                      <span className="text-purple-600 text-sm font-medium min-w-[2rem]">
                        {product.defaultUnit || 'kg'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extra Products */}
        <div className="animate-slide-up stagger-4">
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">
              <Plus className="inline mr-2" size={18} />
              Altri Prodotti
            </label>
            {/* Only admin can create new products */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddProduct(true)}
                className="text-bread-600 text-xs font-medium"
              >
                + Nuovo Prodotto
              </button>
            )}
          </div>

          {/* Add Product Modal - Only for Admin */}
          {showAddProduct && isAdmin && (
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

          {/* Extra Items */}
          {extraItems.length > 0 && (
            <div className="space-y-3 mb-4">
              {extraItems.map((item, index) => (
                <div key={index} className="card !p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge text-xs bg-blue-100 text-blue-700">Extra</span>
                    <button
                      type="button"
                      onClick={() => removeExtraItem(index)}
                      className="ml-auto text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={item.product}
                      onChange={(e) => updateExtraItem(index, 'product', e.target.value)}
                      className="select-field flex-1 !py-2 text-sm"
                    >
                      <option value="">Prodotto...</option>
                      {extraProductOptions.map(product => (
                        <option key={product.id || product.name} value={product.name}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateExtraItem(index, 'quantity', e.target.value)}
                      placeholder="Qtà"
                      className="w-20 input-field !py-2 text-center"
                      min="0"
                      step="0.1"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateExtraItem(index, 'unit', e.target.value)}
                      className="select-field w-24 !py-2 text-sm"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addExtraItem}
            className="btn-secondary !py-3"
          >
            <Plus size={20} />
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
