import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';

// ============ CUSTOMERS ============

export const getCustomers = async () => {
  const querySnapshot = await getDocs(
    query(collection(db, 'customers'), orderBy('name'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getCustomer = async (id) => {
  const docRef = doc(db, 'customers', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const addCustomer = async (customerData) => {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...customerData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateCustomer = async (id, customerData) => {
  const docRef = doc(db, 'customers', id);
  await updateDoc(docRef, {
    ...customerData,
    updatedAt: Timestamp.now()
  });
};

export const deleteCustomer = async (id) => {
  const docRef = doc(db, 'customers', id);
  await deleteDoc(docRef);
};

// ============ PRODUCTS ============

export const getProducts = async () => {
  const querySnapshot = await getDocs(
    query(collection(db, 'products'), orderBy('name'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addProduct = async (productData) => {
  const docRef = await addDoc(collection(db, 'products'), {
    ...productData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateProduct = async (id, productData) => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, productData);
};

export const deleteProduct = async (id) => {
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);
};

// ============ DELIVERIES ============

export const getDeliveries = async () => {
  const querySnapshot = await getDocs(
    query(collection(db, 'deliveries'), orderBy('date', 'desc'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getDeliveriesByDateRange = async (startDate, endDate, customerId = null) => {
  let q;
  
  const start = Timestamp.fromDate(new Date(startDate));
  const end = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
  
  if (customerId) {
    q = query(
      collection(db, 'deliveries'),
      where('customerId', '==', customerId),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc')
    );
  } else {
    q = query(
      collection(db, 'deliveries'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc')
    );
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getTodayDeliveries = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const q = query(
    collection(db, 'deliveries'),
    where('date', '>=', Timestamp.fromDate(today)),
    where('date', '<', Timestamp.fromDate(tomorrow)),
    orderBy('date', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addDelivery = async (deliveryData) => {
  const docRef = await addDoc(collection(db, 'deliveries'), {
    ...deliveryData,
    date: Timestamp.fromDate(new Date(deliveryData.date)),
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateDelivery = async (id, deliveryData) => {
  const docRef = doc(db, 'deliveries', id);
  await updateDoc(docRef, {
    ...deliveryData,
    date: Timestamp.fromDate(new Date(deliveryData.date)),
    updatedAt: Timestamp.now()
  });
};

export const deleteDelivery = async (id) => {
  const docRef = doc(db, 'deliveries', id);
  await deleteDoc(docRef);
};

// ============ REPORTING HELPERS ============

export const calculateDeliverySummary = (deliveries) => {
  const summary = {};
  
  deliveries.forEach(delivery => {
    if (delivery.items && Array.isArray(delivery.items)) {
      delivery.items.forEach(item => {
        const key = `${item.product}_${item.unit}`;
        if (!summary[key]) {
          summary[key] = {
            product: item.product,
            unit: item.unit,
            totalQuantity: 0,
            deliveryCount: 0
          };
        }
        summary[key].totalQuantity += parseFloat(item.quantity) || 0;
        summary[key].deliveryCount += 1;
      });
    }
  });
  
  return Object.values(summary).sort((a, b) => a.product.localeCompare(b.product));
};

// ============ SEED DEFAULT PRODUCTS ============

export const seedDefaultProducts = async () => {
  const defaultProducts = [
    { name: 'White Bread', defaultUnit: 'kg' },
    { name: 'Sourdough', defaultUnit: 'kg' },
    { name: 'Whole Wheat', defaultUnit: 'kg' },
    { name: 'Baguette', defaultUnit: 'pieces' },
    { name: 'Ciabatta', defaultUnit: 'pieces' },
    { name: 'Brioche', defaultUnit: 'pieces' },
    { name: 'Pizza Dough', defaultUnit: 'kg' },
    { name: 'Focaccia', defaultUnit: 'pieces' },
    { name: 'Croissant', defaultUnit: 'pieces' },
    { name: 'Rolls', defaultUnit: 'pieces' }
  ];
  
  const existingProducts = await getProducts();
  if (existingProducts.length === 0) {
    for (const product of defaultProducts) {
      await addProduct(product);
    }
  }
};

