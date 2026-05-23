'use client';

// ============================================
// Savings Goals Page
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  subscribeToGroups,
} from '@/lib/firestore';
import { formatCurrency } from '@/lib/utils';
import type { SavingsGoal, Group } from '@/types';
import { Plus, X, Trash2, PiggyBank, Target, Users, User, Check } from 'lucide-react';

const GOAL_EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💍', '📱', '🎓', '💊', '🛒', '🏖️', '💰', '🎁'];

// ---- SVG Progress Ring ----
function ProgressRing({
  percent,
  size = 96,
  stroke = 8,
  color,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(percent / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ---- Goal Card ----
function GoalCard({
  goal,
  groups,
  userId,
  onAddFunds,
  onDelete,
}: {
  goal: SavingsGoal;
  groups: Group[];
  userId: string;
  onAddFunds: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
}) {
  const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const isComplete = percent >= 100;
  const group = goal.groupId ? groups.find((g) => g.id === goal.groupId) : null;

  const daysLeft = useMemo(() => {
    if (!goal.deadline) return null;
    const dl = goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline);
    const diff = Math.ceil((dl.getTime() - Date.now()) / 86400000);
    return diff;
  }, [goal.deadline]);

  const ringColor = isComplete
    ? '#00b894'
    : percent >= 75
    ? '#fdcb6e'
    : '#6c5ce7';

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...(isComplete
          ? { borderColor: 'rgba(0,184,148,0.3)', background: 'rgba(0,184,148,0.04)' }
          : {}),
      }}
    >
      {isComplete && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(0,184,148,0.15)',
            color: '#00b894',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          ✅ Completed
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing percent={percent} color={ringColor} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
            }}
          >
            <span style={{ fontSize: 22 }}>{goal.emoji}</span>
            <span style={{ fontWeight: 700, color: ringColor, fontSize: 12 }}>
              {Math.min(Math.round(percent), 100)}%
            </span>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{goal.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            {formatCurrency(goal.currentAmount)}{' '}
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
              / {formatCurrency(goal.targetAmount)}
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(percent, 100)}%`,
                background: ringColor,
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {group && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={11} /> {group.emoji} {group.name}
              </span>
            )}
            {!goal.groupId && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={11} /> Personal
              </span>
            )}
            {daysLeft !== null && (
              <span
                style={{
                  fontSize: 11,
                  color: daysLeft < 0 ? 'var(--danger)' : daysLeft <= 7 ? '#fdcb6e' : 'var(--muted)',
                  fontWeight: daysLeft <= 7 ? 600 : 400,
                }}
              >
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0
                  ? 'Due today!'
                  : `${daysLeft}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          {!isComplete && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAddFunds(goal)}
              id={`add-funds-${goal.id}`}
            >
              + Funds
            </button>
          )}
          {goal.createdBy === userId && (
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => onDelete(goal.id)}
              style={{ color: 'var(--muted)' }}
              aria-label="Delete goal"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
  const [showCreate, setShowCreate] = useState(false);
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  const [newTarget, setNewTarget] = useState('');
  const [newGroupId, setNewGroupId] = useState<string>('');
  const [newDeadline, setNewDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Add funds state
  const [fundsAmount, setFundsAmount] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeSavingsGoals(user.uid, setGoals);
    const unsub2 = subscribeToGroups(user.uid, setGroups);
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const personalGoals = useMemo(() => goals.filter((g) => !g.groupId), [goals]);
  const groupGoals = useMemo(() => goals.filter((g) => !!g.groupId), [goals]);
  const displayed = activeTab === 'personal' ? personalGoals : groupGoals;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateError('');

    const targetNum = parseFloat(newTarget);
    if (!newName.trim()) { setCreateError('Please enter a goal name'); return; }
    if (isNaN(targetNum) || targetNum <= 0) { setCreateError('Please enter a valid target amount'); return; }
    if (activeTab === 'group' && !newGroupId) { setCreateError('Please select a group for this goal'); return; }

    setCreating(true);
    try {
      await createSavingsGoal({
        name: newName.trim(),
        emoji: newEmoji,
        targetAmount: targetNum,
        currentAmount: 0,
        groupId: activeTab === 'group' ? newGroupId : null,
        deadline: newDeadline ? new Date(newDeadline) : null,
        createdBy: user.uid,
      });
      setShowCreate(false);
      setNewName('');
      setNewTarget('');
      setNewDeadline('');
      setNewGroupId('');
    } catch (err) {
      console.error(err);
      setCreateError('Failed to create goal. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddFunds = async () => {
    if (!addFundsGoal) return;
    const amount = parseFloat(fundsAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingFunds(true);
    try {
      const newAmount = Math.min(addFundsGoal.currentAmount + amount, addFundsGoal.targetAmount);
      await updateSavingsGoal(addFundsGoal.id, { currentAmount: newAmount });
      setAddFundsGoal(null);
      setFundsAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingFunds(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteSavingsGoal(goalId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
    }
  };

  const totalSaved = personalGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = personalGoals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} · {formatCurrency(totalSaved)} saved of {formatCurrency(totalTarget)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="create-goal-btn">
          <Plus size={18} /> New Goal
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid-stats" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Personal Goals</div>
          <div className="stat-value">{personalGoals.length}</div>
          <div className="stat-change" style={{ color: 'var(--muted)' }}>
            {personalGoals.filter(g => g.currentAmount >= g.targetAmount).length} completed
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Group Goals</div>
          <div className="stat-value">{groupGoals.length}</div>
          <div className="stat-change" style={{ color: 'var(--muted)' }}>
            {groupGoals.filter(g => g.currentAmount >= g.targetAmount).length} completed
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Saved (Personal)</div>
          <div className="stat-value">{formatCurrency(totalSaved)}</div>
          <div className="stat-change" style={{ color: 'var(--muted)' }}>
            of {formatCurrency(totalTarget)} target
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ width: 'fit-content', marginBottom: 24 }}>
        <button
          className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
          id="tab-personal-goals"
        >
          <User size={14} /> My Goals
        </button>
        <button
          className={`tab ${activeTab === 'group' ? 'active' : ''}`}
          onClick={() => setActiveTab('group')}
          id="tab-group-goals"
        >
          <Users size={14} /> Group Goals
        </button>
      </div>

      {/* Goals List */}
      {displayed.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayed.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              groups={groups}
              userId={user?.uid || ''}
              onAddFunds={setAddFundsGoal}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              {activeTab === 'personal' ? '🎯' : '👥'}
            </div>
            <div className="empty-state-title">
              {activeTab === 'personal' ? 'No personal goals yet' : 'No group goals yet'}
            </div>
            <div className="empty-state-text">
              {activeTab === 'personal'
                ? 'Set a savings target — a vacation, emergency fund, new gadget, anything!'
                : 'Create a shared goal with your group to save together.'}
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create Goal
            </button>
          </div>
        </div>
      )}

      {/* ── Create Goal Modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h2 className="modal-title">New Savings Goal</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            {createError && (
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
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate}>
              {/* Goal Type toggle */}
              <div className="input-group">
                <label className="input-label">Goal Type</label>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('personal'); setNewGroupId(''); }}
                  >
                    <User size={13} /> Personal
                  </button>
                  <button
                    type="button"
                    className={`tab ${activeTab === 'group' ? 'active' : ''}`}
                    onClick={() => setActiveTab('group')}
                  >
                    <Users size={13} /> Group
                  </button>
                </div>
              </div>

              {/* Group selector (only for group goals) */}
              {activeTab === 'group' && (
                <div className="input-group">
                  <label className="input-label">Select Group</label>
                  {groups.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                      You have no groups yet. Create a group first.
                    </p>
                  ) : (
                    <select
                      className="select"
                      value={newGroupId}
                      onChange={(e) => setNewGroupId(e.target.value)}
                    >
                      <option value="">— Choose a group —</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.emoji} {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Emoji */}
              <div className="input-group">
                <label className="input-label">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {GOAL_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewEmoji(emoji)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${newEmoji === emoji ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: newEmoji === emoji ? 'rgba(108,92,231,0.12)' : 'var(--surface)',
                        fontSize: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="input-group">
                <label className="input-label" htmlFor="goal-name">Goal Name</label>
                <input
                  id="goal-name"
                  className="input"
                  type="text"
                  placeholder="e.g., Goa Trip, Emergency Fund"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              {/* Target Amount */}
              <div className="input-group">
                <label className="input-label" htmlFor="goal-target">Target Amount (₹)</label>
                <input
                  id="goal-target"
                  className="input"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="50000"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  required
                />
              </div>

              {/* Deadline */}
              <div className="input-group">
                <label className="input-label" htmlFor="goal-deadline">Deadline (optional)</label>
                <input
                  id="goal-deadline"
                  className="input"
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                  style={{ flex: 2 }}
                  id="submit-create-goal"
                >
                  {creating ? 'Creating...' : (
                    <><Check size={16} /> Create Goal</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Funds Modal ── */}
      {addFundsGoal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAddFundsGoal(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Funds</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setAddFundsGoal(null)}>
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '16px 0 24px',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>{addFundsGoal.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{addFundsGoal.name}</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                {formatCurrency(addFundsGoal.currentAmount)}{' '}
                <span style={{ color: 'var(--foreground)' }}>/ {formatCurrency(addFundsGoal.targetAmount)}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <ProgressRing
                  percent={(addFundsGoal.currentAmount / addFundsGoal.targetAmount) * 100}
                  size={80}
                  stroke={7}
                  color="#6c5ce7"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="funds-amount">Amount to Add (₹)</label>
              <input
                id="funds-amount"
                className="input"
                type="number"
                step="1"
                min="1"
                placeholder="5000"
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                autoFocus
              />
              {fundsAmount && parseFloat(fundsAmount) > 0 && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  New total:{' '}
                  <strong style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(
                      Math.min(
                        addFundsGoal.currentAmount + parseFloat(fundsAmount),
                        addFundsGoal.targetAmount
                      )
                    )}
                  </strong>
                  {addFundsGoal.currentAmount + parseFloat(fundsAmount) >= addFundsGoal.targetAmount && (
                    <span style={{ color: '#00b894', marginLeft: 8 }}>🎉 Goal reached!</span>
                  )}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setAddFundsGoal(null); setFundsAmount(''); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddFunds}
                disabled={addingFunds || !fundsAmount || parseFloat(fundsAmount) <= 0}
                style={{ flex: 2 }}
                id="confirm-add-funds"
              >
                {addingFunds ? 'Saving...' : (
                  <><PiggyBank size={16} /> Add Funds</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Goal?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              This will permanently delete this savings goal. Progress will be lost.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1 }}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
