import type { Context, Next } from "hono/mod.ts";
import { config } from "../config.ts";
import type { MockApi, AuthConfig } from "../types/MockApi.ts";
import { ApiAuthService, type ApiAuthResult } from "../services/apiAuthService.ts";

const CENTRAL_AUTH_URL = config.authGateway.url;

/**
 * Middleware for central auth introspection (for UI screens)
 */
export async function authIntrospectionMiddleware(c: Context, next: Next) {
  console.log(`[Introspect] Request URL=${c.req.url}, Authorization=${c.req.header('Authorization')}, Cookie=${c.req.header('Cookie')}`);
  let token: string | null = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  } else {
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(cookieHeader.split(';').map(pair => {
        const [k, v] = pair.trim().split('=');
        return [k, v];
      }));
      token = cookies['session'] || cookies['access_token'] || null;
    }
  }
  console.log(`[Introspect] Extracted token=${token ? token.slice(0,8)+"..." : 'none'}`);
  if (token) {
    try {
      const introspectRes = await fetch(`${CENTRAL_AUTH_URL}/api/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`[Introspect] /api/introspect HTTP status=${introspectRes.status}`);
      if (introspectRes.ok) {
        const data = await introspectRes.json();
        console.log('[Introspect] Response data:', data);
        if (data.active) {
          console.log('[Introspect] Token active, user=', data.user);
          c.set('user', data.user);
          c.set('isAuthenticated', true);
        } else {
          console.log('[Introspect] Token inactive');
          c.set('isAuthenticated', false);
        }
      } else {
        console.log('[Introspect] /api/introspect returned non-OK');
        c.set('isAuthenticated', false);
      }
    } catch (e) {
      console.error('[Introspect] Error calling /api/introspect:', e);
      c.set('isAuthenticated', false);
    }
  } else {
    console.log('[Introspect] No token found, marking unauthenticated');
    c.set('isAuthenticated', false);
  }
  await next();
}

/**
 * Authentication middleware for dynamic APIs
 * Uses the individual API's authentication configuration instead of central auth
 * Returns HTTP errors instead of redirecting to login screens
 */
export async function dynamicApiAuthMiddleware(c: Context, api: MockApi): Promise<ApiAuthResult> {
  const authService = new ApiAuthService();
  const result = await authService.authenticate(c, api);
  
  // Set context variables for compatibility
  c.set('apiAuthenticated', result.success);
  c.set('authTime', result.authTime);
  
  if (!result.success) {
    c.set('authError', result.error);
  }
  
  return result;
}

 