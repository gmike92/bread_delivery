import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  setDoc,
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

export const getCustomerByEmail = async (email) => {
  const q = query(
    collection(db, 'customers'),
    where('email', '==', email)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

export const getCustomerByUserId = async (userId) => {
  const q = query(
    collection(db, 'customers'),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
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

// ============ USERS & ROLES ============

export const getUserRole = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().role || 'autista';
  }
  return 'autista'; // Default role
};

export const setUserRole = async (userId, role, userData = {}) => {
  const docRef = doc(db, 'users', userId);
  try {
    await updateDoc(docRef, {
      role,
      ...userData,
      updatedAt: Timestamp.now()
    });
  } catch {
    // If document doesn't exist, create it
    await setDoc(docRef, {
      role,
      ...userData,
      createdAt: Timestamp.now()
    });
  }
};

export const createUserProfile = async (userId, email, role = 'cliente', name = '') => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  
  if (!docSnap.exists()) {
    const userName = name || email.split('@')[0];
    let customerId = null;
    
    // For 'cliente' users, create a linked customer record
    if (role === 'cliente') {
      // Check if customer with this email already exists
      const existingCustomer = await getCustomerByEmail(email);
      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Link the existing customer to this user
        await updateCustomer(customerId, { userId, linkedAt: Timestamp.now() });
      } else {
        // Create new customer record
        customerId = await addCustomer({
          name: userName,
          email,
          phone: '',
          address: '',
          userId // Link back to user
        });
      }
    }
    
    await setDoc(userRef, {
      email,
      role,
      name: userName,
      customerId, // Link to customer record (null for autisti)
      createdAt: Timestamp.now()
    });
  }
  return getUserRole(userId);
};

export const getUserProfile = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateUserProfile = async (userId, data) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

