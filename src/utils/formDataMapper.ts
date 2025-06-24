import type { 
  MockApi, 
  CreateMockApiRequest, 
  UpdateMockApiRequest,
  AuthConfig,
  CorsConfig,
  SimulationConfig,
  ResponseConfig 
} from "../types/MockApi.ts";

/**
 * Utility to map between form data and API models
 */
export class FormDataMapper {
  /**
   * Convert FormData to a CreateMockApiRequest
   */
  static fromFormData(formData: FormData): CreateMockApiRequest {
    // Basic fields
    const method = String(formData.get('method') || 'GET');
    const path = String(formData.get('path') || '/');
    const description = String(formData.get('description') || '');
    const statusCode = Number(formData.get('statusCode') || 200);
    const responseType = String(formData.get('responseType') || 'json');
    const contentType = formData.get('contentType') ? String(formData.get('contentType')) : undefined;
    const dynamicResponse = formData.get('dynamicResponse') === 'true';
    const bodyText = String(formData.get('body') || '');
    
    // Tags (if provided)
    const tags = formData.get('tags') ? String(formData.get('tags')).split(',').map(t => t.trim()) : undefined;
    const category = formData.get('category') ? String(formData.get('category')) : undefined;
    
    // Extract authentication details
    const auth = this.extractAuthConfig(formData);
    
    // Extract CORS settings
    const cors = this.extractCorsConfig(formData);
    
    // Extract simulation options
    const simulation = this.extractSimulationConfig(formData);
    
    // Prepare response data
    const response = this.extractResponseConfig(formData);
    
    // Create the API request
    return {
      method,
      path,
      description,
      statusCode,
      auth,
      cors,
      simulation,
      response,
      tags,
      category
    };
  }
  
  /**
   * Extract authentication config from form data
   */
  private static extractAuthConfig(formData: FormData): AuthConfig {
    const authType = String(formData.get('authType') || 'none') as any;
    const auth: AuthConfig = { type: authType };
    
    if (authType === 'bearer') {
      auth.token = String(formData.get('token') || '');
    } else if (authType === 'api_key') {
      auth.headerName = String(formData.get('headerName') || 'X-API-Key');
      auth.apiKey = String(formData.get('apiKey') || '');
      auth.apiKeyInQuery = formData.get('apiKeyInQuery') === 'true';
    } else if (authType === 'custom_header') {
      auth.headerName = String(formData.get('headerName') || '');
      auth.headerValue = String(formData.get('headerValue') || '');
    } else if (authType === 'basic') {
      auth.username = String(formData.get('username') || '');
      auth.password = String(formData.get('password') || '');
    } else if (authType === 'oauth' || authType === 'client_credentials') {
      auth.clientId = String(formData.get('clientId') || '');
      auth.clientSecret = String(formData.get('clientSecret') || '');
      auth.allowedScopes = String(formData.get('allowedScopes') || '').split(/\s+/).filter(Boolean);
    } else if (authType === 'jwt') {
      auth.token = String(formData.get('token') || '');
      const requiredScopes = String(formData.get('requiredScopes') || '');
      if (requiredScopes) {
        try {
          auth.requiredScopes = JSON.parse(requiredScopes);
        } catch (e) {
          auth.requiredScopes = {};
        }
      }
    }
    
    return auth;
  }
  
  /**
   * Extract CORS config from form data
   */
  private static extractCorsConfig(formData: FormData): CorsConfig | undefined {
    const corsEnabled = formData.get('corsEnabled') === 'true';
    
    if (!corsEnabled) {
      return undefined;
    }
    
    return {
      enabled: true,
      origins: String(formData.get('corsOrigins') || '*').split(',').map(s => s.trim()),
      allowCredentials: formData.get('corsCredentials') === 'true',
      allowedHeaders: String(formData.get('corsHeaders') || '').split(',').map(s => s.trim()).filter(Boolean),
      allowedMethods: String(formData.get('corsMethods') || '').split(',').map(s => s.trim()).filter(Boolean),
      exposedHeaders: String(formData.get('corsExposedHeaders') || '').split(',').map(s => s.trim()).filter(Boolean),
      maxAge: formData.get('corsMaxAge') ? Number(formData.get('corsMaxAge')) : undefined
    };
  }
  
  /**
   * Extract simulation config from form data
   */
  private static extractSimulationConfig(formData: FormData): SimulationConfig {
    const simDelay = Number(formData.get('simDelay') || 0);
    const simulateNetworkErrors = formData.get('simulateNetworkErrors') === 'true';
    const errorChance = Number(formData.get('errorChance') || 10);
    
    // Extract selected error statuses
    const errorStatuses: number[] = [];
    formData.getAll('errorStatuses').forEach(value => {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        errorStatuses.push(numValue);
      }
    });
    
    // Extract custom error responses from JSON field
    let errorResponses: SimulationConfig['errorResponses'] = undefined;
    try {
      const errorResponsesJSON = formData.get('errorResponsesJSON');
      if (errorResponsesJSON) {
        errorResponses = JSON.parse(String(errorResponsesJSON));
      }
    } catch (e) {
      console.error('Error parsing error responses JSON:', e);
    }
    
