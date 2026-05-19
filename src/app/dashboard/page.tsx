'use client';

// ============================================
// Dashboard Home — Overview with Charts
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToGroups, subscribeToExpenses } from '@/lib/firestore';
import { formatCurrency, getCategoryInfo, getMonthKey } from '@/lib/utils';
import type { Group, Expense, ExpenseCategory } from '@/types';
import { CATEGORIES } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Plus,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

export default function DashboardPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({});
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));

  // Subscribe to groups
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToGroups(user.uid, setGroups);
    return () => unsub();
  }, [user]);

  // Subscribe to expenses for each group
  useEffect(() => {
    if (!user || groups.length === 0) return;
    const unsubs: (() => void)[] = [];

    groups.forEach((group) => {
      const unsub = subscribeToExpenses(group.id, (expenses) => {
        setAllExpenses((prev) => ({ ...prev, [group.id]: expenses }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [user, groups]);

  // Flatten all expenses
  const expenses = useMemo(() => {
    return Object.values(allExpenses).flat();
  }, [allExpenses]);

  // Filter by selected month
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      return getMonthKey(d) === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Stats
  const totalSpent = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);

  const avgDaily = useMemo(() => {
    const now = new Date();
    const [y, m] = selectedMonth.split('-').map(Number);
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const days = isCurrentMonth ? now.getDate() : new Date(y, m, 0).getDate();
    return days > 0 ? totalSpent / days : 0;
  }, [totalSpent, selectedMonth]);

  const topCategory = useMemo(() => {
    const byCategory: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? getCategoryInfo(sorted[0][0] as ExpenseCategory) : null;
  }, [monthExpenses]);

  // Pie chart data
  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return Object.entries(byCategory)
      .map(([key, value]) => {
        const info = getCategoryInfo(key as ExpenseCategory);
        return { name: info.label, value, color: info.color, emoji: info.emoji };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  // Bar chart data (daily for current month)
  const barData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyMap: Record<number, number> = {};

    monthExpenses.forEach((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      const day = d.getDate();
      dailyMap[day] = (dailyMap[day] || 0) + e.amount;
    });

    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      data.push({ day: `${d}`, amount: dailyMap[d] || 0 });
    }
    return data;
  }, [monthExpenses, selectedMonth]);

  // Trend data (last 6 months)
  const trendData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      months[key] = 0;
    }

    expenses.forEach((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      const key = getMonthKey(d);
      if (months[key] !== undefined) {
        months[key] += e.amount;
      }
    });

    return Object.entries(months).map(([key, total]) => {
      const [, m] = key.split('-').map(Number);
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { month: monthNames[m], total };
    });
  }, [expenses]);

  // Recent expenses
  const recentExpenses = useMemo(() => {
    return [...monthExpenses]
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return db.getTime() - da.getTime();
      })
      .slice(0, 5);
  }, [monthExpenses]);

  // Month selector options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      options.push({ key, label });
    }
    return options;
  }, []);

  // Previous month comparison
  const prevMonthTotal = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = getMonthKey(prevDate);
    return expenses
      .filter((e) => {
        const d = e.date instanceof Date ? e.date : new Date(e.date);
        return getMonthKey(d) === prevKey;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedMonth]);

  const changePercent = prevMonthTotal > 0 ? ((totalSpent - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.displayName?.split(' ')[0] || 'there'} 👋
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: 200 }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-stats">
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Total Spent</div>
              <div className="stat-value">{formatCurrency(totalSpent)}</div>
              {prevMonthTotal > 0 && (
                <div className={`stat-change ${changePercent <= 0 ? 'positive' : 'negative'}`}>
                  {changePercent <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {Math.abs(changePercent).toFixed(1)}% vs last month
                </div>
              )}
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(108, 92, 231, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={22} style={{ color: 'var(--primary)' }} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Daily Average</div>
              <div className="stat-value">{formatCurrency(avgDaily)}</div>
              <div className="stat-change" style={{ color: 'var(--muted)' }}>
                Per day this month
              </div>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 206, 201, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={22} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Transactions</div>
              <div className="stat-value">{monthExpenses.length}</div>
              <div className="stat-change" style={{ color: 'var(--muted)' }}>
                This month
              </div>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(253, 203, 110, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={22} style={{ color: 'var(--warning)' }} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Top Category</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {topCategory ? `${topCategory.emoji} ${topCategory.label}` : '—'}
              </div>
              <div className="stat-change" style={{ color: 'var(--muted)' }}>
                {groups.length} group{groups.length !== 1 ? 's' : ''} active
              </div>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 107, 107, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} style={{ color: 'var(--danger)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-charts">
        {/* Pie Chart — Category Breakdown */}
        <div className="chart-container">
          <div className="chart-title">Category Breakdown</div>
          <div className="chart-subtitle">Where your money went this month</div>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pieData.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: 'var(--muted)' }}>{item.emoji} {item.name}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">No expenses this month yet</div>
            </div>
          )}
        </div>

        {/* Bar Chart — Daily Spending */}
        <div className="chart-container">
          <div className="chart-title">Daily Spending</div>
          <div className="chart-subtitle">Day-by-day breakdown</div>
          {monthExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Spent']}
                  contentStyle={{
                    background: '#14151a',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Bar dataKey="amount" fill="#6c5ce7" radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">Add expenses to see daily trends</div>
            </div>
          )}
        </div>
      </div>

      {/* Second Row: Trend + Recent */}
      <div className="grid-charts">
        {/* Line Chart — 6 Month Trend */}
        <div className="chart-container">
          <div className="chart-title">Spending Trend</div>
          <div className="chart-subtitle">Last 6 months overview</div>
          <ResponsiveContainer width="100%" height={220}>
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
                stroke="#6c5ce7"
                strokeWidth={3}
                dot={{ fill: '#6c5ce7', r: 5, strokeWidth: 0 }}
                activeDot={{ r: 7, fill: '#a29bfe' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Expenses */}
        <div className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="chart-title">Recent Expenses</div>
              <div className="chart-subtitle">Latest transactions</div>
            </div>
            <Link href="/dashboard/expenses" className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentExpenses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentExpenses.map((expense) => {
                const cat = getCategoryInfo(expense.category);
                const d = expense.date instanceof Date ? expense.date : new Date(expense.date);
                return (
                  <div key={expense.id} className="expense-item">
                    <div
                      className="expense-icon"
                      style={{ background: `${cat.color}18` }}
                    >
                      {cat.emoji}
                    </div>
                    <div className="expense-details">
                      <div className="expense-desc">{expense.description}</div>
                      <div className="expense-meta">
                        {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {cat.label}
                      </div>
                    </div>
                    <div className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">💸</div>
              <div className="empty-state-title">No expenses yet</div>
              <div className="empty-state-text">
                Start tracking by adding your first expense
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
                <Plus size={16} />
                Add Expense
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          groups={groups}
          userId={user?.uid || ''}
          userName={user?.displayName || 'You'}
          onClose={() => setShowAddExpense(false)}
        />
      )}
    </div>
  );
}

