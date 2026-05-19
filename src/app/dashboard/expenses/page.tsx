'use client';

// ============================================
// Expenses Page — Full list with filters
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToGroups, subscribeToExpenses, deleteExpense } from '@/lib/firestore';
import { formatCurrency, getCategoryInfo, getMonthKey } from '@/lib/utils';
import type { Group, Expense, ExpenseCategory } from '@/types';
import { CATEGORIES } from '@/types';
import { Plus, Search, Filter, Trash2, Edit3 } from 'lucide-react';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({});
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));
  const [deleteConfirm, setDeleteConfirm] = useState<{ groupId: string; expenseId: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToGroups(user.uid, setGroups);
    return () => unsub();
  }, [user]);

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

  const expenses = useMemo(() => {
    let list = Object.entries(allExpenses).flatMap(([groupId, exps]) =>
      exps.map((e) => ({ ...e, groupId }))
    );

    // Month filter
    list = list.filter((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      return getMonthKey(d) === selectedMonth;
    });

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      list = list.filter((e) => e.category === filterCategory);
    }

    // Group filter
    if (filterGroup !== 'all') {
      list = list.filter((e) => e.groupId === filterGroup);
    }

    return list.sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return db.getTime() - da.getTime();
    });
  }, [allExpenses, searchQuery, filterCategory, filterGroup, selectedMonth]);

  const totalFiltered = expenses.reduce((s, e) => s + e.amount, 0);

  const handleDelete = async (groupId: string, expenseId: string) => {
    try {
      await deleteExpense(groupId, expenseId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        key: getMonthKey(d),
        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      });
    }
    return options;
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} · {formatCurrency(totalFiltered)} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            className="input"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>

        <select
          className="select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ width: 180 }}
        >
          {monthOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        <select
          className="select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {cat.emoji} {cat.label}
            </option>
          ))}
        </select>

        {groups.length > 1 && (
          <select
            className="select"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Expense List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {expenses.length > 0 ? (
          expenses.map((expense) => {
            const cat = getCategoryInfo(expense.category);
            const d = expense.date instanceof Date ? expense.date : new Date(expense.date);
            const group = groups.find((g) => g.id === expense.groupId);
            const isPayer = expense.paidBy === user?.uid;

            return (
              <div key={`${expense.groupId}-${expense.id}`}>
                <div className="expense-item" style={{ padding: '16px 24px' }}>
                  <div
                    className="expense-icon"
                    style={{ background: `${cat.color}18` }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="expense-details">
                    <div className="expense-desc">{expense.description}</div>
                    <div className="expense-meta">
                      {d.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {cat.label}
                      {group && (
                        <>
                          {' · '}
                          <span style={{ color: 'var(--primary)' }}>
                            {group.emoji} {group.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="expense-amount">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {isPayer ? 'You paid' : `Paid by member`}
                      </div>
                    </div>
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={() =>
                        setDeleteConfirm({
                          groupId: expense.groupId,
                          expenseId: expense.id,
                        })
                      }
                      style={{ color: 'var(--muted)' }}
                      aria-label="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="divider" style={{ margin: 0 }} />
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <div className="empty-state-title">No expenses found</div>
            <div className="empty-state-text">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Start tracking by adding your first expense'}
            </div>
            {!searchQuery && filterCategory === 'all' && (
              <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
                <Plus size={16} />
                Add Expense
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Expense?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              This action cannot be undone. The expense will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm.groupId, deleteConfirm.expenseId)}
                style={{ flex: 1 }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
