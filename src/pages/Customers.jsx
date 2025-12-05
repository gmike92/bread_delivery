import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2, 
  X, 
  Save,
  Loader2,
  ChevronLeft,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../firebase/firestore';

const Customers = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddForm = () => {
    setFormData({ name: '', phone: '', address: '' });
    setEditingCustomer(null);
    setShowForm(true);
  };

  const openEditForm = (customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await addCustomer(formData);
      }
      await loadCustomers();
      closeForm();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Delete ${customer.name}?`)) {
      try {
        await deleteCustomer(customer.id);
        await loadCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-bread-600 font-medium">Caricamento clienti...</p>
        </div>
      </div>
    );
  }

  // Form View
  if (showForm) {
    return (
      <div className="page-container animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={closeForm} className="btn-icon">
            <ChevronLeft size={24} />
          </button>
          <h1 className="page-title mb-0">
            {editingCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">
              <User className="inline mr-2" size={18} />
              Nome Cliente *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Inserisci nome cliente"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">
              <Phone className="inline mr-2" size={18} />
              Numero di Telefono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Inserisci numero di telefono"
              className="input-field"
            />
          </div>

          <div>
            <label className="label">
              <MapPin className="inline mr-2" size={18} />
              Indirizzo
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Inserisci indirizzo di consegna"
              className="input-field min-h-[120px] resize-none"
              rows={3}
            />
          </div>

          <div className="pt-4 space-y-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save size={24} />
                  {editingCustomer ? 'Aggiorna Cliente' : 'Aggiungi Cliente'}
                </>
              )}
            </button>
            <button type="button" onClick={closeForm} className="btn-secondary">
              <X size={24} />
              Annulla
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List View
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <h1 className="page-title mb-0">Clienti</h1>
        <button onClick={openAddForm} className="btn-icon bg-bread-600 text-white">
          <Plus size={24} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 animate-slide-up stagger-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-bread-400" size={22} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca clienti..."
          className="input-field pl-12"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="card text-center py-10 animate-slide-up stagger-2">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-display font-semibold text-bread-700 mb-2">
            {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente'}
          </h3>
          <p className="text-bread-500 mb-6">
            {searchQuery ? 'Prova con un altro termine' : 'Aggiungi il tuo primo cliente per iniziare'}
          </p>
          {!searchQuery && (
            <button onClick={openAddForm} className="btn-primary max-w-xs mx-auto">
              <Plus size={24} />
              Aggiungi Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className="list-item animate-slide-up"
              style={{ animationDelay: `${0.05 * (index + 2)}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-bread-800 text-lg">
                    {customer.name}
                  </h3>
                  {customer.phone && (
                    <p className="text-bread-600 flex items-center gap-2 mt-1">
                      <Phone size={16} />
                      {customer.phone}
                    </p>
                  )}
                  {customer.address && (
                    <p className="text-bread-500 flex items-start gap-2 mt-1 text-sm">
                      <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                      {customer.address}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-3">
                  {isAdmin && (
                    <button
                      onClick={() => navigate(`/storico/${customer.id}`)}
                      className="btn-icon !min-w-[2.75rem] !min-h-[2.75rem] !bg-blue-50 !text-blue-600"
                      title="Storico Cliente"
                    >
                      <History size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => openEditForm(customer)}
                    className="btn-icon !min-w-[2.75rem] !min-h-[2.75rem]"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    className="btn-icon !min-w-[2.75rem] !min-h-[2.75rem] !bg-red-50 !text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button Fixed */}
      {filteredCustomers.length > 0 && (
        <button
          onClick={openAddForm}
          className="fixed bottom-24 right-4 w-16 h-16 bg-bread-600 text-white rounded-full shadow-bread-lg flex items-center justify-center active:scale-95 transition-transform z-40"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};

export default Customers;

