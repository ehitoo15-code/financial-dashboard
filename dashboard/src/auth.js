// Authentication module — Google sign-in via Firebase
// Gracefully handles missing Firebase config (guest-only mode)
import { auth, googleProvider, isConfigured } from './firebase.js';

let currentUser = null;
const listeners = [];

/** Subscribe to auth state changes */
export function onAuth(callback) {
    listeners.push(callback);
    // If Firebase is not configured, immediately fire with null (guest mode)
    if (!isConfigured) {
        // Don't auto-fire — let user choose login vs guest
        return () => {
            const idx = listeners.indexOf(callback);
            if (idx >= 0) listeners.splice(idx, 1);
        };
    }
    // Firebase is configured, listen for auth state
    import('firebase/auth').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            listeners.forEach(cb => cb(user));
        });
    });
    return () => {
        const idx = listeners.indexOf(callback);
        if (idx >= 0) listeners.splice(idx, 1);
    };
}

/** Get current user (null if not logged in) */
export function getUser() { return currentUser; }

/** Google sign-in */
export async function loginWithGoogle() {
    if (!isConfigured) {
        alert('Firebase가 설정되지 않았습니다. .env 파일에 Firebase 설정을 추가해주세요.');
        return null;
    }
    try {
        const { signInWithPopup } = await import('firebase/auth');
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/** Sign out */
export async function logout() {
    if (!isConfigured) return;
    try {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}
