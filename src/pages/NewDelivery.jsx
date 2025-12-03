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
  Check
} from 'lucide-react';
import { getCustomers, getProducts, addDelivery, addProduct } from '../firebase/firestore';

const UNITS = ['kg', 'pieces', 'boxes', 'loaves', 'dozen'];

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
      alert('Please select a customer');
      return;
    }
    
    const validItems = formData.items.filter(
      item => item.product && item.quantity && parseFloat(item.quantity) > 0
    );
    
    if (validItems.length === 0) {
      alert('Please add at least one item');
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
      alert('Error saving delivery. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-bread-600 font-medium">Loading...</p>
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
          Delivery Saved!
        </h2>
        <p className="text-bread-600">Redirecting to dashboard...</p>
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
        <h1 className="page-title mb-0">New Delivery</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="card animate-slide-up stagger-1">
          <label className="label">
            <User className="inline mr-2" size={18} />
            Select Customer *
          </label>
          <select
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="select-field"
            required
          >
            <option value="">Choose a customer...</option>
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
            Delivery Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="input-field"
          />
        </div>

        {/* Products List */}
        <div className="animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <label className="label mb-0">
              <Package className="inline mr-2" size={18} />
              Products *
            </label>
            <button
              type="button"
              onClick={() => setShowAddProduct(true)}
              className="text-bread-600 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              New Product
            </button>
          </div>

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="card mb-4 border-2 border-bread-400 animate-fade-in">
              <label className="label">Add New Product</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Product name"
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
                  <span className="badge">Item {index + 1}</span>
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
                    <label className="text-sm text-bread-600 mb-1 block">Product</label>
                    <select
                      value={item.product}
                      onChange={(e) => updateItem(index, 'product', e.target.value)}
                      className="select-field"
                    >
                      <option value="">Select product...</option>
                      {products.map(product => (
                        <option key={product.id || product.name} value={product.name}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-bread-600 mb-1 block">Quantity</label>
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
                      <label className="text-sm text-bread-600 mb-1 block">Unit</label>
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
            Add Another Item
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
                Saving...
              </>
            ) : (
              <>
                <Save size={24} />
                Save Delivery
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDelivery;

