# 🍞 Bread Delivery Manager

A mobile-first Progressive Web App (PWA) for managing bakery deliveries. Built with React, Vite, Tailwind CSS, and Firebase.

## Features

- **📱 Mobile-First Design** - Big thumb-friendly buttons and large touch targets
- **🔐 Authentication** - Secure email/password login via Firebase Auth
- **👥 Customer Management** - Add, edit, and delete customers with contact info
- **🚚 Delivery Logging** - Log deliveries with multiple products per delivery
- **📊 Monthly Reports** - Generate delivery summaries by customer and date range
- **📲 PWA Support** - Install on Android devices for offline-capable use

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS (Mobile-first)
- **Backend/DB**: Firebase (Firestore + Auth)
- **Router**: React Router DOM v6
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase project with Firestore and Authentication enabled

### Installation

1. **Clone and install dependencies:**

```bash
cd bread-delivery-app
npm install
```

2. **Configure Firebase:**

Create a `.env` file in the project root with your Firebase credentials:

```bash
touch .env
```

Then edit `.env` with your Firebase project settings:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. **Set up Firebase:**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing
   - Enable **Authentication** with Email/Password sign-in method
   - Enable **Firestore Database** in production mode
   - Create a user account in Authentication for login

4. **Firestore Security Rules:**

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Start the development server:**

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready for deployment.

## Data Structure

### Firestore Collections

**`customers`**
```json
{
  "name": "Restaurant ABC",
  "phone": "+1234567890",
  "address": "123 Main Street",
  "createdAt": "timestamp"
}
```

**`products`**
```json
{
  "name": "Sourdough",
  "defaultUnit": "kg",
  "createdAt": "timestamp"
}
```

**`deliveries`**
```json
{
  "customerId": "customer_doc_id",
  "customerName": "Restaurant ABC",
  "date": "timestamp",
  "items": [
    { "product": "Sourdough", "quantity": 5, "unit": "kg" },
    { "product": "Baguette", "quantity": 20, "unit": "pieces" }
  ],
  "createdAt": "timestamp"
}
```

## PWA Installation

### On Android:

1. Open the app in Chrome
2. Tap the menu (⋮) → "Add to Home Screen"
3. The app will be installed like a native app

### On iOS:

1. Open the app in Safari
2. Tap the Share button → "Add to Home Screen"

## Customization

### Colors

Edit `tailwind.config.js` to customize the color palette:

```javascript
colors: {
  bread: {
    50: '#FFF8DC',
    // ... customize your colors
  }
}
```

### Default Products

Modify the `seedDefaultProducts()` function in `src/firebase/firestore.js` to change the default product list.

## Project Structure

```
bread-delivery-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── firebase/
│   │   ├── config.js
│   │   └── firestore.js
│   ├── pages/
│   │   ├── Customers.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── NewDelivery.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## License

MIT

