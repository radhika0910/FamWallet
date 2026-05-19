// ============================================
// Firestore CRUD Operations
// ============================================

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  writeBatch,
  deleteField,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Group, Expense, Settlement } from '@/types';

// ---- GROUPS ----

export async function createGroup(group: Omit<Group, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'groups'), {
    ...group,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Group;
}

export async function getUserGroups(uid: string): Promise<Group[]> {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
}

export function subscribeToGroups(uid: string, callback: (groups: Group[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
    callback(groups);
  });
}

export async function updateGroup(groupId: string, data: Partial<Group>) {
  await updateDoc(doc(db, 'groups', groupId), data);
}

export async function deleteGroup(groupId: string) {
  await deleteDoc(doc(db, 'groups', groupId));
}

// ---- EXPENSES ----

export async function addExpense(groupId: string, expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'groups', groupId, 'expenses'), {
    ...expense,
    date: expense.date instanceof Date ? Timestamp.fromDate(expense.date) : expense.date,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateExpense(groupId: string, expenseId: string, data: Partial<Expense>) {
  const updateData = { ...data };
  if (updateData.date instanceof Date) {
    (updateData as Record<string, unknown>).date = Timestamp.fromDate(updateData.date);
  }
  await updateDoc(doc(db, 'groups', groupId, 'expenses', expenseId), updateData);
}

export async function deleteExpense(groupId: string, expenseId: string) {
  await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
}

export function subscribeToExpenses(
  groupId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'expenses'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const expenses = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      } as Expense;
    });
    callback(expenses);
  });
}

// ---- SETTLEMENTS ----

export async function addSettlement(groupId: string, settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'groups', groupId, 'settlements'), {
    ...settlement,
    date: settlement.date instanceof Date ? Timestamp.fromDate(settlement.date) : settlement.date,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeToSettlements(
  groupId: string,
  callback: (settlements: Settlement[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'settlements'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const settlements = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      } as Settlement;
    });
    callback(settlements);
  });
}

// ---- USER LOOKUP ----

export async function findUserByEmail(email: string) {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ---- INVITES ----

export async function createInvite(email: string, groupId: string) {
  await addDoc(collection(db, 'pending_invites'), {
    email: email.toLowerCase(),
    groupId,
    createdAt: serverTimestamp(),
  });
}

export async function claimInvites(email: string, uid: string) {
  const cleanEmail = email.toLowerCase().trim();
  
  // 1. Check legacy pending_invites
  const qInvites = query(collection(db, 'pending_invites'), where('email', '==', cleanEmail));
  const invitesSnap = await getDocs(qInvites);
  
  // 2. Query all groups where cleanEmail is a placeholder member
  const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', cleanEmail));
  const groupsSnap = await getDocs(qGroups);
  
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userName = userSnap.data()?.displayName || cleanEmail.split('@')[0];

  const batch = writeBatch(db);

  // Process legacy invites
  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data();
    const groupRef = doc(db, 'groups', invite.groupId);
    batch.update(groupRef, {
      members: arrayUnion(uid),
      [`memberNames.${uid}`]: userName,
      [`memberEmails.${uid}`]: cleanEmail,
    });
    batch.delete(inviteDoc.ref);
  }

  // Process inline group memberships
  for (const groupDoc of groupsSnap.docs) {
    const group = groupDoc.data() as Group;
    const groupRef = doc(db, 'groups', groupDoc.id);

    // Update members array: remove email, add uid
    const updatedMembers = (group.members || []).filter(m => m !== cleanEmail);
    if (!updatedMembers.includes(uid)) {
      updatedMembers.push(uid);
    }

    batch.update(groupRef, {
      members: updatedMembers,
      [`memberNames.${uid}`]: userName,
      [`memberEmails.${uid}`]: cleanEmail,
      [`memberNames.${cleanEmail}`]: deleteField(),
      [`memberEmails.${cleanEmail}`]: deleteField(),
    });

    // Clean up expenses in this group that split with the pending email
    const expensesRef = collection(db, 'groups', groupDoc.id, 'expenses');
    const expensesSnap = await getDocs(expensesRef);
    for (const expDoc of expensesSnap.docs) {
      const exp = expDoc.data() as Expense;
      let needsUpdate = false;
      const updatedSplits = { ...exp.splits };
      let updatedPaidBy = exp.paidBy;

      if (exp.splits && exp.splits[cleanEmail] !== undefined) {
        updatedSplits[uid] = exp.splits[cleanEmail];
        delete updatedSplits[cleanEmail];
        needsUpdate = true;
      }
      if (exp.paidBy === cleanEmail) {
        updatedPaidBy = uid;
        needsUpdate = true;
      }

      if (needsUpdate) {
        batch.update(expDoc.ref, {
          splits: updatedSplits,
          paidBy: updatedPaidBy,
        });
      }
    }
  }

  await batch.commit();
}
