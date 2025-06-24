# Authentication Architecture - Clean Separation of API and UI Authentication

This document describes the robust authentication architecture implemented to ensure proper separation between API authentication (which returns HTTP errors) and UI authentication (which redirects to login screens).

## Architecture Overview

The system implements a **dual authentication strategy** with strict separation of concerns:

### 🔒 **UI Authentication (Pages/Screens)**
- **Purpose**: Protects administrative interfaces, dashboards, and management screens
- **Mechanism**: Central authentication via Auth0 integration
- **Behavior**: Redirects unauthenticated users to login screens
- **Scope**: `/mock-api/**`, `/traffic/**`, `/admin/**`, `/`

### 🔑 **API Authentication (Dynamic Endpoints)**
- **Purpose**: Protects individual API endpoints with configurable authentication
- **Mechanism**: Dynamic authentication based on each API's configuration
- **Behavior**: Returns HTTP 401/403 errors for authentication failures
- **Scope**: `/api/**`, `/rest/api/**`

## Key Principles

### 1. **Strict Route Separation**
- API routes NEVER trigger login redirects
- UI routes NEVER return plain HTTP errors without redirects
- Each route type has dedicated authentication flows

### 2. **Clean Architecture**
- Authentication logic is encapsulated in dedicated services
- Middleware follows single responsibility principle
- Clear separation of authentication concerns

### 3. **Security-First Design**
- APIs use stateless authentication (no sessions)
- UI uses session-based authentication
- No cross-contamination between authentication methods

## Implementation Details

### Authentication Service Layer

#### `ApiAuthService`
```typescript
class ApiAuthService {
  async authenticate(context: Context, api: MockApi): Promise<ApiAuthResult>
}
```

**Responsibilities:**
- Validates API-specific authentication methods
- Returns structured results (success/error/statusCode/timing)
- Supports multiple authentication types (Bearer, API Key, Basic, JWT, OAuth, etc.)

### Middleware Layer

#### 1. `apiRouteProtectionMiddleware`
**Purpose**: Prevents any accidental redirects on API endpoints
```typescript
// Safety net - overrides redirect behavior for API routes
c.redirect = (url: string) => c.json({ error: 'Unauthorized' }, { status: 401 })
```

#### 2. `routingAuthMiddleware`
**Purpose**: Determines authentication strategy based on route
```typescript
if (shouldBypassCentralAuth(path)) {
  c.set('isApiRoute', true)  // Mark as API route
} else {
  c.set('isApiRoute', false) // Mark as UI route
  await authIntrospectionMiddleware(c, next)
}
```

#### 3. `requireAuthMiddleware`
**Purpose**: Enforces authentication requirements with proper behavior
```typescript
if (isApiRoute) {
  // Skip central auth - APIs handle their own
  await next()
} else {
  // Check authentication and redirect if needed
  if (!isAuthenticated) return c.redirect('/login')
}
```

#### 4. `dynamicApiAuthMiddleware`
**Purpose**: Handles API-specific authentication
```typescript
const authService = new ApiAuthService()
const result = await authService.authenticate(c, api)
if (!result.success) {
  return c.json({ error: 'Unauthorized' }, { status: result.statusCode })
}
```

## Authentication Flow Diagrams

### UI Route Authentication Flow
```
Request → API Protection → Routing Auth → Central Auth → Require Auth → UI Handler
                ↓              ↓           ↓            ↓
           Skip if UI      Apply central  Introspect   Redirect if
                          auth for UI     token        unauthenticated
```

### API Route Authentication Flow
```
Request → API Protection → Routing Auth → API Handler → Dynamic API Auth → Response
                ↓              ↓             ↓              ↓
         Override redirect   Skip central   Find API      Validate per
         for API routes      auth for APIs  config        API config
```

## Supported API Authentication Types

### 1. **None** (`auth.type: 'none'`)
```javascript
// No authentication required
fetch('/api/public-endpoint')
```

### 2. **Bearer Token** (`auth.type: 'bearer'`)
```javascript
fetch('/api/secure-endpoint', {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
})
```

### 3. **API Key** (`auth.type: 'api_key'`)
```javascript
// Header-based
fetch('/api/secure-endpoint', {
  headers: {
    'X-API-Key': 'your-api-key'
  }
})

// Query parameter-based
fetch('/api/secure-endpoint?api_key=your-api-key')
```

