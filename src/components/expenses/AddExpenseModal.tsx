'use client';

// ============================================
// Add Expense Modal
// ============================================

import { useState } from 'react';
import { addExpense } from '@/lib/firestore';
import { CATEGORIES } from '@/types';
import type { Group, ExpenseCategory } from '@/types';
import { X, Check } from 'lucide-react';

interface AddExpenseModalProps {
  groups: Group[];
  userId: string;
  userName: string;
  onClose: () => void;
}

export default function AddExpenseModal({
  groups,
  userId,
  userName,
  onClose,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'exact'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!selectedGroupId) {
      setError('Please select a group. Create one first if you haven\'t.');
      return;
    }

    setLoading(true);

    try {
      // Calculate splits
      const members = selectedGroup?.members || [userId];
      const splits: Record<string, number> = {};

      if (splitType === 'equal') {
        const share = numAmount / members.length;
        members.forEach((uid) => {
          splits[uid] = share;
        });
      } else if (splitType === 'exact') {
        let totalExact = 0;
        members.forEach((uid) => {
          const val = parseFloat(customSplits[uid] || '0');
          splits[uid] = val;
          totalExact += val;
        });
        if (Math.abs(totalExact - numAmount) > 0.01) {
          setError(`Exact amounts must sum up to ₹${numAmount}. Currently: ₹${totalExact}`);
          setLoading(false);
          return;
        }
      } else if (splitType === 'percentage') {
        let totalPct = 0;
        members.forEach((uid) => {
          const val = parseFloat(customSplits[uid] || '0');
          splits[uid] = (numAmount * val) / 100;
          totalPct += val;
        });
        if (Math.abs(totalPct - 100) > 0.01) {
          setError(`Percentages must sum up to 100%. Currently: ${totalPct}%`);
          setLoading(false);
          return;
        }
      }

      const trimmedNotes = notes.trim();
      await addExpense(selectedGroupId, {
        groupId: selectedGroupId,
        description: description.trim(),
        amount: numAmount,
        category,
        paidBy: userId,
        splits,
        splitType,
        date: new Date(date),
        createdBy: userId,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });

      onClose();
    } catch (err) {
      console.error('Failed to add expense:', err);
      setError('Failed to add expense. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Add Expense</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Amount — big and prominent */}
          <div className="input-group" style={{ textAlign: 'center', marginBottom: 28 }}>
            <label className="input-label" style={{ textAlign: 'center' }}>
              Amount
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 300,
                  color: 'var(--muted)',
                }}
              >
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 48,
                  fontWeight: 700,
                  color: 'var(--foreground)',
                  width: 200,
                  textAlign: 'center',
                  fontFamily: 'inherit',
                }}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div className="input-group">
            <label className="input-label" htmlFor="expense-desc">
              Description
            </label>
            <input
              id="expense-desc"
              className="input"
              type="text"
              placeholder="e.g., Dinner at restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Group selector */}
          {groups.length > 0 && (
            <div className="input-group">
              <label className="input-label">Group</label>
              <select
                className="select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div className="input-group">
            <label className="input-label">Category</label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`category-chip ${category === cat.key ? 'selected' : ''}`}
                  onClick={() => setCategory(cat.key)}
                  style={
                    category === cat.key
                      ? { borderColor: cat.color, background: `${cat.color}18` }
                      : {}
                  }
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split Type */}
          {selectedGroup && selectedGroup.members.length > 1 && (
            <div className="input-group">
              <label className="input-label">Split Type</label>
              <div className="tabs" style={{ marginBottom: 0 }}>
                {(['equal', 'percentage', 'exact'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`tab ${splitType === type ? 'active' : ''}`}
                    onClick={() => setSplitType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              {splitType === 'equal' && selectedGroup && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  Split equally among {selectedGroup.members.length} members (
                  {amount
                    ? `₹${(parseFloat(amount) / selectedGroup.members.length).toFixed(2)} each`
                    : '—'}
                  )
                </p>
              )}
              {splitType !== 'equal' && selectedGroup && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedGroup.members.map((uid) => {
                    const name = selectedGroup.memberNames?.[uid] || 'Unknown';
                    const isYou = uid === userId;
                    return (
                      <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 14 }}>{name} {isYou ? '(You)' : ''}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={customSplits[uid] || ''}
                            onChange={(e) => setCustomSplits({ ...customSplits, [uid]: e.target.value })}
                            style={{ width: 100, padding: '8px 12px' }}
                          />
                          <span style={{ color: 'var(--muted)', width: 20 }}>
                            {splitType === 'percentage' ? '%' : '₹'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="input-group">
            <label className="input-label" htmlFor="expense-date">
              Date
            </label>
            <input
              id="expense-date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label" htmlFor="expense-notes">
              Notes (optional)
            </label>
            <input
              id="expense-notes"
              className="input"
              type="text"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? (
                'Adding...'
              ) : (
                <>
                  <Check size={16} />
                  Add Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
