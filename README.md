# 🏦 FamWallet — Family Expense Tracker

A premium, fast, and real-time family expense tracker built for couples, families, and groups. Inspired by Splitwise, with a dark-theme glassmorphism design.

## Features

- **Authentication**: Secure Email/Password and Google Sign-in.
- **Group Management**: Create Solo, Couple, Family, or Group types with custom emojis.
- **Real-time Expenses**: Track expenses instantly with active Firestore listeners.
- **Split Mechanics**: Supports `Equal`, `Percentage`, and `Exact Amount` splits.
- **Smart Settlements**: Simplifies debt mapping (who owes whom) with real-time tracking and transaction history.
- **Visual Analytics**: Interactive Category Breakdowns (Pie), Daily Spending (Bar), and 6-Month Trends (Line).
- **Export Data**: Easily download all your transactions as a CSV for backups.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4 (Custom Glassmorphism UI)
- **Database/Auth**: Firebase (Auth + Firestore + Analytics)
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Rename `.env.local.example` to `.env.local` and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

---

## 🔒 Security Best Practices

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

