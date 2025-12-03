import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Package, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  Loader2,
  User,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  seedDefaultProducts 
} from '../firebase/firestore';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', defaultUnit: 'kg' });
  const [saving, setSaving] = useState(false);

  const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const result = await logout();
    if (result.success) {
      navigate('/login', { replace: true });
    }
    setLoggingOut(false);
  };

  const openAddProduct = () => {
    setProductForm({ name: '', defaultUnit: 'kg' });
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const openEditProduct = (product) => {
    setProductForm({ name: product.name, defaultUnit: product.defaultUnit || 'kg' });
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({ name: '', defaultUnit: 'kg' });
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return;

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productForm);
      } else {
        await addProduct(productForm);
      }
      await loadProducts();
      closeProductForm();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Eliminare "${product.name}"?`)) {
      try {
        await deleteProduct(product.id);
        await loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleSeedProducts = async () => {
    if (window.confirm('Aggiungere i prodotti predefiniti?')) {
      setLoading(true);
      try {
        await seedDefaultProducts();
        await loadProducts();
      } catch (error) {
        console.error('Error seeding products:', error);
      } finally {
        setLoading(false);
      }
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
    <div className="page-container">
      <h1 className="page-title animate-slide-up">Impostazioni</h1>

      {/* User Info */}
      <div className="card mb-6 animate-slide-up stagger-1">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-bread-200 rounded-full flex items-center justify-center">
            <User size={28} className="text-bread-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-bread-800">Connesso come</h3>
            <p className="text-bread-600 text-sm truncate">{user?.email}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="btn-danger mt-4"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Disconnessione...
            </>
          ) : (
            <>
              <LogOut size={24} />
              Esci
            </>
          )}
        </button>
      </div>

      {/* Product Management */}
      <div className="animate-slide-up stagger-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-bread-700 flex items-center gap-2">
            <Package size={20} />
            Prodotti
          </h2>
          <div className="flex gap-2">
            {products.length === 0 && (
              <button
                onClick={handleSeedProducts}
                className="btn-icon !min-w-[2.5rem] !min-h-[2.5rem]"
                title="Aggiungi prodotti predefiniti"
              >
                <Download size={18} />
              </button>
            )}
            <button
              onClick={openAddProduct}
              className="btn-icon bg-bread-600 text-white !min-w-[2.5rem] !min-h-[2.5rem]"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Product Form */}
        {showProductForm && (
          <div className="card mb-4 border-2 border-bread-400 animate-fade-in">
            <h3 className="font-semibold text-bread-800 mb-4">
              {editingProduct ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="label">Nome Prodotto</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Inserisci nome prodotto"
                  className="input-field"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="label">Unità Predefinita</label>
                <select
                  value={productForm.defaultUnit}
                  onChange={(e) => setProductForm({ ...productForm, defaultUnit: e.target.value })}
                  className="select-field"
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveProduct}
                  className="btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  Salva
                </button>
                <button
                  onClick={closeProductForm}
                  className="btn-secondary flex-1"
                >
                  <X size={20} />
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product List */}
        {products.length === 0 ? (
          <div className="card text-center py-8">
            <Package size={48} className="mx-auto text-bread-300 mb-3" />
            <p className="text-bread-500">Nessun prodotto</p>
            <button
              onClick={handleSeedProducts}
              className="btn-secondary mt-4 max-w-xs mx-auto"
            >
              <RefreshCw size={20} />
              Carica Prodotti Predefiniti
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="card !p-4 flex items-center justify-between"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div>
                  <span className="font-medium text-bread-800">{product.name}</span>
                  <span className="badge ml-2 text-xs">{product.defaultUnit}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditProduct(product)}
                    className="p-2 text-bread-600 hover:bg-bread-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="mt-8 text-center text-bread-400 text-sm animate-slide-up stagger-3">
        <p>Gestione Consegne Pane v1.0.0</p>
        <p className="mt-1">Fatto con 🍞 per i panifici</p>
      </div>
    </div>
  );
};

export default Settings;

