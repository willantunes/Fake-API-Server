# Cross-Origin API Authentication Bypass

## Problem Solved

Fixed the issue where API calls from external domains (like Postman, third-party applications, or other websites) were still requiring authentication when they should be publicly accessible.

## Overview

The system now supports **automatic authentication bypass** for cross-origin API requests, allowing external applications to call your exposed APIs without requiring any authentication tokens.

## Key Features

### 1. **Cross-Origin Detection**
- Automatically detects when API calls come from different domains
- Compares `Origin` header with `Host` header
- Bypasses API authentication for cross-origin requests

### 2. **External Domain Bypass**
- Configurable trusted domains that don't require authentication
- Supports wildcard domain matching (`*.example.com`)
- Default configuration trusts all domains (`*`)

### 3. **Flexible Configuration**
```typescript
// src/config/auth.ts
api: {
  skipAuthForCrossOrigin: true,        // Skip auth for cross-origin requests
  skipAuthForExternalDomains: true,    // Skip auth for external domains
  trustedDomains: ['*']                // Trust all domains (or specify specific ones)
}
```

## How It Works

### Before (Problematic)
```
External Request → API Endpoint → API Authentication Check → ❌ 401 Unauthorized
```

### After (Fixed)
```
External Request → API Endpoint → Cross-Origin Check → ✅ Skip Auth → Success
```

## Configuration Options

### Trust All Domains (Default)
```typescript
api: {
  trustedDomains: ['*'] // Allow any external domain
}
```

### Trust Specific Domains
```typescript
api: {
  trustedDomains: [
    'postman.com',
    'your-app.com',
    '*.trusted-domain.com'
  ]
}
```

### Disable Cross-Origin Bypass
```typescript
api: {
  skipAuthForCrossOrigin: false,
  skipAuthForExternalDomains: false
}
```

## Detection Logic

The system uses multiple methods to detect external requests:

1. **Origin Header**: Compares request origin with host
2. **Referer Header**: Checks if request comes from external site
3. **Domain Matching**: Validates against trusted domain list

## Use Cases

### ✅ **Postman/Insomnia Testing**
- No need to configure authentication tokens
- Direct API testing without setup

### ✅ **Third-Party Integrations**
- External applications can consume APIs directly
- No authentication overhead for public APIs

### ✅ **JavaScript/AJAX Calls**
- Cross-origin web applications can call APIs
- No CORS authentication issues

### ✅ **Mobile Applications**
- Native mobile apps can call APIs without tokens
- Simplified integration for external developers

## Security Considerations

### UI Routes Still Protected
- Administrative interfaces remain protected by central Auth0
- Only API endpoints can bypass authentication
- Full separation between UI and API security

### Configurable Trust Levels
- Can restrict to specific domains if needed
- Wildcard support for domain families
- Easy to disable if not needed

### Internal Requests Still Validated
- Same-origin requests still follow API authentication rules
- Only external/cross-origin requests bypass auth
- Maintains security for internal API usage

## Logging

Monitor cross-origin authentication bypass with these log messages:

```
[API Auth] Skipping authentication for cross-origin/external request
[API Auth] Request URL=..., Auth type=bearer
```

## Examples

### Postman Request
```bash
# No authentication headers needed for cross-origin calls
curl https://mockapi.iliberty.com.br/api/rest/v1/wsemisdoctofunc
```

### JavaScript Cross-Origin
```javascript
// External website calling your API
fetch('https://mockapi.iliberty.com.br/api/data')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Mobile App Integration
```swift
// iOS app calling API without authentication
let url = URL(string: "https://mockapi.iliberty.com.br/api/users")!
URLSession.shared.dataTask(with: url) { data, response, error in
    // Handle response
}.resume()
```

## Migration

### Automatic
- Existing API configurations work unchanged
- Cross-origin bypass is automatically enabled
- No breaking changes to existing functionality

### Customization
If you need tighter security:

1. Edit `src/config/auth.ts`
2. Set `skipAuthForCrossOrigin: false`
3. Configure specific `trustedDomains`
4. Restart the application

## Benefits

1. **Simplified Integration**: External applications don't need authentication setup
2. **Better Testing**: Postman and similar tools work out of the box
3. **Wider Adoption**: Easier for third parties to consume your APIs
4. **Flexible Security**: Can be configured per deployment environment
5. **Maintained Protection**: UI screens remain fully protected

The system now correctly distinguishes between UI access (always protected) and API access (configurable per request origin). 