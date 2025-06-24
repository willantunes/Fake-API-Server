import type { Context, Next } from "hono/mod.ts";
import { authIntrospectionMiddleware } from "./auth.ts";
import { shouldBypassCentralAuth, requiresCentralAuth, getAuthStrategy } from "../config/auth.ts";

/**
 * Routing middleware that applies central authentication only to UI routes
 * API routes (/api/*) bypass central auth and use their own authentication
 * This middleware ensures strict separation of concerns:
 * - UI routes: Central authentication with login redirects
 * - API routes: Dynamic authentication with HTTP errors
 */
export async function routingAuthMiddleware(c: Context, next: Next) {
  const path = c.req.path;
  const authStrategy = getAuthStrategy(path);
  
  console.log(`[Routing] Path: ${path}, Strategy: ${authStrategy}`);
  
  // Skip central authentication for API routes and public routes
  if (shouldBypassCentralAuth(path)) {
    console.log(`[Routing] Route bypasses central auth: ${path}`);
    // Mark that this is an API route for downstream middleware
    c.set('isApiRoute', true);
    await next();
    return;
  }
  
  // Apply central authentication for protected routes
  if (authStrategy === 'central') {
    console.log(`[Routing] Applying central auth for: ${path}`);
    // Mark that this is a UI route for downstream middleware
    c.set('isApiRoute', false);
    await authIntrospectionMiddleware(c, next);
    return;
  }
  
  // Public routes don't need authentication
  console.log(`[Routing] Public route, no auth required: ${path}`);
  c.set('isApiRoute', false);
  await next();
}

/**
 * Middleware to check if user is authenticated for protected UI routes
 * This middleware ensures that:
 * - API routes are never redirected to login screens
 * - UI routes get proper authentication handling
 */
export async function requireAuthMiddleware(c: Context, next: Next) {
  const path = c.req.path;
  const authStrategy = getAuthStrategy(path);
  const isApiRoute = c.get('isApiRoute') || false;
  
  // API routes handle their own authentication and should never be redirected
  if (authStrategy === 'api' || isApiRoute) {
    console.log(`[Auth] API route detected, skipping central auth check: ${path}`);
    await next();
    return;
  }
  
  // Skip auth check for public routes
  if (authStrategy === 'public') {
    await next();
    return;
  }
  
  // For central auth routes, check if user is authenticated
  if (authStrategy === 'central') {
    const isAuthenticated = c.get('isAuthenticated');
    
    if (!isAuthenticated) {
      console.log(`[Auth] Unauthenticated access to protected UI route: ${path}`);
      
      const returnTo = encodeURIComponent(path);
      const redirectUrl = `/login?return_to=${returnTo}`;
      
      // For HTMX requests, return redirect header
      if (c.req.header('HX-Request') === 'true') {
        c.header('HX-Redirect', redirectUrl);
        return c.text('Unauthorized', { status: 401 });
      }
      
      // For regular requests, redirect to login
      return c.redirect(redirectUrl);
    }
  }
  
  await next();
}

/**
 * Middleware to ensure API routes never get login redirects
 * This is a safety net to prevent any accidental redirects on API endpoints
 */
export async function apiRouteProtectionMiddleware(c: Context, next: Next) {
  const path = c.req.path;
  
  // Check if this is an API route pattern
  const isApiEndpoint = path.startsWith('/api/') || path.startsWith('/rest/api/');
  
  if (isApiEndpoint) {
    console.log(`[API Protection] Protecting API route from redirects: ${path}`);
    
    // Override any redirect behavior by intercepting the response
    const originalRedirect = c.redirect;
    c.redirect = (url: string, status?: number) => {
      console.log(`[API Protection] Blocked redirect attempt on API route ${path} to ${url}`);
      return c.json(
        { 
          error: 'Unauthorized', 
          message: 'API endpoints do not support redirects. Please provide proper authentication.',
          timestamp: new Date().toISOString(),
          path: path 
        }, 
        { status: 401 }
      );
    };
    
    // Also mark this as an API route
    c.set('isApiRoute', true);
  }
  
  await next();
} 