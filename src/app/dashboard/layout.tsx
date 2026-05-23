'use client';

// ============================================
// Dashboard Layout — Sidebar + Main Content
// ============================================

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import {
  LayoutDashboard,
  Receipt,
  Users,
  ArrowLeftRight,
  Settings,
  LogOut,
  Menu,
  X,
  PiggyBank,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/groups', label: 'Groups', icon: Users },
  { href: '/dashboard/goals', label: 'Goals', icon: PiggyBank },
  { href: '/dashboard/settlements', label: 'Settlements', icon: ArrowLeftRight },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '3px solid rgba(108,92,231,0.3)',
              borderTopColor: '#6c5ce7',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const userInitial = user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';

  return (
    <div>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          className="btn btn-icon btn-ghost"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="FamWallet" style={{ width: 20, height: 20 }} />
          <span style={{ fontWeight: 800, fontSize: 16, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FamWallet
          </span>
        </div>
        <div
          className="avatar"
          style={{ background: 'var(--gradient-primary)', color: 'white', width: 32, height: 32, fontSize: 13 }}
        >
          {userInitial}
        </div>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="FamWallet" style={{ width: 24, height: 24 }} />
          <h1>FamWallet</h1>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-title">Menu</span>
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', marginBottom: 12 }}>
            <div
              className="avatar"
              style={{ background: 'var(--gradient-primary)', color: 'white' }}
            >
              {userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || 'User'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
          <button className="nav-item" onClick={handleSignOut}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
