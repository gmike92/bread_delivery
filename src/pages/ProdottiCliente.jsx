import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Package, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
  X,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getCustomer,
  updateCustomer,
  getProducts
} from '../firebase/firestore';

const ProdottiCliente = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [customer, setCustomer] = useState(null);
  const [standardProducts, setStandardProducts] = useState([]);
  const [customProducts, setCustomProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', defaultUnit: 'kg' });

  const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [customerId, isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customerData, productsData] = await Promise.all([
        getCustomer(customerId),
        getProducts()
      ]);
      
      setCustomer(customerData);
      setStandardProducts(productsData);
      setCustomProducts(customerData?.customProducts || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;
    
    // Check for duplicates
    const exists = customProducts.some(p => 
      p.name.toLowerCase() === newProduct.name.trim().toLowerCase()
    );
    
    if (exists) {
      alert('Questo prodotto esiste già per questo cliente');
      return;
    }
    
    setCustomProducts([...customProducts, {
      name: newProduct.name.trim(),
      defaultUnit: newProduct.defaultUnit
    }]);
    
    setNewProduct({ name: '', defaultUnit: 'kg' });
    setShowAddForm(false);
  };

  const handleRemoveProduct = (index) => {
    setCustomProducts(customProducts.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCustomer(customerId, { customProducts });
      alert('✅ Prodotti personalizzati salvati!');
      navigate('/customers');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-bread-600" size={40} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-container text-center py-10">
        <p className="text-bread-600">Cliente non trovato</p>
        <button onClick={() => navigate('/customers')} className="btn-secondary mt-4">
          Torna ai Clienti
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="btn-icon">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-bread-800">
            Prodotti Personalizzati
          </h1>
          <p className="text-bread-500 text-sm flex items-center gap-1">
            <User size={14} />
            {customer.name}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>💡 Prodotti Personalizzati:</strong> Questi prodotti saranno disponibili 
          <strong> solo</strong> per questo cliente, oltre ai prodotti standard.
        </p>
      </div>

      {/* Standard Products Reference */}
      <div className="card">
        <h3 className="font-semibold text-bread-700 mb-2 flex items-center gap-2">
          <Package size={18} />
          Prodotti Standard (per tutti)
        </h3>
        <div className="flex flex-wrap gap-2">
          {standardProducts.map(product => (
            <span 
              key={product.id}
              className="px-3 py-1 bg-bread-100 text-bread-600 rounded-full text-sm"
            >
              {product.name}
            </span>
          ))}
        </div>
      </div>

      {/* Custom Products */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-bread-700 flex items-center gap-2">
            <Package size={18} className="text-purple-600" />
            Prodotti Solo per {customer.name}
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-icon bg-purple-600 text-white !min-w-[2.5rem] !min-h-[2.5rem]"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-purple-50 rounded-bread border border-purple-200 animate-slide-up">
            <h4 className="font-medium text-purple-800 mb-3">Nuovo Prodotto Personalizzato</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-purple-700">Nome Prodotto</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Es: Pane Speciale Grande"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-purple-700">Unità</label>
                <select
                  value={newProduct.defaultUnit}
                  onChange={(e) => setNewProduct({ ...newProduct, defaultUnit: e.target.value })}
                  className="select-field"
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddProduct}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-bread font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Aggiungi
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewProduct({ name: '', defaultUnit: 'kg' });
                  }}
                  className="flex-1 py-2 bg-purple-100 text-purple-700 rounded-bread font-medium"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Products List */}
        {customProducts.length === 0 ? (
          <div className="text-center py-6 text-bread-400">
            <Package size={40} className="mx-auto mb-2 opacity-50" />
            <p>Nessun prodotto personalizzato</p>
            <p className="text-sm">Clicca + per aggiungerne uno</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-purple-50 rounded-bread"
              >
                <div>
                  <span className="font-medium text-purple-800">{product.name}</span>
                  <span className="ml-2 text-xs text-purple-500">({product.defaultUnit})</span>
                </div>
                <button
                  onClick={() => handleRemoveProduct(index)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-bread-600 text-white rounded-bread font-semibold shadow-bread-lg flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Salvataggio...
            </>
          ) : (
            <>
              <Save size={20} />
              Salva Prodotti Personalizzati
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProdottiCliente;