### 4. **Basic Authentication** (`auth.type: 'basic'`)
```javascript
fetch('/api/secure-endpoint', {
  headers: {
    'Authorization': 'Basic ' + btoa('username:password')
  }
})
```

### 5. **JWT Token** (`auth.type: 'jwt'`)
```javascript
fetch('/api/secure-endpoint', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
})
```

### 6. **Custom Header** (`auth.type: 'custom_header'`)
```javascript
fetch('/api/secure-endpoint', {
  headers: {
    'X-Custom-Auth': 'your-custom-value'
  }
})
```

### 7. **OAuth/Client Credentials** (`auth.type: 'oauth'`)
```javascript
fetch('/api/secure-endpoint', {
  headers: {
    'Authorization': 'Bearer your-oauth-token'
  }
})
```

## Configuration Examples

### Creating an API with Authentication
```typescript
const apiConfig = {
  path: "/users",
  method: "GET",
  auth: {
    type: "api_key",
    apiKey: "secret-key-123",
    headerName: "X-API-Key",
    apiKeyInQuery: false
  },
  response: {
    type: "json",
    data: { users: [] }
  }
}
```

### Route Configuration
```typescript
// src/config/auth.ts
export const authConfig = {
  central: {
    protectedRoutes: ["/mock-api/**", "/traffic/**", "/admin/**"],
    publicRoutes: ["/login", "/static/**"]
  },
  api: {
    patterns: ["/api/**", "/rest/api/**"],
    defaultBehavior: 'allow'
  },
  routing: {
    bypassCentralAuth: ["/api/**", "/rest/api/**"],
    requireCentralAuth: ["/mock-api/**", "/traffic/**"]
  }
}
```

## Error Handling

### API Authentication Errors
```json
{
  "error": "Unauthorized",
  "message": "Bearer token required in Authorization header",
  "timestamp": "2023-10-01T12:00:00Z",
  "path": "/api/secure-endpoint",
  "method": "POST"
}
```

### UI Authentication Errors
- **HTMX Requests**: `HX-Redirect` header to login page
- **Regular Requests**: HTTP 302 redirect to login page

## Security Considerations

### API Security
- ✅ Stateless authentication (no server-side sessions)
- ✅ Configurable authentication per endpoint
- ✅ Support for multiple authentication schemes
- ✅ Detailed error messages for debugging
- ✅ Request/response logging for audit trails

### UI Security
- ✅ Session-based authentication with Auth0
- ✅ Automatic token introspection
- ✅ Secure cookie handling
- ✅ HTMX-compatible authentication flow

### General Security
- ✅ No authentication method cross-contamination
- ✅ Strict route-based access control
- ✅ Comprehensive logging and monitoring
- ✅ Protection against accidental redirects on APIs

## Testing Authentication

### Testing API Endpoints
```bash
# Test Bearer token authentication
curl -H "Authorization: Bearer valid-token" \
     http://localhost:8000/api/secure-endpoint

# Test API key authentication  
curl -H "X-API-Key: valid-api-key" \
     http://localhost:8000/api/secure-endpoint

# Test unauthenticated request (should return 401)
curl http://localhost:8000/api/secure-endpoint
```

### Testing UI Routes
```bash
# Test authenticated access (should redirect to login)
curl -i http://localhost:8000/mock-api

# Test with valid session (should return 200)
curl -i -H "Cookie: session=valid-session-token" \
     http://localhost:8000/mock-api
```

## Monitoring and Debugging

### Log Patterns
- `[API Protection]`: API route protection middleware
- `[Routing]`: Route-based authentication decisions
- `[Auth]`: UI authentication checks
- `[API Auth Service]`: API authentication attempts
- `[Introspect]`: Central authentication introspection

### Common Issues

#### Issue: API returning login redirects
**Solution**: Check that route is properly configured in `bypassCentralAuth`

#### Issue: UI not redirecting to login
**Solution**: Verify route is in `requireCentralAuth` configuration

#### Issue: Authentication not working
**Solution**: Check API configuration and ensure proper headers/tokens

## Conclusion

This architecture ensures:
- 🔒 **Complete separation** of API and UI authentication
- 🚫 **No accidental redirects** on API endpoints
- ✅ **Proper HTTP errors** for API authentication failures
- 🔄 **Seamless login flow** for UI authentication
- 🏗️ **Clean, maintainable code** following SOLID principles 