    return { 
      delay: simDelay,
      networkErrors: simulateNetworkErrors,
      errorChance,
      errorStatuses: errorStatuses.length > 0 ? errorStatuses : undefined,
      errorResponses
    };
  }
  
  /**
   * Extract response config from form data
   */
  private static extractResponseConfig(formData: FormData): ResponseConfig {
    const responseType = String(formData.get('responseType') || 'json') as any;
    const contentType = formData.get('contentType') ? String(formData.get('contentType')) : undefined;
    const dynamic = formData.get('dynamicResponse') === 'true';
    const bodyText = String(formData.get('body') || '');
    
    // Prepare response data based on type
    let data: any;
    
    if (responseType === 'json') {
      try { 
        data = JSON.parse(bodyText); 
      } catch { 
        data = {}; 
      }
    } else {
      data = bodyText;
    }
    
    return { 
      type: responseType,
      contentType,
      data,
      dynamic
    };
  }
  
  /**
   * Convert MockApi to FormData
   */
  static toFormData(api: MockApi): FormData {
    const formData = new FormData();
    
    // Basic fields
    formData.set('method', api.method);
    formData.set('path', api.path);
    if (api.description) formData.set('description', api.description);
    formData.set('statusCode', String(api.statusCode));
    
    // Auth fields
    formData.set('authType', api.auth.type);
    this.addAuthFields(formData, api.auth);
    
    // CORS fields
    formData.set('corsEnabled', api.cors?.enabled ? 'true' : 'false');
    if (api.cors?.enabled) {
      this.addCorsFields(formData, api.cors);
    }
    
    // Simulation fields
    if (api.simulation) {
      if (api.simulation.delay) formData.set('simDelay', String(api.simulation.delay));
      if (api.simulation.networkErrors) formData.set('simulateNetworkErrors', 'true');
      if (api.simulation.errorChance) formData.set('errorChance', String(api.simulation.errorChance));
      
      // Error statuses
      if (api.simulation.errorStatuses && api.simulation.errorStatuses.length > 0) {
        api.simulation.errorStatuses.forEach(status => {
          formData.append('errorStatuses', String(status));
        });
      }
      
      // Custom error responses
      if (api.simulation.errorResponses) {
        formData.set('errorResponsesJSON', JSON.stringify(api.simulation.errorResponses));
      }
    }
    
    // Response fields
    formData.set('responseType', api.response.type);
    if (api.response.contentType) formData.set('contentType', api.response.contentType);
    if (api.response.dynamic) formData.set('dynamicResponse', 'true');
    
    // Response body
    const bodyText = api.response.type === 'json' 
      ? JSON.stringify(api.response.data, null, 2) 
      : String(api.response.data || '');
    formData.set('body', bodyText);
    
    // Tags and category (if present)
    if (api.tags && api.tags.length > 0) {
      formData.set('tags', api.tags.join(','));
    }
    
    if (api.category) {
      formData.set('category', api.category);
    }
    
    return formData;
  }
  
  /**
   * Add auth-specific fields to FormData
   */
  private static addAuthFields(formData: FormData, auth: AuthConfig): void {
    if (auth.type === 'bearer' && auth.token) {
      formData.set('token', auth.token);
    } else if (auth.type === 'api_key') {
      if (auth.headerName) formData.set('headerName', auth.headerName);
      if (auth.apiKey) formData.set('apiKey', auth.apiKey);
      if (auth.apiKeyInQuery) formData.set('apiKeyInQuery', 'true');
    } else if (auth.type === 'custom_header') {
      if (auth.headerName) formData.set('headerName', auth.headerName);
      if (auth.headerValue) formData.set('headerValue', auth.headerValue);
    } else if (auth.type === 'basic') {
      if (auth.username) formData.set('username', auth.username);
      if (auth.password) formData.set('password', auth.password);
    } else if (auth.type === 'oauth' || auth.type === 'client_credentials') {
      if (auth.clientId) formData.set('clientId', auth.clientId);
      if (auth.clientSecret) formData.set('clientSecret', auth.clientSecret);
      if (auth.allowedScopes) formData.set('allowedScopes', auth.allowedScopes.join(' '));
    } else if (auth.type === 'jwt') {
      if (auth.token) formData.set('token', auth.token);
      if (auth.requiredScopes) {
        formData.set('requiredScopes', JSON.stringify(auth.requiredScopes));
      }
    }
  }
  
  /**
   * Add CORS fields to FormData
   */
  private static addCorsFields(formData: FormData, cors: CorsConfig): void {
    if (cors.origins) formData.set('corsOrigins', cors.origins.join(','));
    if (cors.allowCredentials) formData.set('corsCredentials', 'true');
    if (cors.allowedHeaders) formData.set('corsHeaders', cors.allowedHeaders.join(','));
    if (cors.allowedMethods) formData.set('corsMethods', cors.allowedMethods.join(','));
    if (cors.exposedHeaders) formData.set('corsExposedHeaders', cors.exposedHeaders.join(','));
    if (cors.maxAge !== undefined) formData.set('corsMaxAge', String(cors.maxAge));
  }
} 