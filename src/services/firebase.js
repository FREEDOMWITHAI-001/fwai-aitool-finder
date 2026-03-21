import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment as fsIncrement,
  collection,
  addDoc,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
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
const db = getFirestore(app);
const rtdb = getDatabase(app);

const INITIAL_CREDITS = 1000;

// ---- localStorage helpers ----

function setLocalCredits(uid, value) {
  localStorage.setItem(`aitf_credits_${uid}`, String(value));
}

function getLocalCredits(uid) {
  const v = localStorage.getItem(`aitf_credits_${uid}`);
  return v !== null ? parseInt(v, 10) : null;
}

// ---- Auth helpers ----

export async function signUp(email, password, role = '') {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // Write to Firestore (the actual database that works)
  try {
    await setDoc(doc(db, 'users', uid), {
      email,
      credits: INITIAL_CREDITS,
      role,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Firestore signUp write failed:', e);
  }

  setLocalCredits(uid, INITIAL_CREDITS);
  if (role) localStorage.setItem(`aitf_role_${uid}`, role);
  return cred.user;
}

export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ---- Credits (Firestore = source of truth, localStorage = fast cache) ----

export async function getCredits(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));

    if (!snap.exists()) {
      // User doc doesn't exist in Firestore — create it with 1000 credits
      // This handles existing auth users who never had a Firestore doc
      await setDoc(doc(db, 'users', uid), {
        credits: INITIAL_CREDITS,
        createdAt: new Date().toISOString(),
      });
      setLocalCredits(uid, INITIAL_CREDITS);
      return INITIAL_CREDITS;
    }

    const data = snap.data();
    const credits = typeof data.credits === 'number' ? data.credits : INITIAL_CREDITS;

    // If credits field was missing/corrupted, fix it in Firestore
    if (typeof data.credits !== 'number') {
      await updateDoc(doc(db, 'users', uid), { credits: INITIAL_CREDITS });
    }

    setLocalCredits(uid, credits);
    return credits;
  } catch (e) {
    console.error('getCredits Firestore failed:', e);
    // Firestore failed — use localStorage cache
    const local = getLocalCredits(uid);
    return local !== null ? local : INITIAL_CREDITS;
  }
}

export async function useCredit(uid, amount = 1) {
  // Update localStorage immediately for instant UI
  const cached = getLocalCredits(uid);
  const current = cached !== null ? cached : 0;
  if (current < amount) return 0;
  const newLocal = current - amount;
  setLocalCredits(uid, newLocal);

  // Deduct atomically in Firestore
  try {
    await updateDoc(doc(db, 'users', uid), { credits: fsIncrement(-amount) });
    // Read back the server value (true cross-device balance)
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const serverCredits = snap.data().credits;
      if (typeof serverCredits === 'number') {
        setLocalCredits(uid, serverCredits);
        return serverCredits;
      }
    }
  } catch (e) {
    console.error('useCredit Firestore failed:', e);
  }

  return newLocal;
}

export async function hasCredits(uid) {
  const c = await getCredits(uid);
  return c > 0;
}

// ---- Tool Usage Logging (Firestore → toolUsage collection) ----

export async function logToolUsage(userId, toolId, action) {
  try {
    await addDoc(collection(db, 'toolUsage'), {
      userId,
      toolId,
      action,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log usage:', err);
  }
}

// ---- Role / Profile (Firestore) ----

export async function getUserRole(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const role = snap.exists() ? (snap.data().role || '') : '';
    if (role) localStorage.setItem(`aitf_role_${uid}`, role);
    return role;
  } catch {
    return localStorage.getItem(`aitf_role_${uid}`) || '';
  }
}

export async function updateUserRole(uid, role) {
  try {
    await updateDoc(doc(db, 'users', uid), { role });
  } catch { /* fallback */ }
  localStorage.setItem(`aitf_role_${uid}`, role);
}

// ---- Search History (localStorage + RTDB best-effort) ----

const MAX_HISTORY = 15;

function encodeKey(str) {
  return str.replace(/[.#$\[\]\/]/g, '_');
}

export async function saveSearchHistory(uid, queryText) {
  const lk = `aitf_history_${uid}`;
  const stored = JSON.parse(localStorage.getItem(lk) || '[]');
  const filtered = stored.filter(h => (h.query || h) !== queryText);
  filtered.push({ query: queryText, timestamp: Date.now() });
  while (filtered.length > MAX_HISTORY) filtered.shift();
  localStorage.setItem(lk, JSON.stringify(filtered));

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
  } catch { /* localStorage already has it */ }
}

export async function getSearchHistory(uid) {
  const lk = `aitf_history_${uid}`;
  const stored = JSON.parse(localStorage.getItem(lk) || '[]');
  const storedSorted = stored
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .map(e => e.query || e);

  try {
    const snap = await get(ref(rtdb, `users/${uid}/searchHistory`));
    if (!snap.exists()) {
      return storedSorted;
    }
    const snapVal = snap.val();
    if (!snapVal || typeof snapVal !== 'object') return storedSorted;

    const fbEntries = Object.values(snapVal).filter(e => e && e.query);
    const seen = new Set();
    const merged = [];
    for (const entry of [...fbEntries, ...stored]) {
      const q = entry.query || entry;
      if (q && !seen.has(q)) {
        seen.add(q);
        merged.push(typeof entry === 'string' ? { query: entry, timestamp: 0 } : entry);
      }
    }
    merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const trimmed = merged.slice(0, MAX_HISTORY);

    // Only write back to localStorage if the merged result is non-empty,
    // so a Firebase issue never destroys good local data.
    if (trimmed.length > 0) {
      localStorage.setItem(lk, JSON.stringify(trimmed));
    }
    return trimmed.length > 0 ? trimmed.map(e => e.query || e) : storedSorted;
  } catch {
    return storedSorted;
  }
}

// ---- Bookmarks (localStorage + RTDB best-effort) ----

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

  const key = `aitf_bookmarks_${uid}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  stored[encoded] = bookmarkData;
  localStorage.setItem(key, JSON.stringify(stored));

  try {
    await set(ref(rtdb, `users/${uid}/bookmarks/${encoded}`), bookmarkData);
  } catch { /* localStorage has it */ }
}

export async function removeBookmark(uid, toolName) {
  const encoded = encodeKey(toolName);
  const key = `aitf_bookmarks_${uid}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  delete stored[encoded];
  localStorage.setItem(key, JSON.stringify(stored));

  try {
    await remove(ref(rtdb, `users/${uid}/bookmarks/${encoded}`));
  } catch { /* localStorage updated */ }
}

export async function getBookmarks(uid) {
  const key = `aitf_bookmarks_${uid}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  try {
    const snap = await get(ref(rtdb, `users/${uid}/bookmarks`));
    if (!snap.exists()) {
      return Object.values(stored).sort((a, b) => b.savedAt - a.savedAt);
    }
    const fbData = snap.val();
    const merged = { ...stored, ...fbData };
    localStorage.setItem(key, JSON.stringify(merged));
    return Object.values(merged).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return Object.values(stored).sort((a, b) => b.savedAt - a.savedAt);
  }
}

// ---- Trending (RTDB best-effort) ----

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
  } catch { /* best-effort */ }
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
