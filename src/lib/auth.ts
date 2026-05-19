// ============================================
// Auth Helpers
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signUp(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserDoc(cred.user, displayName);
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await createUserDoc(cred.user);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

async function createUserDoc(user: FirebaseUser, name?: string) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: name || user.displayName || 'User',
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
    });
  }
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

const appleProvider = new OAuthProvider('apple.com');

export async function signInWithApple() {
  const cred = await signInWithPopup(auth, appleProvider);
  await createUserDoc(cred.user);
  return cred.user;
}

export function setupRecaptcha(containerId: string) {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    });
  }
  return (window as any).recaptchaVerifier;
}

export async function signInWithPhone(phoneNumber: string, appVerifier: any) {
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  return confirmationResult;
}
