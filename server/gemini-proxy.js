import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

// Use Gemini 2.0 Flash — cheaper, no thinking tokens, sufficient for structured JSON tasks
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let authClient = null;

function getAuthClient() {
  if (authClient) return authClient;

  const keyPath = resolve(process.cwd(), 'service-account.json');
  const keyData = JSON.parse(readFileSync(keyPath, 'utf8'));

  const auth = new GoogleAuth({
    credentials: keyData,
    scopes: ['https://www.googleapis.com/auth/generative-language'],
  });

  authClient = auth;
  return auth;
}

// Server-side response cache — avoids duplicate API calls for identical prompts
const responseCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 200;

function getCacheKey(body) {
  return createHash('md5').update(body).digest('hex');
}

function pruneCache() {
  if (responseCache.size <= MAX_CACHE_SIZE) return;
  const entries = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  for (const [key] of toRemove) responseCache.delete(key);
}

export function geminiProxyPlugin() {
  return {
    name: 'gemini-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Read request body
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();

        // Check server-side cache
        const cacheKey = getCacheKey(body);
        const cached = responseCache.get(cacheKey);
        if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Cache': 'HIT',
          });
          res.end(cached.data);
          return;
        }

        try {
          const auth = getAuthClient();
          const client = await auth.getClient();
          const token = await client.getAccessToken();

          const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token.token}`,
            },
            body,
          });

          const data = await response.text();

          // Cache successful responses
          if (response.status === 200) {
            responseCache.set(cacheKey, { data, ts: Date.now() });
            pruneCache();
          }

          res.writeHead(response.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Cache': 'MISS',
          });
          res.end(data);
        } catch (err) {
          console.error('[Gemini Proxy] Error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}
