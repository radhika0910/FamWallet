// ============================================
// FamWallet — Type Definitions
// ============================================

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  type: 'solo' | 'couple' | 'family' | 'group';
  members: string[]; // array of UIDs
  memberEmails: Record<string, string>; // uid -> email
  memberNames: Record<string, string>; // uid -> displayName
  createdBy: string;
  createdAt: Date;
  currency: string;
  emoji: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string; // UID
  splits: Record<string, number>; // uid -> amount they owe
  splitType: 'equal' | 'percentage' | 'exact';
  date: Date;
  createdAt: Date;
  createdBy: string;
  notes?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  from: string; // UID
  to: string; // UID
  amount: number;
  date: Date;
  createdAt: Date;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  groupId: string | null; // null = personal goal
  deadline: Date | null;
  createdBy: string; // UID
  createdAt: Date;
}

export interface Budget {
  id: string;
  groupId: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  month: string; // "YYYY-MM"
  createdBy: string;
  createdAt: Date;
}

export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'utilities'
  | 'rent'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'education'
  | 'travel'
  | 'subscriptions'
  | 'gifts'
  | 'pets'
  | 'kids'
  | 'other';

export interface CategoryInfo {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'food', label: 'Food & Dining', emoji: '🍕', color: '#FF6B6B' },
  { key: 'groceries', label: 'Groceries', emoji: '🛒', color: '#4ECDC4' },
  { key: 'transport', label: 'Transport', emoji: '🚗', color: '#45B7D1' },
  { key: 'utilities', label: 'Utilities', emoji: '💡', color: '#96CEB4' },
  { key: 'rent', label: 'Rent & Housing', emoji: '🏠', color: '#FFEAA7' },
  { key: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#DDA0DD' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#F8B500' },
  { key: 'health', label: 'Health', emoji: '💊', color: '#FF8A80' },
  { key: 'education', label: 'Education', emoji: '📚', color: '#82B1FF' },
  { key: 'travel', label: 'Travel', emoji: '✈️', color: '#B388FF' },
  { key: 'subscriptions', label: 'Subscriptions', emoji: '📱', color: '#EA80FC' },
  { key: 'gifts', label: 'Gifts', emoji: '🎁', color: '#FF80AB' },
  { key: 'pets', label: 'Pets', emoji: '🐾', color: '#A1887F' },
  { key: 'kids', label: 'Kids', emoji: '👶', color: '#80CBC4' },
  { key: 'other', label: 'Other', emoji: '📦', color: '#90A4AE' },
];

export interface BalanceEntry {
  userId: string;
  userName: string;
  balance: number; // positive = owed to them, negative = they owe
}

export interface MonthlyData {
  month: string;
  total: number;
  byCategory: Record<ExpenseCategory, number>;
}
