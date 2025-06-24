import type { Context } from "hono/mod.ts";
import type { MockApi, AuthConfig } from "../types/MockApi.ts";
import { shouldSkipApiAuth } from "../config/auth.ts";

/**
 * Result of API authentication attempt
 */
export interface ApiAuthResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  authTime: number;
}

/**
 * Service responsible for API authentication
 * Implements various authentication strategies based on API configuration
 */
export class ApiAuthService {
  /**
   * Authenticate API request based on the API's configuration
   */
  async authenticate(c: Context, api: MockApi): Promise<ApiAuthResult> {
    console.log(`[API Auth Service] Authenticating ${c.req.method} ${c.req.path}, Auth type: ${api.auth.type}`);
    
    const authStart = performance.now();
    
    try {
      // Check if authentication should be skipped for cross-origin/external requests
      if (shouldSkipApiAuth(c.req.raw)) {
        console.log(`[API Auth Service] Skipping authentication for cross-origin/external request`);
        return this.createSuccessResult(performance.now() - authStart);
      }
      
      // Authenticate based on API configuration
      const result = await this.authenticateByType(c, api.auth);
      const authTime = performance.now() - authStart;
      
      if (result.success) {
        console.log(`[API Auth Service] Authentication successful for ${api.auth.type}`);
        return this.createSuccessResult(authTime);
      } else {
        console.log(`[API Auth Service] Authentication failed: ${result.error}`);
        return this.createErrorResult(result.error || 'Authentication failed', authTime, result.statusCode);
      }
      
    } catch (error) {
      const authTime = performance.now() - authStart;
      console.error('[API Auth Service] Unexpected authentication error:', error);
      return this.createErrorResult('Internal authentication error', authTime, 500);
    }
  }
  
  /**
   * Authenticate based on authentication type
   */
  private async authenticateByType(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    switch (auth.type) {
      case 'none':
        return { success: true };
        
      case 'bearer':
        return await this.validateBearerAuth(c, auth);
        
      case 'api_key':
        return await this.validateApiKeyAuth(c, auth);
        
      case 'basic':
        return await this.validateBasicAuth(c, auth);
        
      case 'jwt':
        return await this.validateJwtAuth(c, auth);
        
      case 'custom_header':
        return await this.validateCustomHeaderAuth(c, auth);
        
      case 'oauth':
      case 'client_credentials':
        return await this.validateOAuthAuth(c, auth);
        
      default:
        return { 
          success: false, 
          error: `Unsupported authentication type: ${auth.type}`, 
          statusCode: 501 
        };
    }
  }
  
  /**
   * Validate Bearer token authentication
   */
  private async validateBearerAuth(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        error: 'Bearer token required in Authorization header', 
        statusCode: 401 
      };
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!auth.token) {
      return { 
        success: false, 
        error: 'Bearer token not configured for this API', 
        statusCode: 500 
      };
    }
    
    if (token !== auth.token) {
      return { 
        success: false, 
        error: 'Invalid bearer token', 
        statusCode: 401 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Validate API Key authentication
   */
  private async validateApiKeyAuth(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    if (!auth.apiKey) {
      return { 
        success: false, 
        error: 'API key not configured for this endpoint', 
        statusCode: 500 
      };
    }
    
    let providedApiKey: string | null = null;
    const keyName = auth.headerName || (auth.apiKeyInQuery ? 'api_key' : 'X-API-Key');
    
    if (auth.apiKeyInQuery) {
      // Check query parameters
      const url = new URL(c.req.url);
      providedApiKey = url.searchParams.get(keyName);
    } else {
      // Check headers
      providedApiKey = c.req.header(keyName) || null;
    }
    
    if (!providedApiKey) {
      const location = auth.apiKeyInQuery ? 'query parameter' : 'header';
      return { 
        success: false, 
        error: `API key required in ${location} '${keyName}'`, 
        statusCode: 401 
      };
    }
    
    if (providedApiKey !== auth.apiKey) {
      return { 
        success: false, 
        error: 'Invalid API key', 
        statusCode: 401 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Validate Basic authentication
   */
  private async validateBasicAuth(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return { 
        success: false, 
        error: 'Basic authentication required in Authorization header', 
        statusCode: 401 
      };
    }
    
    const encoded = authHeader.replace('Basic ', '');
    let decoded: string;
    
    try {
      decoded = atob(encoded);
    } catch {
      return { 
        success: false, 
        error: 'Invalid Basic authentication format', 
        statusCode: 400 
      };
    }
    
    const [username, password] = decoded.split(':');
    
    if (!auth.username || !auth.password) {
      return { 
        success: false, 
        error: 'Basic authentication not configured for this endpoint', 
        statusCode: 500 
      };
    }
    
    if (username !== auth.username || password !== auth.password) {
      return { 
        success: false, 
        error: 'Invalid username or password', 
        statusCode: 401 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Validate JWT authentication
   */
  private async validateJwtAuth(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        error: 'JWT token required in Authorization header', 
        statusCode: 401 
      };
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!auth.token) {
      return { 
        success: false, 
        error: 'JWT token not configured for this endpoint', 
        statusCode: 500 
      };
    }
    
    // For simplified JWT validation, we'll check against a configured token
    // In a real implementation, you'd verify the JWT signature and claims
    if (token !== auth.token) {
      return { 
        success: false, 
        error: 'Invalid JWT token', 
        statusCode: 401 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Validate Custom Header authentication
   */
  private async validateCustomHeaderAuth(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    if (!auth.headerName || !auth.headerValue) {
      return { 
        success: false, 
        error: 'Custom header authentication not configured for this endpoint', 
        statusCode: 500 
      };
    }
    
    const headerValue = c.req.header(auth.headerName);
    
    if (!headerValue) {
      return { 
        success: false, 
        error: `Required header '${auth.headerName}' missing`, 
        statusCode: 401 
      };
    }
    
    if (headerValue !== auth.headerValue) {
      return { 
        success: false, 
        error: `Invalid value for header '${auth.headerName}'`, 
        statusCode: 401 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Validate OAuth/Client Credentials authentication
   */
  private async validateOAuthAuth(c: Context, auth: AuthConfig): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        error: 'OAuth token required in Authorization header', 
        statusCode: 401 
      };
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!auth.token) {
      return { 
        success: false, 
        error: 'OAuth token not configured for this endpoint', 
        statusCode: 500 
      };
    }
    
    // Simplified OAuth validation - in real implementation,
    // you'd validate the token against the OAuth provider
    if (token !== auth.token) {
      return { 
        success: false, 
        error: 'Invalid OAuth token', 
        statusCode: 401 
      };
    }
    
    // Check scopes if required
    if (auth.allowedScopes && auth.allowedScopes.length > 0) {
      // In a real implementation, you'd extract scopes from the token
      console.log('[API Auth Service] OAuth scope validation not implemented');
    }
    
    return { success: true };
  }
  
  /**
   * Create successful authentication result
   */
  private createSuccessResult(authTime: number): ApiAuthResult {
    return {
      success: true,
      authTime
    };
  }
  
  /**
   * Create error authentication result
   */
  private createErrorResult(error: string, authTime: number, statusCode: number = 401): ApiAuthResult {
    return {
      success: false,
      error,
      statusCode,
      authTime
    };
  }
} 