'use client';

// ============================================
// Group Detail Page — Overview | Expenses | Budgets
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getGroup,
  subscribeToExpenses,
  subscribeToSettlements,
  subscribeBudgets,
  setBudget,
  deleteBudget,
} from '@/lib/firestore';
import { formatCurrency, getCategoryInfo, getMonthKey } from '@/lib/utils';
import type { Group, Expense, Settlement, Budget, ExpenseCategory } from '@/types';
import { CATEGORIES } from '@/types';
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  Check,
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

// ─── Spend vs Budget horizontal bar ───────────────────────────────────────
function BudgetBar({
  spent,
  limit,
  color,
}: {
  spent: number;
  limit: number;
  color: string;
}) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = spent > limit;
  const warn = !over && pct >= 80;
  const barColor = over ? '#ff6b6b' : warn ? '#fdcb6e' : color;

  return (
    <div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ color: over ? '#ff6b6b' : warn ? '#fdcb6e' : 'var(--muted)' }}>
          {over ? '⚠️ ' : ''}
          {formatCurrency(spent)} spent
        </span>
        <span>{formatCurrency(limit)} limit</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function GroupDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'budgets'>('overview');

  // Budget modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<ExpenseCategory>('food');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState('');

  // Current month key
  const currentMonth = useMemo(() => getMonthKey(new Date()), []);

  useEffect(() => {
    if (!groupId) return;
    getGroup(groupId).then((g) => { setGroup(g); setLoading(false); });
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const u1 = subscribeToExpenses(groupId, setExpenses);
    const u2 = subscribeToSettlements(groupId, setSettlements);
    const u3 = subscribeBudgets(groupId, setBudgets);
    return () => { u1(); u2(); u3(); };
  }, [groupId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Balances per member
  const balances = useMemo(() => {
    if (!group) return {} as Record<string, number>;
    const bal: Record<string, number> = {};
    group.members.forEach((uid) => { bal[uid] = 0; });
    expenses.forEach((exp) => {
      bal[exp.paidBy] = (bal[exp.paidBy] || 0) + exp.amount;
      Object.entries(exp.splits || {}).forEach(([uid, amt]) => {
        bal[uid] = (bal[uid] || 0) - amt;
      });
    });
    settlements.forEach((s) => {
      bal[s.from] = (bal[s.from] || 0) + s.amount;
      bal[s.to] = (bal[s.to] || 0) - s.amount;
    });
    return bal;
  }, [group, expenses, settlements]);

  // Pie / category data (all-time)
  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return Object.entries(byCategory)
      .map(([key, value]) => {
        const info = getCategoryInfo(key as ExpenseCategory);
        return { name: info.label, value, color: info.color, emoji: info.emoji, key };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Current month spending per category
  const monthSpend = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      if (getMonthKey(d) === currentMonth) {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    });
    return map;
  }, [expenses, currentMonth]);

  // Current month budgets map
  const budgetMap = useMemo(() => {
    const map: Record<string, Budget> = {};
    budgets.forEach((b) => {
      if (b.month === currentMonth) {
        map[b.category] = b;
      }
    });
    return map;
  }, [budgets, currentMonth]);

  // Member contribution data
  const memberContribData = useMemo(() => {
    if (!group) return [];
    return group.members.map((uid) => {
      const name = group.memberNames?.[uid] || 'Unknown';
      const paid = expenses.filter((e) => e.paidBy === uid).reduce((s, e) => s + e.amount, 0);
      return { name: name.split(' ')[0], paid, uid };
    }).sort((a, b) => b.paid - a.paid);
  }, [group, expenses]);

  // Last 3 months trend for this group
  const trendData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[getMonthKey(d)] = 0;
    }
    expenses.forEach((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      const k = getMonthKey(d);
      if (months[k] !== undefined) months[k] += e.amount;
    });
    return Object.entries(months).map(([key, total]) => {
      const [, m] = key.split('-').map(Number);
      const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { month: names[m], total };
    });
  }, [expenses]);

  // Top spender
  const topSpender = useMemo(() => {
    if (!memberContribData.length || !group) return null;
    const top = memberContribData[0];
    if (!top.paid) return null;
    return { ...top, name: group.memberNames?.[top.uid] || 'Unknown' };
  }, [memberContribData, group]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  // Over-budget categories count
  const overBudgetCount = useMemo(() => {
    return Object.entries(budgetMap).filter(
      ([cat, b]) => (monthSpend[cat] || 0) > b.monthlyLimit
    ).length;
  }, [budgetMap, monthSpend]);

  // ── Budget handlers ────────────────────────────────────────────────────────
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBudgetError('');
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) {
      setBudgetError('Please enter a valid limit');
      return;
    }
    setSavingBudget(true);
    try {
      await setBudget(groupId, {
        groupId,
        category: budgetCategory,
        monthlyLimit: limit,
        month: currentMonth,
        createdBy: user.uid,
      });
      setShowBudgetModal(false);
      setBudgetLimit('');
    } catch (err) {
      console.error(err);
      setBudgetError('Failed to save budget. Try again.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    setDeletingBudget(budgetId);
    try {
      await deleteBudget(groupId, budgetId);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingBudget(null);
    }
  };

  // ── Loading / not-found states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
        <div className="grid-stats">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard/groups" className="btn btn-icon btn-ghost">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">{group.emoji} {group.name}</h1>
            <p className="page-subtitle">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''} · {group.type}
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddExpense(true)} id="group-add-expense-btn">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Stats row */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value">
            {formatCurrency(Object.values(monthSpend).reduce((s, v) => s + v, 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{expenses.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Budget Alerts</div>
          <div className="stat-value" style={{ color: overBudgetCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {overBudgetCount > 0 ? `${overBudgetCount} over limit` : '✓ All OK'}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tabs" style={{ width: 'fit-content', marginBottom: 28 }}>
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          id="tab-group-overview"
        >
          <LayoutDashboard size={14} /> Overview
        </button>
        <button
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
          id="tab-group-expenses"
        >
          <Receipt size={14} /> Expenses
        </button>
        <button
          className={`tab ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setActiveTab('budgets')}
          id="tab-group-budgets"
        >
          <Wallet size={14} /> Budgets
          {overBudgetCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: 'var(--danger)',
                color: 'white',
                borderRadius: 10,
                padding: '0 6px',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {overBudgetCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══ OVERVIEW TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          <div className="grid-charts">
            {/* Balances */}
            <div className="chart-container">
              <div className="chart-title">Member Balances</div>
              <div className="chart-subtitle">Who owes whom (after settlements)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {name} {isYou ? '(You)' : ''}
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

            {/* Category Breakdown Pie */}
            <div className="chart-container">
              <div className="chart-title">Category Breakdown</div>
              <div className="chart-subtitle">All-time spend by category</div>
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
                        formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
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

          <div className="grid-charts">
            {/* Member Contribution Bar */}
            <div className="chart-container">
              <div className="chart-title">Member Contributions</div>
              <div className="chart-subtitle">Total amount paid by each member</div>
              {memberContribData.some((m) => m.paid > 0) ? (
                <>
                  {topSpender && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: 'rgba(108,92,231,0.08)',
                        border: '1px solid rgba(108,92,231,0.2)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 16,
                      }}
                    >
                      <TrendingUp size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <div style={{ fontSize: 13 }}>
                        <strong>{topSpender.uid === user?.uid ? 'You' : topSpender.name}</strong> paid the most —{' '}
                        <strong style={{ color: 'var(--primary)' }}>{formatCurrency(topSpender.paid)}</strong>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={memberContribData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Paid']}
                        contentStyle={{
                          background: '#14151a',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="paid" fill="#6c5ce7" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-text">No contributions yet</div>
                </div>
              )}
            </div>

            {/* Monthly Trend (last 3 months) */}
            <div className="chart-container">
              <div className="chart-title">Spending Trend</div>
              <div className="chart-subtitle">Last 3 months in this group</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{
                      background: '#14151a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#00cec9"
                    strokeWidth={3}
                    dot={{ fill: '#00cec9', r: 5, strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: '#81ecec' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ═══ EXPENSES TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="chart-title">All Expenses</div>
              <div className="chart-subtitle">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {expenses.length > 0 ? (
            <div>
              {expenses.map((expense) => {
                const cat = getCategoryInfo(expense.category);
                const d = expense.date instanceof Date ? expense.date : new Date(expense.date);
                const paidByName = group.memberNames?.[expense.paidBy] || 'Someone';
                const isYou = expense.paidBy === user?.uid;
                return (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-icon" style={{ background: `${cat.color}18` }}>
                      {cat.emoji}
                    </div>
                    <div className="expense-details">
                      <div className="expense-desc">{expense.description}</div>
                      <div className="expense-meta">
                        {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · Paid by '}
                        <span style={{ color: isYou ? 'var(--primary)' : 'inherit' }}>
                          {isYou ? 'You' : paidByName}
                        </span>
                        {expense.notes && (
                          <span style={{ color: 'var(--muted)' }}> · {expense.notes}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="expense-amount">{formatCurrency(expense.amount)}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Your share:{' '}
                        {expense.splits?.[user?.uid || '']
                          ? formatCurrency(expense.splits[user?.uid || ''])
                          : '—'}
                      </div>
                    </div>
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
      )}

      {/* ═══ BUDGETS TAB ═════════════════════════════════════════════════════ */}
      {activeTab === 'budgets' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                Monthly spend limits for{' '}
                <strong style={{ color: 'var(--foreground)' }}>
                  {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </strong>
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowBudgetModal(true)}
              id="set-budget-btn"
            >
              <Plus size={18} /> Set Budget
            </button>
          </div>

          {/* Budget cards */}
          {Object.keys(budgetMap).length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
                marginBottom: 32,
              }}
            >
              {Object.entries(budgetMap).map(([cat, budget]) => {
                const info = getCategoryInfo(cat as ExpenseCategory);
                const spent = monthSpend[cat] || 0;
                const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
                const over = spent > budget.monthlyLimit;
                const warn = !over && pct >= 80;

                return (
                  <div
                    key={cat}
                    className="card"
                    style={{
                      ...(over ? { borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.03)' } : {}),
                      ...(warn ? { borderColor: 'rgba(253,203,110,0.3)' } : {}),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: `${info.color}18`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                          }}
                        >
                          {info.emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{info.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {Math.round(Math.min(pct, 100))}% used
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {over && <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
                        {warn && !over && <AlertTriangle size={14} style={{ color: '#fdcb6e' }} />}
                        <button
                          className="btn btn-icon btn-ghost"
                          style={{ color: 'var(--muted)' }}
                          onClick={() => handleDeleteBudget(budget.id)}
                          disabled={deletingBudget === budget.id}
                          aria-label="Remove budget"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <BudgetBar spent={spent} limit={budget.monthlyLimit} color={info.color} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 32 }}>
              <div className="empty-state">
                <div className="empty-state-icon">💰</div>
                <div className="empty-state-title">No budgets set</div>
                <div className="empty-state-text">
                  Set monthly category limits to track and control this group's spending.
                </div>
                <button className="btn btn-primary" onClick={() => setShowBudgetModal(true)}>
                  <Plus size={16} /> Set First Budget
                </button>
              </div>
            </div>
          )}

          {/* Unbudgeted categories (this month) */}
          {Object.entries(monthSpend).filter(([cat]) => !budgetMap[cat] && monthSpend[cat] > 0).length > 0 && (
            <div className="chart-container">
              <div className="chart-title">Unbudgeted Spending This Month</div>
              <div className="chart-subtitle">Categories with spend but no limit set</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {Object.entries(monthSpend)
                  .filter(([cat]) => !budgetMap[cat])
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, spent]) => {
                    const info = getCategoryInfo(cat as ExpenseCategory);
                    return (
                      <div
                        key={cat}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: 'var(--surface)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{info.emoji}</span>
                          <span style={{ fontSize: 14 }}>{info.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(spent)}</span>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setBudgetCategory(cat as ExpenseCategory);
                              setShowBudgetModal(true);
                            }}
                          >
                            Set Limit
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Set Budget Modal ────────────────────────────────────────────────── */}
      {showBudgetModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowBudgetModal(false)}
        >
          <div className="modal animate-slide-up" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">Set Monthly Budget</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowBudgetModal(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              This budget applies to{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </strong>
              . You can update it anytime.
            </p>

            {budgetError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,107,107,0.1)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger)',
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                {budgetError}
              </div>
            )}

            <form onSubmit={handleSaveBudget}>
              <div className="input-group">
                <label className="input-label">Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map((cat) => {
                    const spent = monthSpend[cat.key] || 0;
                    const hasBudget = !!budgetMap[cat.key];
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        className={`category-chip ${budgetCategory === cat.key ? 'selected' : ''}`}
                        onClick={() => setBudgetCategory(cat.key)}
                        style={
                          budgetCategory === cat.key
                            ? { borderColor: cat.color, background: `${cat.color}18` }
                            : {}
                        }
                      >
                        {cat.emoji} {cat.label}
                        {hasBudget && (
                          <span style={{ marginLeft: 4, fontSize: 10, color: '#00b894' }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Show current month's spend for selected category */}
                {monthSpend[budgetCategory] !== undefined && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Already spent this month:{' '}
                    <strong style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(monthSpend[budgetCategory] || 0)}
                    </strong>
                  </p>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="budget-limit">
                  Monthly Limit (₹)
                </label>
                <input
                  id="budget-limit"
                  className="input"
                  type="number"
                  step="1"
                  min="1"
                  placeholder={budgetMap[budgetCategory] ? String(budgetMap[budgetCategory].monthlyLimit) : '5000'}
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBudgetModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingBudget}
                  style={{ flex: 2 }}
                  id="confirm-set-budget"
                >
                  {savingBudget ? 'Saving...' : (
                    <><Check size={16} /> {budgetMap[budgetCategory] ? 'Update Budget' : 'Set Budget'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
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
