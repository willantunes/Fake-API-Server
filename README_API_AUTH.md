# API Gateway Authentication System

This document describes the dual authentication system implemented in the API Gateway, where UI screens are protected by central authentication while dynamic APIs use their own configured authentication methods.

## Overview

The system implements two distinct authentication strategies:

1. **Central Authentication**: Used for UI screens and administrative interfaces
2. **API-Specific Authentication**: Used for dynamically exposed APIs based on their individual configuration

## Architecture

### Central Authentication (UI Protection)

- **Purpose**: Protects administrative screens, API management interfaces, and traffic monitoring
- **Mechanism**: Auth0 integration through central authentication gateway
- **Scope**: All UI routes (`/mock-api/**`, `/traffic/**`, `/admin/**`, `/`)
- **Implementation**: `authIntrospectionMiddleware` validates tokens via central auth gateway

### API-Specific Authentication (Dynamic APIs)

- **Purpose**: Allows each API endpoint to define its own authentication requirements
- **Mechanism**: Configurable authentication types per API
- **Scope**: All dynamic API routes (`/api/**`)
- **Implementation**: `dynamicApiAuthMiddleware` validates based on API configuration

## Authentication Types for APIs

### 1. None (`none`)
No authentication required - open endpoint.

### 2. Bearer Token (`bearer`)
```
Authorization: Bearer <token>
```
- Configure: Set `auth.type = "bearer"` and `auth.token = "your-token"`

### 3. API Key (`api_key`)
Header-based:
```
X-API-Key: <api-key>
```
Query parameter-based:
```
GET /api/endpoint?api_key=<api-key>
```
- Configure: Set `auth.type = "api_key"`, `auth.apiKey = "your-key"`
- Optional: `auth.headerName` (default: "X-API-Key"), `auth.apiKeyInQuery` (default: false)

### 4. Basic Authentication (`basic`)
```
Authorization: Basic <base64(username:password)>
```
- Configure: Set `auth.type = "basic"`, `auth.username`, `auth.password`

### 5. JWT Token (`jwt`)
```
Authorization: Bearer <jwt-token>
```
- Configure: Set `auth.type = "jwt"`, `auth.token = "jwt-token"`
- Note: Simplified validation - for full JWT validation, extend the middleware

### 6. Custom Header (`custom_header`)
```
X-Custom-Auth: <value>
```
- Configure: Set `auth.type = "custom_header"`, `auth.headerName`, `auth.headerValue`

### 7. OAuth/Client Credentials (`oauth`, `client_credentials`)
```
Authorization: Bearer <oauth-token>
```
- Configure: Set `auth.type = "oauth"`, `auth.token`, optional `auth.allowedScopes`

## Configuration

### Route-Based Configuration

Edit `src/config/auth.ts` to customize which routes use which authentication strategy:

```typescript
export const authConfig: AuthConfig = {
  central: {
    gatewayUrl: "http://localhost:8888",
    protectedRoutes: [
      "/mock-api/**",    // API management UI
      "/traffic/**",     // Traffic monitoring UI
      "/admin/**",       // Admin UI
      "/"               // Dashboard
    ],
    publicRoutes: [
      "/login",
      "/logout", 
      "/callback",
      "/health",
      "/static/**"
    ]
  },
  api: {
    patterns: [
      "/api/**"         // All dynamic APIs
    ],
    defaultBehavior: 'allow'
  },
  routing: {
    bypassCentralAuth: [
      "/api/**"         // APIs bypass central auth
    ],
    requireCentralAuth: [
      "/mock-api/**",   // UI always needs central auth
      "/traffic/**",
      "/admin/**"
    ]
  }
};
```

### API-Specific Configuration

Each API endpoint can be configured with its own authentication:

```typescript
// Example API configuration
const apiConfig = {
  id: "user-api",
  path: "/users",
  method: "GET",
  auth: {
    type: "api_key",
    apiKey: "secret-key-123",
    headerName: "X-API-Key",
    apiKeyInQuery: false
  },
  // ... other config
};
```

## Implementation Details

### Middleware Chain

1. **Routing Auth Middleware** (`routingAuthMiddleware`)
   - Determines authentication strategy based on route
   - Applies central auth only to UI routes
   - Bypasses central auth for API routes

2. **Require Auth Middleware** (`requireAuthMiddleware`)
   - Enforces authentication requirements
   - Redirects unauthenticated users to login for UI routes
   - Skips enforcement for API routes (handled separately)

3. **Dynamic API Auth Middleware** (`dynamicApiAuthMiddleware`)
   - Called only for API routes
   - Validates authentication based on API configuration
   - Returns 401 if authentication fails

### Request Flow

#### UI Route Request
```
Request → Routing Auth → Central Auth Check → Require Auth → Route Handler
```

#### API Route Request
```
Request → Routing Auth (bypass) → API Handler → Dynamic API Auth → Response
```

## Security Considerations

### UI Routes
- Always protected by central authentication
- Session-based authentication with Auth0 integration
- Automatic redirect to login for unauthenticated users
- HTMX-compatible authentication flow

### API Routes
- Authentication method defined per API
- No session requirements - stateless authentication
- Configurable authentication strength per endpoint
- Support for multiple authentication schemes

### Token Management
- Central auth uses session cookies and JWT tokens
- API auth uses various token types based on configuration
- No token sharing between central and API authentication

## Examples

### Creating an API with Bearer Token Auth

```typescript
const api = await repo.createApi({
  path: "/secure-data",
  method: "GET",
  auth: {
    type: "bearer",
    token: "my-secret-bearer-token"
  },
  response: {
    type: "json",
    data: { message: "Secure data" }
  }
});
```

### Making Authenticated API Requests

```bash
# Bearer token
curl -H "Authorization: Bearer my-secret-bearer-token" \
     http://localhost:8000/api/secure-data

# API Key in header
curl -H "X-API-Key: my-api-key" \
     http://localhost:8000/api/data

# API Key in query
curl "http://localhost:8000/api/data?api_key=my-api-key"

# Basic auth
curl -u username:password \
     http://localhost:8000/api/protected
```

## Monitoring and Logging

### Authentication Events
- Central auth events logged with `[Introspect]` prefix
- API auth events logged with `[API Auth]` prefix
- Routing decisions logged with `[Routing]` prefix

### Traffic Logs
- All API requests logged with authentication timing
- Auth failures recorded with error details
- Performance metrics include auth overhead

### Debugging
- Enable detailed logging by checking console output
- Authentication failures include specific error messages
- Timing information available for performance analysis

## Migration from Previous System

The new system maintains backward compatibility:

1. **Existing UI routes**: Continue using central authentication automatically
2. **Existing API configurations**: Honor existing authentication settings
3. **New APIs**: Can use any supported authentication type

No changes required to existing API configurations or client code.

## Benefits

1. **Separation of Concerns**: UI and API authentication are independent
2. **Flexibility**: Each API can define its own security requirements
3. **Scalability**: APIs can be consumed without central authentication overhead
4. **Security**: UI remains protected while APIs are configurable
5. **Compliance**: Different authentication strengths for different data sensitivity levels 