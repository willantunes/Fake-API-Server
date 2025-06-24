import type { Context } from "hono/mod.ts";
import { getCookies } from "std/http/cookie.ts";
import { config } from "../config.ts";

const CENTRAL_AUTH_URL = config.authGateway.url;

export async function proxyIntrospectController(c: Context) {
  console.log('[Proxy-introspect] Extracting session token from cookies');
  const cookies = getCookies(c.req.raw.headers);
  const token = cookies.session;
  console.log('[Proxy-introspect] session token=', token ? token.slice(0,8)+'...' : 'none');
  // Forward as Bearer token to central auth gateway
  const gatewayRes = await fetch(`${CENTRAL_AUTH_URL}/api/introspect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await gatewayRes.json();
  console.log('[Proxy-introspect] gateway status=', gatewayRes.status, 'body=', data);
  return c.json(data, { status: gatewayRes.status });
} 