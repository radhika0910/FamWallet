'use client';

// ============================================
// Groups Page — Create & manage groups
// ============================================

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToGroups, createGroup, deleteGroup, updateGroup, findUserByEmail, createInvite } from '@/lib/firestore';
import type { Group } from '@/types';
import {
  Plus,
  Users,
  User,
  Heart,
  Home,
  X,
  Trash2,
  UserPlus,
  Settings,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const groupTypes = [
  { key: 'solo', label: 'Personal', emoji: '👤', desc: 'Track your own expenses', icon: User },
  { key: 'couple', label: 'Couple', emoji: '💑', desc: 'Share with your partner', icon: Heart },
  { key: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦', desc: 'Whole family expenses', icon: Home },
  { key: 'group', label: 'Group', emoji: '👥', desc: 'Friends or roommates', icon: Users },
] as const;

const groupEmojis = ['💰', '🏠', '🍕', '✈️', '🛒', '🎉', '📚', '💊', '🚗', '🎬', '👶', '🐾'];

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'solo' | 'couple' | 'family' | 'group'>('family');
  const [newEmoji, setNewEmoji] = useState('💰');
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToGroups(user.uid, setGroups);
    return () => unsub();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    setCreating(true);
    try {
      await createGroup({
        name: newName.trim(),
        type: newType,
        members: [user.uid],
        memberEmails: { [user.uid]: user.email || '' },
        memberNames: { [user.uid]: user.displayName || 'You' },
        createdBy: user.uid,
        currency: 'INR',
        emoji: newEmoji,
      });
      setShowCreate(false);
      setNewName('');
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInvite || !inviteEmail.trim()) return;
    setInviteError('');
    setInviting(true);

    try {
      const foundUser = await findUserByEmail(inviteEmail.trim());
      if (!foundUser) {
        await createInvite(inviteEmail.trim(), showInvite);
        setInviteEmail('');
        setShowInvite(null);
        alert(`An invite has been saved for ${inviteEmail.trim()}. They will automatically join when they sign up!`);
        return;
      }

      const group = groups.find((g) => g.id === showInvite);
      if (!group) return;

      if (group.members.includes(foundUser.id)) {
        setInviteError('This person is already a member.');
        return;
      }

      await updateGroup(showInvite, {
        members: [...group.members, foundUser.id],
        memberEmails: {
          ...group.memberEmails,
          [foundUser.id]: String(foundUser.email || ''),
        },
        memberNames: {
          ...group.memberNames,
          [foundUser.id]: String(foundUser.displayName || 'User'),
        },
      } as Partial<Group>);

      setInviteEmail('');
      setShowInvite(null);
    } catch (err) {
      console.error('Failed to invite:', err);
      setInviteError('Failed to invite. Try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          New Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {groups.map((group) => {
            const typeInfo = groupTypes.find((t) => t.key === group.type);
            const memberCount = group.members?.length || 1;

            return (
              <div key={group.id} className="card" style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                      }}
                    >
                      {group.emoji || '💰'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{group.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {typeInfo?.label || group.type} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={() => setShowInvite(group.id)}
                      aria-label="Invite member"
                      style={{ color: 'var(--accent)' }}
                    >
                      <UserPlus size={16} />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      onClick={() => setDeleteConfirm(group.id)}
                      aria-label="Delete group"
                      style={{ color: 'var(--muted)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                    Members
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {group.members?.map((uid) => {
                      const name = group.memberNames?.[uid] || 'Unknown';
                      const isYou = uid === user?.uid;
                      return (
                        <span
                          key={uid}
                          className="badge badge-primary"
                          style={isYou ? { background: 'rgba(0,206,201,0.15)', color: '#81ecec' } : {}}
                        >
                          {name}{isYou ? ' (You)' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <Link
                  href={`/dashboard/groups/${group.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  View Details <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No groups yet</div>
            <div className="empty-state-text">
              Create a group to start tracking expenses with your family, partner, or friends.
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create Your First Group
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h2 className="modal-title">Create Group</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {/* Group Type */}
              <div className="input-group">
                <label className="input-label">Type</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 8,
                  }}
                >
                  {groupTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.key}
                        type="button"
                        className="card"
                        style={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          padding: '16px 12px',
                          ...(newType === type.key
                            ? {
                                borderColor: 'var(--primary)',
                                background: 'rgba(108,92,231,0.08)',
                              }
                            : {}),
                        }}
                        onClick={() => setNewType(type.key)}
                      >
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{type.emoji}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{type.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {type.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div className="input-group">
                <label className="input-label" htmlFor="group-name">Group Name</label>
                <input
                  id="group-name"
                  className="input"
                  type="text"
                  placeholder="e.g., Home Expenses"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              {/* Emoji */}
              <div className="input-group">
                <label className="input-label">Icon</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {groupEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${newEmoji === emoji ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: newEmoji === emoji ? 'rgba(108,92,231,0.12)' : 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setNewEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
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
                  disabled={creating || !newName.trim()}
                  style={{ flex: 2 }}
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Invite Member</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowInvite(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
              Enter the email of the person you want to add. If they don't have an account, they'll join automatically when they sign up.
            </p>

            {inviteError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,107,107,0.1)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger)',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite}>
              <div className="input-group">
                <input
                  className="input"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={inviting} style={{ flex: 1 }}>
                  <UserPlus size={16} />
                  {inviting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Group?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              This will permanently delete the group and all its expenses. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1 }}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
