'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { signOut } from '@/lib/auth';
import { getUserGroups } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { User, Mail, Shield, LogOut, Save, Moon, Bell, Database, Trash2, Download } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const groups = await getUserGroups(user.uid);
      const allExp: any[] = [];
      for (const g of groups) {
        const q = query(collection(db, 'groups', g.id, 'expenses'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        snap.forEach(d => {
          allExp.push({ ...d.data(), groupName: g.name });
        });
      }
      const headers = ['Date', 'Group', 'Category', 'Description', 'Amount', 'Paid By', 'Notes'];
      const rows = allExp.map(e => {
        const d = e.date?.toDate?.() || new Date(e.date);
        return [
          d.toLocaleDateString(),
          `"${e.groupName}"`,
          e.category,
          `"${e.description}"`,
          e.amount,
          e.paidBy === user.uid ? 'You' : 'Member',
          `"${e.notes || ''}"`
        ];
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "famwallet_expenses.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const initial = user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account</p>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Profile Section */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div className="avatar avatar-lg" style={{ background: 'var(--gradient-primary)', color: 'white', width: 64, height: 64, fontSize: 24 }}>
              {initial}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.displayName || 'User'}</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>{user?.email}</div>
              <div className="badge badge-primary" style={{ marginTop: 6 }}>
                <Shield size={12} /> Free Plan
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="settings-name"><User size={14} style={{ display: 'inline', marginRight: 6 }} />Display Name</label>
            <input id="settings-name" className="input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="input-group">
            <label className="input-label"><Mail size={14} style={{ display: 'inline', marginRight: 6 }} />Email</label>
            <input className="input" type="email" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Email cannot be changed</p>
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !displayName.trim()}>
            <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>

        {/* Preferences */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Moon size={18} style={{ color: 'var(--primary)' }} />
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>Dark Mode</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Always on (default)</div></div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={18} style={{ color: 'var(--warning)' }} />
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>Notifications</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Coming soon</div></div>
              </div>
              <span className="badge badge-warning">Soon</span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={18} style={{ color: 'var(--accent)' }} />
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>Data Retention</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>1 year rolling storage</div></div>
              </div>
              <span className="badge badge-primary">1 Year</span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Download size={18} style={{ color: 'var(--success)' }} />
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>Export Data</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Download all expenses as CSV</div></div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ borderColor: 'rgba(255,107,107,0.2)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--danger)' }}>Danger Zone</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={handleSignOut}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
