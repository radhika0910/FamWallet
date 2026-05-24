# 🏦 FamWallet — Family Expense Tracker

A **premium, fast, and real-time** family expense tracker built for couples, families, and friend groups. Inspired by Splitwise with a modern dark-theme glassmorphism design, built with Next.js 16, React 19, and Firebase.

**Live Demo**: https://famwallet-96f86.web.app/

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Core Features Explained](#core-features-explained)
- [Project Architecture](#project-architecture)
- [Key Components](#key-components)
- [Database Schema](#database-schema)
- [Security & Best Practices](#security--best-practices)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)

---

## ✨ Features

### 🔐 Authentication
- **Email/Password Sign-up & Sign-in** with secure password validation
- **Google OAuth** for quick sign-up
- **Apple Sign-in** support
- **Phone-based Authentication** with OTP (via Firebase Recaptcha)
- **Password Reset** functionality
- Persistent login state across browser sessions

### 👥 Group Management
- **Solo** - Personal expense tracking
- **Couple** - Split with one partner
- **Family** - Share expenses with multiple family members
- **Group** - Friends or roommates sharing costs
- Custom group names and emojis
- Real-time member management with email invitations
- Pending invite system for not-yet-registered users

### 💸 Expense Tracking
- **Quick Add** - Add expenses with description, amount, category, date, and optional notes
- **Smart Splits** - Three split types:
  - **Equal**: Automatically splits evenly among members
  - **Exact**: Manually set exact amounts each person owes
  - **Percentage**: Distribute by percentages that must sum to 100%
- **15 Categories**: Food, Groceries, Transport, Utilities, Rent, Entertainment, Shopping, Health, Education, Travel, Subscriptions, Gifts, Pets, Kids, Other
- **Real-time Sync** - Changes reflect instantly across all devices
- **Edit & Delete** - Modify or remove expenses anytime

### 🔄 Settlements & Balances
- **Automatic Balance Calculation** - Tracks who owes whom after all expenses
- **Smart Settlement System** - Shows the minimum number of transactions needed to settle all debts
- **Transaction History** - View all settlements with dates and amounts
- **One-Click Settlement** - Record a payment between members
- **Real-time Updates** - Balances update instantly when expenses or settlements change

### 📊 Visual Analytics & Reports
- **Category Breakdown (Pie Chart)** - All-time spending by category
- **Member Contributions (Bar Chart)** - Track who paid how much
- **Monthly Spending Trend (Line Chart)** - Last 3 months spending pattern
- **Dashboard Widgets**:
  - Total group spending
  - This month's spending
  - Transaction count
  - Budget alerts
- **Group-Level Analytics** - Separate dashboard for each group

### 💰 Budget Management
- **Monthly Budgets** - Set spending limits by category for each month
- **Budget Tracking** - See current vs. limit spending in real-time
- **Visual Indicators**:
  - 🟢 Under 80% - Green (Safe)
  - 🟡 80-100% - Yellow (Warning)
  - 🔴 Over 100% - Red (Over limit)
- **Unbudgeted Spending** - View categories with spend but no limit
- **Quick Budget Setup** - Set budget from unbudgeted categories

### 📈 Dashboard Features
- **Personal Dashboard** - Overview of all your groups and spending
- **Group Dashboard** - Detailed view with balances, trends, and transactions
- **Tabbed Interface** - Switch between Overview, Expenses, and Budgets tabs
- **Top Spender Badge** - Quickly see who's spending the most
- **Status Cards** - Key metrics at a glance

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | Next.js 16 (with Turbopack) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 + Custom CSS |
| **Backend/Database** | Firebase (Auth + Firestore + Analytics) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **3D Graphics** | Three.js (with React Three Fiber) |
| **Language** | TypeScript (Strict mode) |
| **Package Manager** | npm |
| **Deployment** | Firebase Hosting |

---

## 📁 Project Structure

```
my-app/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with AuthProvider
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/
│   │   │   └── page.tsx              # Login page (email/password/phone)
│   │   ├── signup/
│   │   │   └── page.tsx              # Sign up page
│   │   ├── forgot-password/
│   │   │   └── page.tsx              # Password reset page
│   │   └── dashboard/
│   │       ├── layout.tsx            # Dashboard sidebar layout
│   │       ├── page.tsx              # Dashboard home (analytics)
│   │       ├── expenses/
│   │       │   └── page.tsx          # View all expenses
│   │       ├── groups/
│   │       │   ├── page.tsx          # Create & manage groups
│   │       │   └── [id]/
│   │       │       └── page.tsx      # Group detail page
│   │       ├── settlements/
│   │       │   └── page.tsx          # Settlement & balance tracking
│   │       ├── goals/
│   │       │   └── page.tsx          # Savings goals (future)
│   │       └── settings/
│   │           └── page.tsx          # User settings
│   │
│   ├── components/                   # Reusable React components
│   │   ├── ThreeBackground.tsx       # 3D animated background
│   │   └── expenses/
│   │       └── AddExpenseModal.tsx   # Add expense modal
│   │
│   ├── contexts/                     # React Context providers
│   │   └── AuthContext.tsx           # Global auth state
│   │
│   ├── lib/                          # Utility functions & services
│   │   ├── firebase.ts               # Firebase initialization
│   │   ├── auth.ts                   # Authentication helpers
│   │   ├── firestore.ts              # Firestore CRUD operations
│   │   └── utils.ts                  # Utility functions (format, calculate)
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── index.ts                  # Main type definitions
│   │   └── window.d.ts               # Window interface extensions
│   │
│   └── styles/
│       └── globals.css               # Global styles + variables
│
├── public/                           # Static assets
├── .env.local                        # Firebase credentials (gitignored)
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies & scripts
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Firebase project (create at [firebase.google.com](https://firebase.google.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/expense-tracker.git
   cd expense-tracker/my-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see next section)

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory with your Firebase credentials:

```env
# Firebase Web Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourproject
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Note**: These are public keys (prefixed with `NEXT_PUBLIC_`), so it's safe to expose them in client-side code. Secure authentication is handled by Firebase rules.

### Getting Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Go to Project Settings → General
4. Scroll to "Your apps" section
5. Click the web icon (</>) to create a web app
6. Copy the firebaseConfig object

---

## 💡 Core Features Explained

### Real-time Sync with Firestore
The app uses Firestore listeners (`onSnapshot`) to subscribe to data changes:
- **Groups**: Get updated when members join/leave
- **Expenses**: See new expenses immediately as they're added
- **Settlements**: Track payments in real-time

Example from `firestore.ts`:
```typescript
export function subscribeToExpenses(groupId: string, callback) {
  return onSnapshot(
    query(collection(db, 'groups', groupId, 'expenses'), orderBy('date', 'desc')),
    (snap) => {
      const expenses = snap.docs.map(d => convertExpenseData(d));
      callback(expenses);
    }
  );
}
```

### Smart Split Calculation
The app supports three split methods:

1. **Equal Split**
   ```
   Total: ₹1000 | Members: 4
   Each owes: ₹250
   ```

2. **Percentage Split**
   ```
   Total: ₹1000 | Distribution: 50%, 30%, 20%
   Person A owes: ₹500, Person B: ₹300, Person C: ₹200
   ```

3. **Exact Split**
   ```
   Total: ₹1000 | Custom amounts: 300, 400, 300
   Must sum to exactly ₹1000
   ```

### Balance Settlement Algorithm
Calculates the minimum transactions needed to settle all debts:

```typescript
// Example: 3 people, A paid ₹300, B paid ₹200, C paid ₹100
// Total: ₹600 (each should pay ₹200)

// Balances after expenses:
// A: +₹100 (overpaid by ₹100)
// B: 0 (paid exact share)
// C: -₹100 (underpaid by ₹100)

// Settlement: C pays A ₹100
```

---

## 🏗 Project Architecture

### Authentication Flow
```
User → Firebase Auth (Email/Phone/Google) → JWT Token → Firestore Rules Check
```

### Data Flow
```
React Component → Context (useAuth) → Firestore Service → Firebase
                                   ↓
                         Real-time Listener
                                   ↓
                            State Update → Re-render
```

### Firestore Security Rules
```typescript
// Only authenticated users can read their own data
match /users/{userId} {
  allow read: if request.auth.uid == userId;
}

// Users can only access groups they're members of
match /groups/{groupId} {
  allow read: if request.auth.uid in resource.data.members;
}
```

---

## 🎨 Key Components

### AuthContext
Global authentication state provider:
```typescript
interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
}
```
- Used in every authenticated page
- Persists across page reloads
- Triggers redirect to login if not authenticated

### AddExpenseModal
Reusable expense creation form:
- Dynamic group selector
- Split type selection
- Custom member splits input
- Date picker
- Category selector
- Real-time validation

### Dashboard Charts
Interactive Recharts components:
- **Pie Chart**: Category breakdown (all-time)
- **Bar Chart**: Member contributions
- **Line Chart**: 6-month spending trend

---

## 🗄 Database Schema

### Collections & Documents

#### `users/{userId}`
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
}
```

#### `groups/{groupId}`
```typescript
{
  id: string;
  name: string;
  type: 'solo' | 'couple' | 'family' | 'group';
  emoji: string;
  members: string[]; // UIDs
  memberEmails: Record<string, string>;
  memberNames: Record<string, string>;
  createdBy: string;
  createdAt: Timestamp;
  currency: string;
}
```

#### `groups/{groupId}/expenses/{expenseId}`
```typescript
{
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string; // UID
  splits: Record<string, number>; // uid -> amount owed
  splitType: 'equal' | 'percentage' | 'exact';
  date: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  notes?: string;
}
```

#### `groups/{groupId}/settlements/{settlementId}`
```typescript
{
  id: string;
  groupId: string;
  from: string; // UID (who paid)
  to: string; // UID (who received)
  amount: number;
  date: Timestamp;
  createdAt: Timestamp;
  note?: string;
}
```

#### `groups/{groupId}/budgets/{budgetId}`
```typescript
{
  id: string;
  groupId: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  month: string; // "YYYY-MM"
  createdBy: string;
  createdAt: Timestamp;
}
```

---

## 🔒 Security & Best Practices

### 1. **TypeScript Strict Mode**
- All files use strict TypeScript for type safety
- Custom type definitions for Firebase objects
- Window interface extensions for global state

### 2. **Firebase Security Rules**
```typescript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated user access
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId && 
                      request.resource.data.keys().hasAll(['email', 'displayName']);
    }
    
    // Group member access
    match /groups/{groupId} {
      allow read: if request.auth.uid in resource.data.members;
      allow create: if request.auth.uid == request.resource.data.createdBy;
      allow update: if request.auth.uid in resource.data.members;
      
      // Expenses subcollection
      match /expenses/{expenseId} {
        allow read: if request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
        allow create: if request.auth.uid == request.resource.data.createdBy;
      }
    }
  }
}
```

### 3. **Authentication Security**
- Passwords validated (min 6 chars)
- Phone auth with Recaptcha verification
- OAuth via Firebase providers
- No sensitive data stored in localStorage

### 4. **Data Validation**
- Input sanitization before Firestore writes
- Type checking at compile time
- Runtime validation in forms

---

## 🌐 Deployment

### Deploy to Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Authenticate**
   ```bash
   firebase login
   ```

3. **Initialize Firebase in project**
   ```bash
   firebase init hosting
   ```
   - Select your project
   - Set public directory to `.next`
   - Configure as single-page app: **No**

4. **Build and deploy**
   ```bash
   npm run build
   firebase deploy
   ```

Your app will be live at: `https://yourproject.web.app`

---

## 🔮 Future Enhancements

- [ ] **Mobile App** - React Native version
- [ ] **Offline Support** - Service workers + local persistence
- [ ] **Savings Goals** - Track joint savings targets
- [ ] **CSV Export** - Download transaction history
- [ ] **Receipt Scanning** - OCR for automatic expense detection
- [ ] **AI Categorization** - Auto-categorize expenses
- [ ] **Push Notifications** - Alert for settlements & new expenses
- [ ] **Advanced Analytics** - More detailed charts and insights
- [ ] **Bill Splitting** - Quick split for restaurant bills
- [ ] **Recurring Expenses** - Set up monthly bills

---

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your own use.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support & Troubleshooting

### Issue: "Property 'recaptchaVerifier' does not exist"
**Solution**: The `window.d.ts` file declares the type. Ensure it's in `src/types/`.

### Issue: "Firebase credentials not found"
**Solution**: Check that `.env.local` exists and has all required keys. Restart dev server after adding it.

### Issue: "Expenses not syncing in real-time"
**Solution**: Verify Firestore security rules allow the user's UID in group members array.

### Issue: TypeScript build errors for Recharts
**Solution**: These are fixed by removing explicit type annotations from formatter functions and using runtime type checks.

---

## 📞 Contact & Links

- **GitHub**: [Your GitHub Profile]
- **Portfolio**: [Your Website]
- **Email**: [Your Email]

---

**Made with ❤️ by Bhoya**

Last updated: May 25, 2026

When deploying this app, you must secure your Firebase infrastructure. Leaving your Firestore database completely open is a severe security threat. 

### 1. Firestore Security Rules
Currently, if your Firestore rules are in "Test Mode" (`allow read, write: if true;`), **anyone can delete or steal your data**. 
Go to the **Firestore Database -> Rules** tab in the Firebase Console and update them to secure your data based on authentication and group membership:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Group Rules: Only members can read or modify a group
    match /groups/{groupId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && request.auth.uid in resource.data.members;
      
      // Sub-collections (expenses, settlements)
      match /expenses/{expenseId} {
        // Can only read/write expenses if you are part of the parent group
        allow read, write: if request.auth != null && 
                           request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
      }
      match /settlements/{settlementId} {
        allow read, write: if request.auth != null && 
                           request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
      }
    }
  }
}
```

### 2. API Key Restrictions
While Firebase API keys are technically safe to be exposed in the frontend (since they just identify your project to Google), malicious users could still take your API key and spam your backend with fake requests.
- **Action Required**: Go to the **Google Cloud Console**, find your `Browser key (auto created by Firebase)`, and **Restrict the API Key** to only allow requests from your production domain (e.g., `famwallet.vercel.app` and `localhost`).

### 3. Data Retention Policy
To prevent your database from ballooning indefinitely (and costing you money):
- Set up a **TTL (Time-to-Live) Policy** in Google Cloud for the `expenses` collection, deleting documents where `createdAt` is older than 365 days.

