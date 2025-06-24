/**
 * Authentication configuration for the API Gateway
 * Defines which routes use central auth vs API-specific auth
 */

export interface AuthConfig {
  central: CentralAuthConfig;
  api: ApiAuthConfig;
  routing: RoutingConfig;
}

export interface CentralAuthConfig {
  /** Auth0 URL for central authentication */
  gatewayUrl: string;
  /** Routes that require central authentication */
  protectedRoutes: string[];
  /** Routes that are publicly accessible (no auth required) */
  publicRoutes: string[];
}

export interface ApiAuthConfig {
  /** Route patterns that use API-specific authentication */
  patterns: string[];
  /** Default authentication behavior for APIs */
  defaultBehavior: 'deny' | 'allow';
  /** Skip API authentication for cross-origin requests */
  skipAuthForCrossOrigin: boolean;
  /** Skip API authentication for external domains */
  skipAuthForExternalDomains: boolean;
  /** Trusted domains that don't require API authentication */
  trustedDomains: string[];
}

export interface RoutingConfig {
  /** Routes that bypass central auth completely */
  bypassCentralAuth: string[];
  /** Routes that always require central auth regardless of other settings */
  requireCentralAuth: string[];
}

/**
 * Default authentication configuration
 */
export const authConfig: AuthConfig = {
  central: {
    gatewayUrl: Deno.env.get("CENTRAL_AUTH_URL") || "http://localhost:8888",
    protectedRoutes: [
      "/mock-api/**",
      "/traffic/**",
      "/admin/**",
      "/"
    ],
    publicRoutes: [
      "/login",
      "/logout",
      "/callback",
      "/health",
      "/static/**",
      "/favicon.ico"
    ]
  },
  api: {
    // API routes that use their own authentication
    patterns: [
      "/api/**",
      "/rest/api/**"
    ],
    defaultBehavior: 'allow',
    // Skip API authentication for cross-origin requests
    skipAuthForCrossOrigin: true,
    // Skip API authentication for external domains  
    skipAuthForExternalDomains: true,
    // Trusted domains that don't require API authentication
    trustedDomains: ['*'] // Allow all domains
  },
  routing: {
    // Routes that completely bypass central authentication
    bypassCentralAuth: [
      "/api/**",
      "/rest/api/**"
    ],
    // Routes that must always use central authentication
    requireCentralAuth: [
      "/mock-api/**",
      "/traffic/**",
      "/admin/**"
    ]
  }
};

/**
 * Check if a route should bypass central authentication
 */
export function shouldBypassCentralAuth(path: string): boolean {
  return authConfig.routing.bypassCentralAuth.some(pattern => {
    if (pattern.endsWith('/**')) {
      const basePath = pattern.slice(0, -3);
      return path.startsWith(basePath);
    }
    return path === pattern;
  });
}

/**
 * Check if a route requires central authentication
 */
export function requiresCentralAuth(path: string): boolean {
  // First check if it should bypass central auth completely
  if (shouldBypassCentralAuth(path)) {
    return false;
  }
  
  // Check if it's in the public routes
  const isPublic = authConfig.central.publicRoutes.some(pattern => {
    if (pattern.endsWith('/**')) {
      const basePath = pattern.slice(0, -3);
      return path.startsWith(basePath);
    }
    return path === pattern;
  });
  
  if (isPublic) {
    return false;
  }
  
  // Check if it's explicitly required to use central auth
  const isRequired = authConfig.routing.requireCentralAuth.some(pattern => {
    if (pattern.endsWith('/**')) {
      const basePath = pattern.slice(0, -3);
      return path.startsWith(basePath);
    }
    return path === pattern;
  });
  
  return isRequired;
}

/**
 * Check if a route should use API-specific authentication
 */
export function usesApiAuth(path: string): boolean {
  return authConfig.api.patterns.some(pattern => {
    if (pattern.endsWith('/**')) {
      const basePath = pattern.slice(0, -3);
      return path.startsWith(basePath);
    }
    return path === pattern;
  });
}

/**
 * Check if API authentication should be skipped for cross-origin requests
 */
export function shouldSkipApiAuthForCrossOrigin(request: Request): boolean {
  if (!authConfig.api.skipAuthForCrossOrigin) {
    return false;
  }
  
  const origin = request.headers.get('Origin');
  const host = request.headers.get('Host');
  
  // If there's an Origin header and it's different from the host, it's cross-origin
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host !== host;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Check if API authentication should be skipped for external domains
 */
export function shouldSkipApiAuthForExternalDomain(request: Request): boolean {
  if (!authConfig.api.skipAuthForExternalDomains) {
    return false;
  }
  
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  
  // Check if origin or referer is from a trusted domain
  if (authConfig.api.trustedDomains.includes('*')) {
    return true; // Trust all domains
  }
  
  const checkDomain = origin || referer;
  if (checkDomain) {
    try {
      const url = new URL(checkDomain);
      return authConfig.api.trustedDomains.some(domain => {
        if (domain === '*') return true;
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return url.hostname.endsWith(baseDomain);
        }
        return url.hostname === domain;
      });
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Check if API authentication should be skipped
 */
export function shouldSkipApiAuth(request: Request): boolean {
  return shouldSkipApiAuthForCrossOrigin(request) || 
         shouldSkipApiAuthForExternalDomain(request);
}

/**
 * Get the authentication strategy for a given route
 */
export function getAuthStrategy(path: string): 'central' | 'api' | 'public' {
  if (shouldBypassCentralAuth(path)) {
    return 'api';
  }
  
  if (authConfig.central.publicRoutes.some(pattern => {
    if (pattern.endsWith('/**')) {
      const basePath = pattern.slice(0, -3);
      return path.startsWith(basePath);
    }
    return path === pattern;
  })) {
    return 'public';
  }
  
  return 'central';
} 