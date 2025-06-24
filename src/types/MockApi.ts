/**
 * Mock API Types
 * Complete type definitions for the Mock API system
 */

// Base Mock API interface
export interface MockApi {
  // Metadata
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // Basic Configuration
  path: string;
  method: string;
  description?: string;
  tags?: string[];
  category?: string;
  active?: boolean;
  
  // Security & Authentication
  auth: AuthConfig;
  cors?: CorsConfig;
  
  // Behavior & Simulation
  statusCode: number;
  simulation?: SimulationConfig;
  
  // Response
  response: ResponseConfig;
}

// Authentication Configuration
export type AuthType = 'none' | 'bearer' | 'oauth' | 'client_credentials' | 'api_key' | 'custom_header' | 'basic' | 'jwt';

export interface AuthConfig {
  type: AuthType;
  // Bearer Token Auth
  token?: string;
  
  // API Key Auth
  apiKey?: string;
  headerName?: string;
  apiKeyInQuery?: boolean;
  
  // Custom Header Auth
  headerValue?: string;
  
  // Basic Auth
  username?: string;
  password?: string;
  
  // OAuth/Client Credentials
  clientId?: string;
  clientSecret?: string;
  allowedScopes?: string[];
  
  // JWT Auth
  requiredScopes?: Record<string, any>;
}

// CORS Configuration
export interface CorsConfig {
  enabled: boolean;
  origins?: string[];
  allowCredentials?: boolean;
  allowedHeaders?: string[];
  allowedMethods?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

// Simulation Configuration
export interface SimulationConfig {
  delay?: number;
  networkErrors?: boolean;
  errorChance?: number;
  errorStatuses?: number[];
  errorResponses?: {
    [statusCode: string]: {
      body?: any;
      headers?: Record<string, string>;
    }
  };
  throttle?: {
    enabled: boolean;
    rate: number;
    period: string; // e.g., '1m', '1h'
  };
}

// Response Configuration
export type ResponseType = 'json' | 'text' | 'html' | 'xml' | 'csv' | 'binary';

export interface ResponseConfig {
  type: ResponseType;
  contentType?: string;
  data: any;
  dynamic?: boolean;
  chunks?: number; // For streaming responses
  headers?: Record<string, string>;
}

// Create API Request
export interface CreateMockApiRequest {
  path: string;
  method: string;
  description?: string;
  active?: boolean;
  statusCode: number;
  auth: AuthConfig;
  cors?: CorsConfig;
  simulation?: SimulationConfig;
  response: ResponseConfig;
  tags?: string[];
  category?: string;
}

// Update API Request
export interface UpdateMockApiRequest extends CreateMockApiRequest {
  id: string;
}

// Search/Filter Options
export interface ApiSearchOptions {
  query?: string;
  method?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

// Service Response
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChunkedResponse {
  chunks: number;
  type: 'json' | 'text' | 'html' | 'xml' | 'csv' | 'binary';
  data?: any;
  contentType?: string;
  chunkKeys?: string[];
  dynamic?: boolean;
  template?: string;
}

export interface OAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
  scopes: string[];
}

export interface TrafficLog {
  id: string;
  timestamp: number;
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: any;
    ip?: string;
    userAgent?: string;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  performance: {
    total: number;
    auth: number;
    processing: number;
  };
  mockApi: {
    id: string;
    path: string;
    method: string;
    auth: any;
  };
  error?: {
    message: string;
    stack?: string;
    timing?: {
      configured?: number;
      actual?: number;
      total?: number;
    };
  };
} 