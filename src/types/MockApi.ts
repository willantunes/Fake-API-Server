export interface MockApi {
  id: string;
  path: string;
  method: string;
  description?: string;
  active?: boolean;
  auth: {
    type: 'none' | 'bearer' | 'oauth' | 'client_credentials' | 'api_key' | 'custom_header' | 'basic' | 'jwt';
    token?: string;
    apiKey?: string;
    headerName?: string;
    headerValue?: string;
    apiKeyInQuery?: boolean;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    allowedScopes?: string[];
    requiredScopes?: string[];
  };
  cors?: {
    enabled: boolean;
    origins?: string[];
    allowedHeaders?: string[];
    allowedMethods?: string[];
    allowCredentials?: boolean;
  };
  category?: string;
  tags?: string[];
  response: {
    type: 'json' | 'text' | 'html' | 'xml' | 'csv' | 'binary';
    data: unknown;
    contentType?: string;
    dynamic?: boolean;
  };
  statusCode: number;
  simulation?: {
    delay?: number;
    networkErrors?: boolean;
    errorChance?: number;
  };
}

export interface TrafficLog {
  response: {
    status: number;
    [key: string]: any;
  };
} 