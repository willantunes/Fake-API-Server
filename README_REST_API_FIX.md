# REST API Route Fix

## Problem
External applications were unable to call API endpoints with paths like `/rest/api/v1/wsemisdoctofunc` because the system was treating these routes as UI routes requiring central authentication, instead of API routes that should bypass central auth.

## Root Cause
The authentication configuration and route handlers only supported `/api/*` patterns but not `/rest/api/*` patterns. When a request came to `/rest/api/v1/wsemisdoctofunc`, it was:

1. **Treated as central auth route**: The routing middleware classified it as requiring central authentication
2. **Missing route handler**: No handler existed for `/rest/api/*` paths
3. **Cross-origin bypass not working**: Since it wasn't classified as an API route, cross-origin bypass didn't apply

## Solution
Extended the authentication system to support both `/api/*` and `/rest/api/*` patterns:

### 1. Updated Authentication Configuration (`src/config/auth.ts`)
```typescript
// Added /rest/api/** to API patterns
api: {
  patterns: [
    "/api/**",
    "/rest/api/**"  // <- Added this
  ],
  // ... rest of config
},

// Added /rest/api/** to bypass central auth
routing: {
  bypassCentralAuth: [
    "/api/**",
    "/rest/api/**"  // <- Added this
  ],
  // ... rest of config
}
```

### 2. Added Route Handler (`src/main.tsx`)
Created a reusable `handleDynamicApiEndpoint` function and added a new route handler:

```typescript
// New handler for /rest/api/* routes
app.all("/rest/api/*", async (c) => {
  return await handleDynamicApiEndpoint(c, "/rest/api");
});
```

### 3. Updated Layout Middleware
Added `/rest/api/` to the list of paths that bypass the layout middleware:

```typescript
if (
  path.startsWith('/api/') ||
  path.startsWith('/rest/api/') ||  // <- Added this
  // ... other conditions
) {
  await next();
}
```

## Behavior After Fix
Now both path patterns work identically:

- **`/api/auth/accesstoken`** ✅ Bypasses central auth, uses cross-origin bypass
- **`/rest/api/v1/wsemisdoctofunc`** ✅ Bypasses central auth, uses cross-origin bypass

## Testing
External applications can now successfully call endpoints like:
- `POST /rest/api/v1/wsemisdoctofunc`
- `GET /rest/api/v2/someendpoint`
- Any `/rest/api/*` pattern

The system will:
1. Skip central authentication
2. Apply cross-origin bypass (if configured)
3. Use the API's own authentication settings
4. Return proper responses without redirects

## Log Output (Success)
```
[Routing] Path: /rest/api/v1/wsemisdoctofunc, Strategy: api
[Routing] Route bypasses central auth: /rest/api/v1/wsemisdoctofunc
[API Auth] Skipping authentication for cross-origin/external request
```

vs. Previous (Failure):
```
[Routing] Path: /rest/api/v1/wsemisdoctofunc, Strategy: central
[Routing] Applying central auth for: /rest/api/v1/wsemisdoctofunc
[Auth] Unauthenticated access to protected route: /rest/api/v1/wsemisdoctofunc
``` 