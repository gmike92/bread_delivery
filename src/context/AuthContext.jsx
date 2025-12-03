import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile, createUserProfile, getCustomerByUserId, getCustomerByEmail, addCustomer, updateCustomer } from '../firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [linkedCustomer, setLinkedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ensure customer record exists for cliente users
  const ensureCustomerRecord = async (firebaseUser, profile) => {
    if (profile?.role !== 'cliente') return null;
    
    try {
      // Try to find customer by userId first
      let customer = await getCustomerByUserId(firebaseUser.uid);
      
      if (!customer) {
        // Try by email
        customer = await getCustomerByEmail(firebaseUser.email);
        
        if (customer) {
          // Link existing customer to this user
          await updateCustomer(customer.id, { userId: firebaseUser.uid });
        } else {
          // Create new customer record
          const customerName = profile?.name || firebaseUser.email.split('@')[0];
          const customerId = await addCustomer({
            name: customerName,
            email: firebaseUser.email,
            phone: '',
            address: '',
            userId: firebaseUser.uid
          });
          customer = { id: customerId, name: customerName, email: firebaseUser.email };
        }
      }
      
      return customer;
    } catch (error) {
      console.error('Error ensuring customer record:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Get or create user profile
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          // Create default profile as 'autista' for existing users
          await createUserProfile(firebaseUser.uid, firebaseUser.email, 'autista');
          profile = await getUserProfile(firebaseUser.uid);
        }
        setUserProfile(profile);
        
        // Ensure customer record exists for cliente users
        const customer = await ensureCustomerRecord(firebaseUser, profile);
        setLinkedCustomer(customer);
      } else {
        setUser(null);
        setUserProfile(null);
        setLinkedCustomer(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Get user profile
      let profile = await getUserProfile(result.user.uid);
      if (!profile) {
        await createUserProfile(result.user.uid, email, 'autista');
        profile = await getUserProfile(result.user.uid);
      }
      setUserProfile(profile);
      
      // Ensure customer record exists for cliente users
      const customer = await ensureCustomerRecord(result.user, profile);
      setLinkedCustomer(customer);
      
      return { success: true, user: result.user, role: profile?.role || 'autista' };
    } catch (error) {
      let message = 'Accesso fallito. Riprova.';
      if (error.code === 'auth/invalid-email') {
        message = 'Indirizzo email non valido.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'Nessun account trovato con questa email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Password errata.';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Email o password non validi.';
      }
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const isCliente = userProfile?.role === 'cliente';
  const isAutista = userProfile?.role === 'autista';

  const value = {
    user,
    userProfile,
    linkedCustomer,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isCliente,
    isAutista,
    role: userProfile?.role || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

