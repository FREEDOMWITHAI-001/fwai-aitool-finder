import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  query,
  orderByChild,
  limitToLast,
  remove,
  increment,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const rtdb = getDatabase(app);

const INITIAL_CREDITS = 50;

// ---- localStorage fallback for credits ----

function localKey(uid) {
  return `aitf_credits_${uid}`;
}

function getLocalCredits(uid) {
  const stored = localStorage.getItem(localKey(uid));
  if (stored === null) {
    localStorage.setItem(localKey(uid), String(INITIAL_CREDITS));
    return INITIAL_CREDITS;
  }
  return parseInt(stored, 10);
}

function setLocalCredits(uid, value) {
  localStorage.setItem(localKey(uid), String(value));
}

// ---- Auth helpers ----

export async function signUp(email, password, role = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  try {
    await set(ref(rtdb, `users/${uid}`), {
      email,
      credits: INITIAL_CREDITS,
      role,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // RTDB blocked — localStorage will handle credits
  }
  setLocalCredits(uid, INITIAL_CREDITS);
  if (role) localStorage.setItem(`aitf_role_${uid}`, role);
  return userCredential.user;
}

export async function logIn(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ---- Credits (Realtime Database with localStorage fallback) ----
// RTDB uses WebSocket to project-specific domain, bypasses ad blockers

export async function getCredits(uid) {
  try {
    const snap = await get(ref(rtdb, `users/${uid}/credits`));
    if (!snap.exists()) {
      // First-time user — initialize
      await set(ref(rtdb, `users/${uid}`), {
        credits: INITIAL_CREDITS,
        createdAt: new Date().toISOString(),
      });
      setLocalCredits(uid, INITIAL_CREDITS);
      return INITIAL_CREDITS;
    }
    const credits = snap.val() ?? 0;
    setLocalCredits(uid, credits);
    return credits;
  } catch {
    return getLocalCredits(uid);
  }
}

export async function useCredit(uid) {
  try {
    const current = await getCredits(uid);
    if (current <= 0) return 0;
    const newBalance = current - 1;
    await update(ref(rtdb, `users/${uid}`), { credits: newBalance });
    setLocalCredits(uid, newBalance);
    return newBalance;
  } catch {
    const current = getLocalCredits(uid);
    if (current <= 0) return 0;
    const newBalance = current - 1;
    setLocalCredits(uid, newBalance);
    return newBalance;
  }
}

export async function hasCredits(uid) {
  const credits = await getCredits(uid);
  return credits > 0;
}

// ---- Role / Profile ----

export async function getUserRole(uid) {
  try {
    const snap = await get(ref(rtdb, `users/${uid}/role`));
    const role = snap.exists() ? snap.val() : '';
    if (role) localStorage.setItem(`aitf_role_${uid}`, role);
    return role;
  } catch {
    return localStorage.getItem(`aitf_role_${uid}`) || '';
  }
}

export async function updateUserRole(uid, role) {
  try {
    await update(ref(rtdb, `users/${uid}`), { role });
  } catch {
    // fallback
  }
  localStorage.setItem(`aitf_role_${uid}`, role);
}

// ---- Search History ----

const MAX_HISTORY = 15;

function encodeKey(str) {
  return str.replace(/[.#$\[\]\/]/g, '_');
}

export async function saveSearchHistory(uid, queryText) {
  try {
    const histRef = ref(rtdb, `users/${uid}/searchHistory`);
    const snap = await get(histRef);
    const entries = snap.exists() ? snap.val() : {};

    // Deduplicate: remove existing entry with same query
    for (const [key, val] of Object.entries(entries)) {
      if (val.query === queryText) {
        await remove(ref(rtdb, `users/${uid}/searchHistory/${key}`));
        delete entries[key];
      }
    }

    // Trim to MAX_HISTORY - 1 (making room for new one)
    const sorted = Object.entries(entries).sort((a, b) => a[1].timestamp - b[1].timestamp);
    while (sorted.length >= MAX_HISTORY) {
      const [oldKey] = sorted.shift();
      await remove(ref(rtdb, `users/${uid}/searchHistory/${oldKey}`));
    }

    await push(ref(rtdb, `users/${uid}/searchHistory`), {
      query: queryText,
      timestamp: Date.now(),
    });
  } catch {
    // Fallback: store in localStorage
    const key = `aitf_history_${uid}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = stored.filter(h => h.query !== queryText);
    filtered.push({ query: queryText, timestamp: Date.now() });
    while (filtered.length > MAX_HISTORY) filtered.shift();
    localStorage.setItem(key, JSON.stringify(filtered));
  }
}

export async function getSearchHistory(uid) {
  try {
    const snap = await get(ref(rtdb, `users/${uid}/searchHistory`));
    if (!snap.exists()) return [];
    const entries = Object.values(snap.val());
    return entries.sort((a, b) => b.timestamp - a.timestamp).map(e => e.query);
  } catch {
    const key = `aitf_history_${uid}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return stored.sort((a, b) => b.timestamp - a.timestamp).map(e => e.query);
  }
}

// ---- Bookmarks ----

export async function saveBookmark(uid, tool) {
  const encoded = encodeKey(tool.name);
  try {
    await set(ref(rtdb, `users/${uid}/bookmarks/${encoded}`), {
      name: tool.name,
      url: tool.url,
      rating: tool.rating || 0,
      ratingSource: tool.ratingSource || '',
      pricing: tool.pricing || 'Freemium',
      bestFor: tool.bestFor || '',
      savedAt: Date.now(),
    });
  } catch {
    const key = `aitf_bookmarks_${uid}`;
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    stored[encoded] = { ...tool, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(stored));
  }
}

export async function removeBookmark(uid, toolName) {
  const encoded = encodeKey(toolName);
  try {
    await remove(ref(rtdb, `users/${uid}/bookmarks/${encoded}`));
  } catch {
    const key = `aitf_bookmarks_${uid}`;
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    delete stored[encoded];
    localStorage.setItem(key, JSON.stringify(stored));
  }
}

export async function getBookmarks(uid) {
  try {
    const snap = await get(ref(rtdb, `users/${uid}/bookmarks`));
    if (!snap.exists()) return [];
    const obj = snap.val();
    return Object.values(obj).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    const key = `aitf_bookmarks_${uid}`;
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.values(stored).sort((a, b) => b.savedAt - a.savedAt);
  }
}

// ---- Trending ----

export async function trackSearch(searchQuery, category) {
  try {
    const cat = category || 'General';
    await update(ref(rtdb, `trending/categories/${encodeKey(cat)}`), {
      name: cat,
      count: increment(1),
      lastUpdated: Date.now(),
    });
    const encoded = encodeKey(searchQuery.slice(0, 80));
    await update(ref(rtdb, `trending/queries/${encoded}`), {
      query: searchQuery.slice(0, 80),
      count: increment(1),
      lastSearched: Date.now(),
    });
  } catch {
    // trending is best-effort, don't break the app
  }
}

export async function getTrending() {
  try {
    const catSnap = await get(ref(rtdb, 'trending/categories'));
    const querySnap = await get(ref(rtdb, 'trending/queries'));
    const categories = catSnap.exists()
      ? Object.values(catSnap.val()).sort((a, b) => b.count - a.count)
      : [];
    const queries = querySnap.exists()
      ? Object.values(querySnap.val()).sort((a, b) => b.count - a.count).slice(0, 10)
      : [];
    return { categories, queries };
  } catch {
    return { categories: [], queries: [] };
  }
}
