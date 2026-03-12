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

const INITIAL_CREDITS = 1000;

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
  const local = getLocalCredits(uid);
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
    const firebaseCredits = snap.val() ?? 0;
    // Use whichever is lower (more deductions applied) to avoid resetting
    const resolved = Math.min(local, firebaseCredits);
    setLocalCredits(uid, resolved);
    // If localStorage had more deductions, push that to Firebase
    if (local < firebaseCredits) {
      update(ref(rtdb, `users/${uid}`), { credits: resolved }).catch(() => {});
    }
    return resolved;
  } catch {
    return local;
  }
}

// One-time top-up for existing users — call only on login
export async function topUpCreditsOnce(uid) {
  const topUpKey = `aitf_topup_v3_${uid}`;
  if (localStorage.getItem(topUpKey)) return null; // already done
  try {
    await update(ref(rtdb, `users/${uid}`), { credits: INITIAL_CREDITS });
    setLocalCredits(uid, INITIAL_CREDITS);
    localStorage.setItem(topUpKey, 'done');
    return INITIAL_CREDITS;
  } catch {
    setLocalCredits(uid, INITIAL_CREDITS);
    localStorage.setItem(topUpKey, 'done');
    return INITIAL_CREDITS;
  }
}

export async function useCredit(uid) {
  // Deduct locally first (source of truth for UI)
  const current = getLocalCredits(uid);
  if (current <= 0) return 0;
  const newBalance = current - 1;
  setLocalCredits(uid, newBalance);

  // Sync to Firebase atomically — don't read back (avoids overwriting localStorage)
  try {
    await update(ref(rtdb, `users/${uid}`), { credits: increment(-1) });
  } catch {
    // Firebase failed — localStorage already has the correct value
  }
  return newBalance;
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
  // Always save to localStorage first
  const localKey = `aitf_history_${uid}`;
  const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
  const filtered = stored.filter(h => (h.query || h) !== queryText);
  filtered.push({ query: queryText, timestamp: Date.now() });
  while (filtered.length > MAX_HISTORY) filtered.shift();
  localStorage.setItem(localKey, JSON.stringify(filtered));

  // Also save to Firebase
  try {
    const histRef = ref(rtdb, `users/${uid}/searchHistory`);
    const snap = await get(histRef);
    const entries = snap.exists() ? snap.val() : {};

    for (const [key, val] of Object.entries(entries)) {
      if (val.query === queryText) {
        await remove(ref(rtdb, `users/${uid}/searchHistory/${key}`));
      }
    }

    const sorted = Object.entries(entries)
      .filter(([, val]) => val.query !== queryText)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    while (sorted.length >= MAX_HISTORY) {
      const [oldKey] = sorted.shift();
      await remove(ref(rtdb, `users/${uid}/searchHistory/${oldKey}`));
    }

    await push(ref(rtdb, `users/${uid}/searchHistory`), {
      query: queryText,
      timestamp: Date.now(),
    });
  } catch {
    // localStorage already has it
  }
}

export async function getSearchHistory(uid) {
  const localKey = `aitf_history_${uid}`;
  try {
    const snap = await get(ref(rtdb, `users/${uid}/searchHistory`));
    if (!snap.exists()) {
      // Firebase empty — use localStorage
      const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
      return stored.sort((a, b) => b.timestamp - a.timestamp).map(e => e.query || e);
    }
    const entries = Object.values(snap.val());
    // Sync Firebase data to localStorage
    localStorage.setItem(localKey, JSON.stringify(entries));
    return entries.sort((a, b) => b.timestamp - a.timestamp).map(e => e.query);
  } catch {
    const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
    return stored.sort((a, b) => b.timestamp - a.timestamp).map(e => e.query || e);
  }
}

// ---- Bookmarks ----

export async function saveBookmark(uid, tool) {
  const encoded = encodeKey(tool.name);
  const bookmarkData = {
    name: tool.name,
    url: tool.url,
    rating: tool.rating || 0,
    ratingSource: tool.ratingSource || '',
    pricing: tool.pricing || 'Freemium',
    bestFor: tool.bestFor || '',
    savedAt: Date.now(),
  };

  // Always save to localStorage for persistence
  const key = `aitf_bookmarks_${uid}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  stored[encoded] = bookmarkData;
  localStorage.setItem(key, JSON.stringify(stored));

  // Also save to Firebase
  try {
    await set(ref(rtdb, `users/${uid}/bookmarks/${encoded}`), bookmarkData);
  } catch {
    // localStorage already has it
  }
}

export async function removeBookmark(uid, toolName) {
  const encoded = encodeKey(toolName);

  // Always remove from localStorage
  const key = `aitf_bookmarks_${uid}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  delete stored[encoded];
  localStorage.setItem(key, JSON.stringify(stored));

  // Also remove from Firebase
  try {
    await remove(ref(rtdb, `users/${uid}/bookmarks/${encoded}`));
  } catch {
    // localStorage already updated
  }
}

export async function getBookmarks(uid) {
  const key = `aitf_bookmarks_${uid}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  try {
    const snap = await get(ref(rtdb, `users/${uid}/bookmarks`));
    if (!snap.exists()) {
      // Firebase has none — use localStorage and sync back to Firebase
      if (Object.keys(stored).length > 0) {
        set(ref(rtdb, `users/${uid}/bookmarks`), stored).catch(() => {});
      }
      return Object.values(stored).sort((a, b) => b.savedAt - a.savedAt);
    }
    const firebaseData = snap.val();
    // Merge: combine Firebase + localStorage so no bookmarks are lost
    const merged = { ...stored, ...firebaseData };
    // Sync merged data back to both stores
    localStorage.setItem(key, JSON.stringify(merged));
    if (Object.keys(stored).length > 0 && Object.keys(stored).some(k => !firebaseData[k])) {
      set(ref(rtdb, `users/${uid}/bookmarks`), merged).catch(() => {});
    }
    return Object.values(merged).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
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
