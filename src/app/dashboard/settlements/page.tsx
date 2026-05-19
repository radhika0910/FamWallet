'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToGroups, subscribeToExpenses, subscribeToSettlements, addSettlement } from '@/lib/firestore';
import { formatCurrency } from '@/lib/utils';
import type { Group, Expense, Settlement } from '@/types';
import { ArrowRight, Check, X, ArrowLeftRight, History } from 'lucide-react';

interface DebtEntry {
  from: string; fromName: string; to: string; toName: string;
  amount: number; groupId: string; groupName: string;
}

export default function SettlementsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({});
  const [allSettlements, setAllSettlements] = useState<Record<string, Settlement[]>>({});
  const [showSettle, setShowSettle] = useState<DebtEntry | null>(null);
  const [settling, setSettling] = useState(false);
  const [activeTab, setActiveTab] = useState<'debts' | 'history'>('debts');

  useEffect(() => {
    if (!user) return;
    return subscribeToGroups(user.uid, setGroups);
  }, [user]);

  useEffect(() => {
    if (!user || groups.length === 0) return;
    const unsubs: (() => void)[] = [];
    groups.forEach((g) => {
      unsubs.push(subscribeToExpenses(g.id, (e) => setAllExpenses((p) => ({ ...p, [g.id]: e }))));
      unsubs.push(subscribeToSettlements(g.id, (s) => setAllSettlements((p) => ({ ...p, [g.id]: s }))));
    });
    return () => unsubs.forEach((u) => u());
  }, [user, groups]);

  const debts = useMemo(() => {
    const all: DebtEntry[] = [];
    groups.forEach((group) => {
      if (group.members.length < 2) return;
      const expenses = allExpenses[group.id] || [];
      const settlements = allSettlements[group.id] || [];
      const bal: Record<string, number> = {};
      group.members.forEach((uid) => { bal[uid] = 0; });
      expenses.forEach((exp) => {
        bal[exp.paidBy] = (bal[exp.paidBy] || 0) + exp.amount;
        Object.entries(exp.splits || {}).forEach(([uid, amt]) => { bal[uid] = (bal[uid] || 0) - amt; });
      });
      settlements.forEach((s) => { bal[s.from] = (bal[s.from] || 0) + s.amount; bal[s.to] = (bal[s.to] || 0) - s.amount; });
      const debtors = Object.entries(bal).filter(([, v]) => v < -0.01).map(([uid, v]) => ({ uid, amount: Math.abs(v) })).sort((a, b) => b.amount - a.amount);
      const creditors = Object.entries(bal).filter(([, v]) => v > 0.01).map(([uid, v]) => ({ uid, amount: v })).sort((a, b) => b.amount - a.amount);
      let di = 0, ci = 0;
      while (di < debtors.length && ci < creditors.length) {
        const amount = Math.min(debtors[di].amount, creditors[ci].amount);
        if (amount > 0.01) all.push({ from: debtors[di].uid, fromName: group.memberNames?.[debtors[di].uid] || '?', to: creditors[ci].uid, toName: group.memberNames?.[creditors[ci].uid] || '?', amount: Math.round(amount * 100) / 100, groupId: group.id, groupName: group.name });
        debtors[di].amount -= amount; creditors[ci].amount -= amount;
        if (debtors[di].amount < 0.01) di++; if (creditors[ci].amount < 0.01) ci++;
      }
    });
    return all;
  }, [groups, allExpenses, allSettlements]);

  const settlementHistory = useMemo(() => {
    return Object.entries(allSettlements).flatMap(([gid, ss]) => ss.map((s) => {
      const g = groups.find((gr) => gr.id === gid);
      return { ...s, groupId: gid, groupName: g?.name || '?', fromName: g?.memberNames?.[s.from] || '?', toName: g?.memberNames?.[s.to] || '?' };
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSettlements, groups]);

  const handleSettle = async () => {
    if (!showSettle) return;
    setSettling(true);
    try {
      await addSettlement(showSettle.groupId, { groupId: showSettle.groupId, from: showSettle.from, to: showSettle.to, amount: showSettle.amount, date: new Date() });
      setShowSettle(null);
    } catch (err) { console.error(err); } finally { setSettling(false); }
  };

  const myDebts = debts.filter((d) => d.from === user?.uid);
  const owedToMe = debts.filter((d) => d.to === user?.uid);
  const otherDebts = debts.filter((d) => d.from !== user?.uid && d.to !== user?.uid);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlements</h1>
          <p className="page-subtitle">{debts.length} outstanding balance{debts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="tabs" style={{ width: 'fit-content' }}>
        <button className={`tab ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => setActiveTab('debts')}><ArrowLeftRight size={14} /> Balances</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><History size={14} /> History</button>
      </div>

      {activeTab === 'debts' ? (
        <>
          <div className="grid-stats" style={{ marginBottom: 28 }}>
            <div className="stat-card"><div className="stat-label">You Owe</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(myDebts.reduce((s, d) => s + d.amount, 0))}</div></div>
            <div className="stat-card"><div className="stat-label">Owed to You</div><div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(owedToMe.reduce((s, d) => s + d.amount, 0))}</div></div>
            <div className="stat-card"><div className="stat-label">Net Balance</div><div className="stat-value" style={{ color: owedToMe.reduce((s, d) => s + d.amount, 0) - myDebts.reduce((s, d) => s + d.amount, 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(owedToMe.reduce((s, d) => s + d.amount, 0) - myDebts.reduce((s, d) => s + d.amount, 0))}</div></div>
          </div>
          {myDebts.length > 0 && (<div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--danger)' }}>💸 You Owe</h3><div className="card" style={{ padding: 0 }}>{myDebts.map((debt, i) => (<div key={i}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div className="avatar" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)' }}>{debt.fromName.charAt(0)}</div><div><div style={{ fontWeight: 600, fontSize: 14 }}>You → {debt.toName}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{debt.groupName}</div></div></div><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 16 }}>{formatCurrency(debt.amount)}</span><button className="btn btn-primary btn-sm" onClick={() => setShowSettle(debt)}><Check size={14} /> Settle</button></div></div>{i < myDebts.length - 1 && <div className="divider" style={{ margin: 0 }} />}</div>))}</div></div>)}
          {owedToMe.length > 0 && (<div style={{ marginBottom: 24 }}><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--success)' }}>💰 Owed to You</h3><div className="card" style={{ padding: 0 }}>{owedToMe.map((debt, i) => (<div key={i}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div className="avatar" style={{ background: 'rgba(0,184,148,0.15)', color: 'var(--success)' }}>{debt.fromName.charAt(0)}</div><div><div style={{ fontWeight: 600, fontSize: 14 }}>{debt.fromName} → You</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{debt.groupName}</div></div></div><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>{formatCurrency(debt.amount)}</span><button className="btn btn-secondary btn-sm" onClick={() => setShowSettle(debt)}><Check size={14} /> Record</button></div></div>{i < owedToMe.length - 1 && <div className="divider" style={{ margin: 0 }} />}</div>))}</div></div>)}
          {otherDebts.length > 0 && (<div><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--muted)' }}>👥 Other Balances</h3><div className="card" style={{ padding: 0 }}>{otherDebts.map((debt, i) => (<div key={i}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 14 }}>{debt.fromName}</span><ArrowRight size={14} style={{ color: 'var(--muted)' }} /><span style={{ fontSize: 14 }}>{debt.toName}</span></div><span style={{ fontWeight: 600 }}>{formatCurrency(debt.amount)}</span></div>{i < otherDebts.length - 1 && <div className="divider" style={{ margin: 0 }} />}</div>))}</div></div>)}
          {debts.length === 0 && <div className="card"><div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">All settled up!</div><div className="empty-state-text">No outstanding balances.</div></div></div>}
        </>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {settlementHistory.length > 0 ? settlementHistory.map((s, i) => { const d = s.date instanceof Date ? s.date : new Date(s.date); return (<div key={s.id}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(0,184,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={20} style={{ color: 'var(--success)' }} /></div><div><div style={{ fontWeight: 600, fontSize: 14 }}>{s.from === user?.uid ? 'You' : s.fromName} paid {s.to === user?.uid ? 'You' : s.toName}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {s.groupName}</div></div></div><span style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>{formatCurrency(s.amount)}</span></div>{i < settlementHistory.length - 1 && <div className="divider" style={{ margin: 0 }} />}</div>); }) : <div className="empty-state"><div className="empty-state-icon">📜</div><div className="empty-state-title">No settlement history</div><div className="empty-state-text">When you settle debts, they&apos;ll appear here.</div></div>}
        </div>
      )}

      {showSettle && (
        <div className="modal-overlay" onClick={() => setShowSettle(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Confirm Settlement</h2><button className="btn btn-icon btn-ghost" onClick={() => setShowSettle(null)}><X size={20} /></button></div>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                <div><div className="avatar avatar-lg" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)', margin: '0 auto 8px' }}>{showSettle.fromName.charAt(0)}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{showSettle.from === user?.uid ? 'You' : showSettle.fromName}</div></div>
                <ArrowRight size={24} style={{ color: 'var(--muted)' }} />
                <div><div className="avatar avatar-lg" style={{ background: 'rgba(0,184,148,0.15)', color: 'var(--success)', margin: '0 auto 8px' }}>{showSettle.toName.charAt(0)}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{showSettle.to === user?.uid ? 'You' : showSettle.toName}</div></div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{formatCurrency(showSettle.amount)}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>in {showSettle.groupName}</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowSettle(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSettle} disabled={settling} style={{ flex: 1 }}><Check size={16} /> {settling ? 'Recording...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
