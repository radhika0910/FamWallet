'use client';

// ============================================
// Group Detail Page
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, subscribeToExpenses, subscribeToSettlements } from '@/lib/firestore';
import { formatCurrency, getCategoryInfo } from '@/lib/utils';
import type { Group, Expense, Settlement } from '@/types';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';
import type { ExpenseCategory } from '@/types';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    getGroup(groupId).then((g) => {
      setGroup(g);
      setLoading(false);
    });
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const unsub1 = subscribeToExpenses(groupId, setExpenses);
    const unsub2 = subscribeToSettlements(groupId, setSettlements);
    return () => { unsub1(); unsub2(); };
  }, [groupId]);

  // Calculate balances
  const balances = useMemo(() => {
    if (!group) return {};
    const bal: Record<string, number> = {};
    group.members.forEach((uid) => { bal[uid] = 0; });

    expenses.forEach((exp) => {
      // Person who paid gets credit
      bal[exp.paidBy] = (bal[exp.paidBy] || 0) + exp.amount;
      // Everyone who owes gets debited
      Object.entries(exp.splits || {}).forEach(([uid, amount]) => {
        bal[uid] = (bal[uid] || 0) - amount;
      });
    });

    // Account for settlements
    settlements.forEach((s) => {
      bal[s.from] = (bal[s.from] || 0) + s.amount;
      bal[s.to] = (bal[s.to] || 0) - s.amount;
    });

    return bal;
  }, [group, expenses, settlements]);

  // Pie data
  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return Object.entries(byCategory)
      .map(([key, value]) => {
        const info = getCategoryInfo(key as ExpenseCategory);
        return { name: info.label, value, color: info.color, emoji: info.emoji };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
        <div className="grid-stats">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">Group not found</div>
        <div className="empty-state-text">This group may have been deleted.</div>
        <Link href="/dashboard/groups" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard/groups" className="btn btn-icon btn-ghost">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">
              {group.emoji} {group.name}
            </h1>
            <p className="page-subtitle">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''} · {group.type}
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{expenses.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg per person</div>
          <div className="stat-value">
            {formatCurrency(group.members.length > 0 ? totalSpent / group.members.length : 0)}
          </div>
        </div>
      </div>

      <div className="grid-charts">
        {/* Balances */}
        <div className="chart-container">
          <div className="chart-title">Balances</div>
          <div className="chart-subtitle">Who owes whom</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group.members.map((uid) => {
              const name = group.memberNames?.[uid] || 'Unknown';
              const bal = balances[uid] || 0;
              const isYou = uid === user?.uid;

              return (
                <div
                  key={uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className="avatar"
                      style={{
                        background: isYou ? 'var(--gradient-primary)' : 'var(--gradient-accent)',
                        color: 'white',
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {name} {isYou ? '(You)' : ''}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: bal >= 0 ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {bal >= 0 ? '+' : ''}{formatCurrency(bal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="chart-container">
          <div className="chart-title">Category Breakdown</div>
          <div className="chart-subtitle">Where this group spends</div>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: '#14151a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pieData.slice(0, 5).map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>{item.emoji} {item.name}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">No expenses yet</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="chart-container">
        <div className="chart-title">All Expenses</div>
        <div className="chart-subtitle" style={{ marginBottom: 16 }}>
          {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
        </div>
        {expenses.length > 0 ? (
          <div>
            {expenses.map((expense) => {
              const cat = getCategoryInfo(expense.category);
              const d = expense.date instanceof Date ? expense.date : new Date(expense.date);
              const paidByName = group.memberNames?.[expense.paidBy] || 'Someone';

              return (
                <div key={expense.id} className="expense-item">
                  <div className="expense-icon" style={{ background: `${cat.color}18` }}>
                    {cat.emoji}
                  </div>
                  <div className="expense-details">
                    <div className="expense-desc">{expense.description}</div>
                    <div className="expense-meta">
                      {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' · Paid by '}
                      {expense.paidBy === user?.uid ? 'You' : paidByName}
                    </div>
                  </div>
                  <div className="expense-amount">{formatCurrency(expense.amount)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-state-icon">💸</div>
            <div className="empty-state-title">No expenses yet</div>
            <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
              <Plus size={16} /> Add First Expense
            </button>
          </div>
        )}
      </div>

      {showAddExpense && (
        <AddExpenseModal
          groups={[group]}
          userId={user?.uid || ''}
          userName={user?.displayName || 'You'}
          onClose={() => setShowAddExpense(false)}
        />
      )}
    </div>
  );
}
