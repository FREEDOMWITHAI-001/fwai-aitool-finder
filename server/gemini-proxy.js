import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
          res.writeHead(response.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
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