export const getAllUsers = async () => {
  const querySnapshot = await getDocs(
    query(collection(db, 'users'), orderBy('name'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// ============ ORDERS (Client Orders) ============

export const getOrders = async () => {
  const querySnapshot = await getDocs(
    query(collection(db, 'orders'), orderBy('deliveryDate', 'desc'))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getOrdersByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const q = query(
    collection(db, 'orders'),
    where('deliveryDate', '>=', Timestamp.fromDate(startOfDay)),
    where('deliveryDate', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('deliveryDate', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getOrdersByCustomer = async (customerId) => {
  const q = query(
    collection(db, 'orders'),
    where('customerId', '==', customerId)
  );
  
  const querySnapshot = await getDocs(q);
  const orders = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Sort by deliveryDate in JavaScript to avoid needing composite index
  return orders.sort((a, b) => {
    const dateA = a.deliveryDate?.toDate?.() || new Date(0);
    const dateB = b.deliveryDate?.toDate?.() || new Date(0);
    return dateB - dateA;
  });
};

export const addOrder = async (orderData) => {
  const docRef = await addDoc(collection(db, 'orders'), {
    ...orderData,
    deliveryDate: Timestamp.fromDate(new Date(orderData.deliveryDate)),
    status: 'pending',
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateOrderStatus = async (orderId, status) => {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    status,
    updatedAt: Timestamp.now()
  });
};

export const updateOrder = async (orderId, orderData) => {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    ...orderData,
    updatedAt: Timestamp.now()
  });
};

export const deleteOrder = async (orderId) => {
  const docRef = doc(db, 'orders', orderId);
  await deleteDoc(docRef);
};

// Check if an order can still be modified
// Deadline: 21:00 of the day before delivery
export const canModifyOrder = (deliveryDate) => {
  const now = new Date();
  
  // Parse the delivery date
  let deliveryDateObj;
  if (typeof deliveryDate === 'string') {
    deliveryDateObj = new Date(deliveryDate + 'T00:00:00');
  } else if (deliveryDate?.toDate) {
    deliveryDateObj = deliveryDate.toDate();
  } else {
    deliveryDateObj = new Date(deliveryDate);
  }
  
  // Calculate deadline: 21:00 of the day before delivery
  const deadline = new Date(deliveryDateObj);
  deadline.setDate(deadline.getDate() - 1); // Day before
  deadline.setHours(21, 0, 0, 0); // 21:00
  
  return now < deadline;
};

export const calculateOrdersSummary = (orders) => {
  const summary = {};
  
  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const key = `${item.product}_${item.unit}`;
        if (!summary[key]) {
          summary[key] = {
            product: item.product,
            unit: item.unit,
            totalQuantity: 0,
            orderCount: 0
          };
        }
        summary[key].totalQuantity += parseFloat(item.quantity) || 0;
        summary[key].orderCount += 1;
      });
    }
  });
  
  return Object.values(summary).sort((a, b) => a.product.localeCompare(b.product));
};

// Get deliveries for a specific date (to match against orders)
export const getDeliveriesByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const q = query(
    collection(db, 'deliveries'),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('date', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Calculate delivery progress for orders
export const calculateDeliveryProgress = (orders, deliveries) => {
  return orders.map(order => {
    // Find deliveries for this customer
    const customerDeliveries = deliveries.filter(d => d.customerId === order.customerId);
    
    // Calculate delivered quantities per product
    const deliveredItems = {};
    customerDeliveries.forEach(delivery => {
      if (delivery.items && Array.isArray(delivery.items)) {
        delivery.items.forEach(item => {
          const key = `${item.product}_${item.unit}`;
          if (!deliveredItems[key]) {
            deliveredItems[key] = 0;
          }
          deliveredItems[key] += parseFloat(item.quantity) || 0;
        });
      }
    });
    
    // Add progress to each order item
    const itemsWithProgress = order.items?.map(item => {
      const key = `${item.product}_${item.unit}`;
      const delivered = deliveredItems[key] || 0;
      const ordered = parseFloat(item.quantity) || 0;
      return {
        ...item,
        delivered,
        ordered,
        isComplete: delivered >= ordered,
        progress: ordered > 0 ? Math.min((delivered / ordered) * 100, 100) : 0
      };
    }) || [];
    
    // Check if entire order is complete
    const isOrderComplete = itemsWithProgress.every(item => item.isComplete);
    
    return {
      ...order,
      items: itemsWithProgress,
      isComplete: isOrderComplete,
      hasPartialDelivery: itemsWithProgress.some(item => item.delivered > 0)
    };
  });
};

// ============ SEED DEFAULT PRODUCTS ============

export const seedDefaultProducts = async (forceAdd = false) => {
  const defaultProducts = [
    { name: 'Pane Comune', defaultUnit: 'kg' },
    { name: 'Pane Speciale', defaultUnit: 'kg' },
    { name: 'Pane di Segale', defaultUnit: 'kg' },
    { name: 'Segalini', defaultUnit: 'kg' },
    { name: 'Focaccia', defaultUnit: 'kg' },
    { name: 'Pizza', defaultUnit: 'kg' }
  ];
  
  const existingProducts = await getProducts();
  
  if (forceAdd || existingProducts.length === 0) {
    // Get existing product names to avoid duplicates
    const existingNames = existingProducts.map(p => p.name.toLowerCase());
    
    for (const product of defaultProducts) {
      if (!existingNames.includes(product.name.toLowerCase())) {
        await addProduct(product);
      }
    }
  }
  
  return await getProducts();
};

// ============ PAYMENTS ============

export const getPayments = async (customerId = null) => {
  let q;
  if (customerId) {
    q = query(
      collection(db, 'payments'),
      where('customerId', '==', customerId),
      orderBy('date', 'desc')
    );
  } else {
    q = query(collection(db, 'payments'), orderBy('date', 'desc'));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addPayment = async (paymentData) => {
  const docRef = await addDoc(collection(db, 'payments'), {
    ...paymentData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const deletePayment = async (id) => {
  const docRef = doc(db, 'payments', id);
  await deleteDoc(docRef);
};

// ============ BILLING / CONTABILITÀ ============

// Get all deliveries for a customer in a date range
export const getDeliveriesForBilling = async (customerId, startDate, endDate) => {
  const start = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
  const end = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
  
  const q = query(
    collection(db, 'deliveries'),
    where('customerId', '==', customerId),
    where('date', '>=', start),
    where('date', '<=', end)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Get payments for a customer in a date range
export const getPaymentsForBilling = async (customerId, startDate, endDate) => {
  const start = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
  const end = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
  
  const q = query(
    collection(db, 'payments'),
    where('customerId', '==', customerId),
    where('date', '>=', start),
    where('date', '<=', end)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Calculate customer balance (all time)
export const calculateCustomerBalance = async (customerId) => {
  // Get all deliveries
  const deliveriesQuery = query(
    collection(db, 'deliveries'),
    where('customerId', '==', customerId)
  );
  const deliveriesSnapshot = await getDocs(deliveriesQuery);
  
  let totalDue = 0;
  deliveriesSnapshot.docs.forEach(doc => {
    const delivery = doc.data();
    if (delivery.items) {
      delivery.items.forEach(item => {
        const price = item.priceAtDelivery || item.price || 0;
        totalDue += (item.quantity || 0) * price;
      });
    }
  });
  
  // Get all payments
  const paymentsQuery = query(
    collection(db, 'payments'),
    where('customerId', '==', customerId)
  );
  const paymentsSnapshot = await getDocs(paymentsQuery);
  
  let totalPaid = 0;
  paymentsSnapshot.docs.forEach(doc => {
    const payment = doc.data();
    totalPaid += payment.amount || 0;
  });
  
  return {
    totalDue: Math.round(totalDue * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    balance: Math.round((totalDue - totalPaid) * 100) / 100
  };
};

// Generate billing statement for a period
export const generateBillingStatement = async (customerId, startDate, endDate) => {
  const customer = await getCustomer(customerId);
  const deliveries = await getDeliveriesForBilling(customerId, startDate, endDate);
  const payments = await getPaymentsForBilling(customerId, startDate, endDate);
  const products = await getProducts();
  
  // Build product price map
  const productPrices = {};
  products.forEach(p => {
    productPrices[p.name] = p.price || 0;
  });
  
  // Calculate totals from deliveries
  let periodTotal = 0;
  const deliveryDetails = deliveries.map(d => {
    const date = d.date?.toDate ? d.date.toDate() : new Date(d.date);
    let deliveryTotal = 0;
    
    const itemsWithPrices = (d.items || []).map(item => {
      const price = item.priceAtDelivery || item.price || productPrices[item.product] || 0;
      const lineTotal = (item.quantity || 0) * price;
      deliveryTotal += lineTotal;
      
      return {
        ...item,
        price,
        lineTotal: Math.round(lineTotal * 100) / 100
      };
    });
    
    periodTotal += deliveryTotal;
    
    return {
      id: d.id,
      date,
      items: itemsWithPrices,
      total: Math.round(deliveryTotal * 100) / 100
    };
  });
  
  // Calculate payments in period
  let periodPayments = 0;
  const paymentDetails = payments.map(p => {
    const date = p.date?.toDate ? p.date.toDate() : new Date(p.date);
    periodPayments += p.amount || 0;
    
    return {
      id: p.id,
      date,
      amount: p.amount,
      method: p.method,
      notes: p.notes
    };
  });
  
  // Get previous balance (before this period)
  const previousBalance = await calculatePreviousBalance(customerId, startDate);
  
  return {
    customer,
    period: { startDate, endDate },
    deliveries: deliveryDetails.sort((a, b) => a.date - b.date),
    payments: paymentDetails.sort((a, b) => a.date - b.date),
    previousBalance: Math.round(previousBalance * 100) / 100,
    periodTotal: Math.round(periodTotal * 100) / 100,
    periodPayments: Math.round(periodPayments * 100) / 100,
    currentBalance: Math.round((previousBalance + periodTotal - periodPayments) * 100) / 100
  };
};

// Helper: Calculate balance before a specific date
const calculatePreviousBalance = async (customerId, beforeDate) => {
  const endDate = new Date(beforeDate + 'T00:00:00');
  endDate.setDate(endDate.getDate() - 1);
  
  // Get deliveries before the period
  const deliveriesQuery = query(
    collection(db, 'deliveries'),
    where('customerId', '==', customerId),
    where('date', '<', Timestamp.fromDate(endDate))
  );
  const deliveriesSnapshot = await getDocs(deliveriesQuery);
  
  let totalDue = 0;
  deliveriesSnapshot.docs.forEach(doc => {
    const delivery = doc.data();
    if (delivery.items) {
      delivery.items.forEach(item => {
        const price = item.priceAtDelivery || item.price || 0;
        totalDue += (item.quantity || 0) * price;
      });
    }
  });
  
  // Get payments before the period
  const paymentsQuery = query(
    collection(db, 'payments'),
    where('customerId', '==', customerId),
    where('date', '<', Timestamp.fromDate(endDate))
  );
  const paymentsSnapshot = await getDocs(paymentsQuery);
  
  let totalPaid = 0;
  paymentsSnapshot.docs.forEach(doc => {
    const payment = doc.data();
    totalPaid += payment.amount || 0;
  });
  
  return totalDue - totalPaid;
};

// ============ RECURRING ORDERS ============

// Days of week mapping
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domenica', short: 'Dom' },
  { value: 1, label: 'Lunedì', short: 'Lun' },
  { value: 2, label: 'Martedì', short: 'Mar' },
  { value: 3, label: 'Mercoledì', short: 'Mer' },
  { value: 4, label: 'Giovedì', short: 'Gio' },
  { value: 5, label: 'Venerdì', short: 'Ven' },
  { value: 6, label: 'Sabato', short: 'Sab' }
];

// Get all recurring orders
export const getRecurringOrders = async (customerId = null) => {
  let q;
  if (customerId) {
    q = query(
      collection(db, 'recurringOrders'),
      where('customerId', '==', customerId)
    );
  } else {
    q = query(collection(db, 'recurringOrders'));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Add a new recurring order
export const addRecurringOrder = async (recurringOrderData) => {
  const docRef = await addDoc(collection(db, 'recurringOrders'), {
    ...recurringOrderData,
    isActive: true,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

// Update a recurring order
export const updateRecurringOrder = async (id, data) => {
  const docRef = doc(db, 'recurringOrders', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

// Delete a recurring order
export const deleteRecurringOrder = async (id) => {
  const docRef = doc(db, 'recurringOrders', id);
  await deleteDoc(docRef);
};

// Toggle recurring order active status
export const toggleRecurringOrder = async (id, isActive) => {
  const docRef = doc(db, 'recurringOrders', id);
  await updateDoc(docRef, {
    isActive,
    updatedAt: Timestamp.now()
  });
};

// Generate orders from recurring templates for a specific date
export const generateOrdersFromRecurring = async (targetDate) => {
  const date = new Date(targetDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Get all active recurring orders that include this day
  const recurringOrders = await getRecurringOrders();
  const activeRecurring = recurringOrders.filter(ro => 
    ro.isActive && ro.days && ro.days.includes(dayOfWeek)
  );
  
  // Check for existing orders on this date
  const existingOrders = await getOrdersByDate(targetDate);
  const existingCustomerIds = existingOrders.map(o => o.customerId);
  
  const generatedOrders = [];
  
  for (const recurring of activeRecurring) {
    // Skip if customer already has an order for this date
    if (existingCustomerIds.includes(recurring.customerId)) {
      continue;
    }
    
    // Create the order
    const orderId = await addOrder({
      customerId: recurring.customerId,
      customerName: recurring.customerName,
      items: recurring.items,
      deliveryDate: targetDate,
      notes: recurring.notes || '',
      fromRecurring: recurring.id // Mark as generated from recurring
    });
    
    generatedOrders.push({
      id: orderId,
      customerId: recurring.customerId,
      customerName: recurring.customerName
    });
  }
  
  return generatedOrders;
};

// Get recurring order summary for a week
export const getRecurringOrdersSummary = async () => {
  const recurringOrders = await getRecurringOrders();
  const activeOrders = recurringOrders.filter(ro => ro.isActive);
  
  // Group by day of week
  const byDay = {};
  DAYS_OF_WEEK.forEach(day => {
    byDay[day.value] = {
      ...day,
      orders: [],
      totalItems: 0
    };
  });
  
  activeOrders.forEach(ro => {
    if (ro.days && Array.isArray(ro.days)) {
      ro.days.forEach(day => {
        if (byDay[day]) {
          byDay[day].orders.push(ro);
          const itemCount = ro.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          byDay[day].totalItems += itemCount;
        }
      });
    }
  });
  
  return Object.values(byDay);
};

