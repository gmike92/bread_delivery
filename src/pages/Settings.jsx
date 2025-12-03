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
  RefreshCw,
  Users,
  UserPlus,
  Shield
} from 'lucide-react';
import { 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  seedDefaultProducts,
  getAllUsers,
  setUserRole
} from '../firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { createUserProfile } from '../firebase/firestore';

const Settings = () => {
  const { user, logout, isAutista, userProfile } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', defaultUnit: 'kg' });
  const [saving, setSaving] = useState(false);

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'cliente' });
  const [savingUser, setSavingUser] = useState(false);

  const UNITS = ['kg', 'pezzi', 'scatole', 'filoni', 'dozzine'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, usersData] = await Promise.all([
        getProducts(),
        isAutista ? getAllUsers() : []
      ]);
      setProducts(productsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.name) {
      alert('Compila tutti i campi');
      return;
    }

    setSavingUser(true);
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userForm.email, 
        userForm.password
      );
      
      // Create user profile in Firestore
      await createUserProfile(
        userCredential.user.uid,
        userForm.email,
        userForm.role,
        userForm.name
      );

      // Reload users
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      setShowUserForm(false);
      setUserForm({ email: '', password: '', name: '', role: 'cliente' });
      alert('Utente creato con successo!');
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Email già in uso');
      } else if (error.code === 'auth/weak-password') {
        alert('Password troppo debole (minimo 6 caratteri)');
      } else {
        alert('Errore nella creazione utente');
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await setUserRole(userId, newRole);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error changing role:', error);
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

      {/* User Management - Only for Autista */}
      {isAutista && (
        <div className="mt-8 animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-bread-700 flex items-center gap-2">
              <Users size={20} />
              Gestione Utenti
            </h2>
            <button
              onClick={() => setShowUserForm(true)}
              className="btn-icon bg-bread-600 text-white !min-w-[2.5rem] !min-h-[2.5rem]"
            >
              <UserPlus size={20} />
            </button>
          </div>

          {/* Add User Form */}
          {showUserForm && (
            <div className="card mb-4 border-2 border-bread-400 animate-fade-in">
              <h3 className="font-semibold text-bread-800 mb-4">
                Nuovo Utente
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="label">Nome</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Nome completo"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="email@esempio.com"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Minimo 6 caratteri"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="label">Ruolo</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="select-field"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="autista">Autista/Admin</option>
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCreateUser}
                    className="btn-primary flex-1"
                    disabled={savingUser}
                  >
                    {savingUser ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <UserPlus size={20} />
                    )}
                    Crea Utente
                  </button>
                  <button
                    onClick={() => {
                      setShowUserForm(false);
                      setUserForm({ email: '', password: '', name: '', role: 'cliente' });
                    }}
                    className="btn-secondary flex-1"
                  >
                    <X size={20} />
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          {users.length === 0 ? (
            <div className="card text-center py-6">
              <Users size={32} className="mx-auto text-bread-300 mb-2" />
              <p className="text-bread-500 text-sm">Nessun utente registrato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="card !p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <span className="font-medium text-bread-800">{u.name || u.email}</span>
                    <p className="text-xs text-bread-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${
                      u.role === 'autista' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Shield size={12} className="inline mr-1" />
                      {u.role === 'autista' ? 'Autista' : 'Cliente'}
                    </span>
                    <select
                      value={u.role || 'cliente'}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="text-xs border border-bread-200 rounded px-2 py-1"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="autista">Autista</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* App Info */}
      <div className="mt-8 text-center text-bread-400 text-sm animate-slide-up stagger-4">
        <p>Gestione Consegne Pane v1.2.0</p>
        <p className="mt-1">Fatto con 🍞 per i panifici</p>
      </div>
    </div>
  );
};

export default Settings;

