import { serveStatic } from "hono/middleware.ts";
import type { Context, Next } from "hono/mod.ts";

// Static file serving middleware
export const staticFileMiddleware = serveStatic({ root: "./" });

// Logger for static file requests
export async function staticLoggerMiddleware(c: Context, next: Next) {
  console.log(`[Static] ${c.req.method} ${new URL(c.req.url).pathname}`);
  await next();
} 