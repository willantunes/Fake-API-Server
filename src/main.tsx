/** @jsxImportSource hono/jsx */
// Import Hono TSX-based server (v4)
import { Hono, Context, Next } from "hono/mod.ts";
import { serve } from "std/http/server.ts";
import { staticFileMiddleware, staticLoggerMiddleware } from "./middleware/static.ts";
import { loggerMiddleware } from "./middleware/logger.ts";
import { applySimulation } from "./utils/simulation.ts";
import { layoutMiddleware } from "./middleware/layout.tsx";
import { authIntrospectionMiddleware, dynamicApiAuthMiddleware } from "./middleware/auth.ts";
import { routingAuthMiddleware, requireAuthMiddleware, apiRouteProtectionMiddleware } from "./middleware/routing.ts";
import { processTemplateString } from "./utils/templateString.ts";
import { getRequestBody } from "./utils/requestBody.ts";
import { proxyIntrospectController } from "./controllers/proxyController.ts";

import mockApiApp from "./routes/mockApi.tsx";
import trafficLogsApp from "./routes/trafficLogs.tsx";
import { MockApiRepository } from "./services/mockApiService.ts";
import type { TrafficLog } from "./types/MockApi.ts";
import { config } from "./config.ts";
import type { MockApi } from "./types/MockApi.ts";

// Central auth service base URL from config
const CENTRAL_AUTH_URL = config.authGateway.url;

// Define context variables
export type Variables = {
  mockApiRepository: MockApiRepository;
  user?: { id: string; name: string; isAdmin?: boolean };
  isAuthenticated?: boolean;
  apiAuthenticated?: boolean;
  authTime?: number;
  authError?: string;
  isApiRoute?: boolean;
  title?: string;
  layoutProps?: object;
  breadcrumbs?: Array<{ href?: string; label: string }>;
};

// Root app
const app = new Hono<{ Variables: Variables }>();

// Logger middleware
app.use("*", loggerMiddleware);

// Static assets - serve first to ensure they have priority
app.use("/static/*", staticFileMiddleware);
app.use("/static/*", staticLoggerMiddleware);

// Repository setup
app.use("*", async (c: Context<{ Variables: Variables }>, next: Next) => {
  c.set("mockApiRepository", new MockApiRepository());
  await next();
});

// Proxy for client-side introspection
app.post('/api/introspect', proxyIntrospectController);

// API route protection middleware (prevents redirects on API endpoints)
app.use("*", apiRouteProtectionMiddleware);

// Routing-based authentication middleware
app.use("*", routingAuthMiddleware);

// Redirect login to central auth
app.get('/login', (c) => {
  const urlObj = new URL(c.req.url);
  const returnToParam = urlObj.searchParams.get('return_to') || '/';
  const origin = urlObj.origin;
  const target = returnToParam.startsWith('http://') || returnToParam.startsWith('https://')
    ? returnToParam
    : `${origin}${returnToParam}`;
  const redirectUrl = `${CENTRAL_AUTH_URL}/login?return_to=${encodeURIComponent(target)}`;
  console.log(`[Login] return_to=${returnToParam}, target=${target}, redirectUrl=${redirectUrl}, HTMX=${c.req.header('HX-Request')}`);
  if (c.req.header('HX-Request') === 'true') {
    c.header('HX-Redirect', redirectUrl);
    return c.text('');
  }
  return c.redirect(redirectUrl);
});

// Logout route for HTMX support
app.post('/api/auth/logout', (c) => {
  const urlObj = new URL(c.req.url);
  const returnToParam = urlObj.searchParams.get('return_to') || '/';
  const origin = urlObj.origin;
  const target = returnToParam.startsWith('http://') || returnToParam.startsWith('https://')
    ? returnToParam
    : `${origin}${returnToParam}`;
  const logoutUrl = `${CENTRAL_AUTH_URL}/logout?return_to=${encodeURIComponent(target)}`;
  console.log(`[Logout] return_to=${returnToParam}, target=${target}, logoutUrl=${logoutUrl}, HTMX=${c.req.header('HX-Request')}`);
  if (c.req.header('HX-Request') === 'true') {
    c.header('HX-Redirect', logoutUrl);
    return c.text('');
  }
  return c.redirect(logoutUrl);
});

// Consumer callback: proxy Auth0 callback through the central gateway
app.get('/callback', async (c) => {
  const urlObj = new URL(c.req.url);
  const params = urlObj.searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const returnTo = params.get('return_to') || '/';
  console.log(`[Callback] incoming code=${code}, state=${state}, return_to=${returnTo}`);
  const gatewayCallback = new URL(`${CENTRAL_AUTH_URL}/callback`);
  if (code) gatewayCallback.searchParams.set('code', code);
  if (state) gatewayCallback.searchParams.set('state', state);
  gatewayCallback.searchParams.set('return_to', returnTo);
  console.log(`[Callback] forwarding to gateway: ${gatewayCallback.toString()}`);
  const gatewayRes = await fetch(gatewayCallback.toString(), {
    headers: { cookie: c.req.header('cookie') || '' },
    redirect: 'manual',
  });
  if (gatewayRes.status === 302) {
    const location = gatewayRes.headers.get('location')!;
    console.log(`[Callback] gateway issued redirect to ${location}`);
    // Forward Set-Cookie headers from gateway to client
    const responseHeaders = new Headers();
    gatewayRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // Ensure cookie is valid across .iliberty.com.br subdomains
        let cookie = value;
        if (!/;\s*Domain=/i.test(cookie)) {
          cookie += '; Domain=.iliberty.com.br';
        }
        responseHeaders.append('Set-Cookie', cookie);
      }
    });
    responseHeaders.set('location', location);
    return new Response(null, { status: 302, headers: responseHeaders });
  }
  console.log(`[Callback] gateway responded status=${gatewayRes.status}, returning body`);
  const bodyText = await gatewayRes.text();
  return new Response(bodyText, { status: gatewayRes.status });
});

// Require authentication for protected routes (replaced with more comprehensive middleware)
app.use("*", requireAuthMiddleware);

// Bypass layout for API routes and HTMX requests, apply layout otherwise
app.use("*", async (c: Context<{ Variables: Variables }>, next: Next) => {
  const path = c.req.path;
  if (
    path.startsWith('/api/') ||
    path.startsWith('/rest/api/') ||
    path.startsWith('/mock-api/export') ||
    c.req.header('HX-Request') === 'true'
  ) {
    await next();
  } else {
    console.log(`Standard request: ${c.req.method} ${path} - Applying layout.`);
    await layoutMiddleware(c, next);
  }
});

// API Management Routes
app.route("/mock-api", mockApiApp);

// Traffic Logs Routes
app.route("/traffic", trafficLogsApp);

// API Endpoints for Traffic Logs
app.get("/api/traffic", async (c) => {
  const repo = c.get("mockApiRepository");
  const logs = await repo.getTrafficLogs();
  return c.json(logs);
});

app.post("/api/traffic/clear", async (c) => {
  const repo = c.get("mockApiRepository");
  const count = await repo.clearTrafficLogs();
  return c.json({ success: true, count });
});

// Debug endpoint to list all APIs in KV
app.get("/api/debug/apis", async (c) => {
  const repo = c.get("mockApiRepository");
  const apis = await repo.getAllApis();
  return c.json({
    total: apis.length,
    apis: apis.map(api => ({
      id: api.id,
      path: api.path,
      method: api.method,
      active: api.active,
      createdAt: api.createdAt
    }))
  });
});

/**
 * Reusable handler for dynamic API endpoints
 * Handles both /api/* and /rest/api/* routes
 */
async function handleDynamicApiEndpoint(c: Context<{ Variables: Variables }>, pathPrefix: string) {
  const repo = c.get("mockApiRepository");
  const req = c.req;
  const url = new URL(req.url);
  const method = req.method;
  
  // Remove the path prefix to get the API path
  const path = url.pathname.replace(new RegExp(`^${pathPrefix}`), "") || "/";
  
  // Safely extract headers and query for logging without throwing
  let safeHeaders: Record<string, string> = {};
  try {
    const hdrs = (req as unknown as { headers?: Headers }).headers;
    if (hdrs && typeof hdrs.entries === 'function') {
      safeHeaders = Object.fromEntries(hdrs.entries());
    }
  } catch (_e) {
    console.error('DEBUG: error extracting headers:', _e);
  }
  let safeQuery: Record<string, string> = {};
  try {
    safeQuery = Object.fromEntries(url.searchParams.entries());
  } catch (_e) {
    console.error('DEBUG: error extracting query params:', _e);
  }
  
  // Capture start time for performance metrics
  const start = performance.now();
  
  // Find matching API via index by path and method
  const api = await repo.findApiByPathAndMethod(path, method);
  console.log('DEBUG: findApiByPathAndMethod result:', api);
  
  // Handle preflight requests for CORS
  if (method === "OPTIONS") {
    const corsApi = api && api.cors?.enabled ? api : null;
    
    if (corsApi) {
      const headers = new Headers();
      headers.set("Access-Control-Allow-Origin", corsApi.cors?.origins?.[0] || "*");
      headers.set("Access-Control-Allow-Methods", corsApi.cors?.allowedMethods?.join(", ") || "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      headers.set("Access-Control-Allow-Headers", corsApi.cors?.allowedHeaders?.join(", ") || "Content-Type, Authorization");
      
      if (corsApi.cors?.allowCredentials) {
        headers.set("Access-Control-Allow-Credentials", "true");
      }
      
      if (corsApi.cors?.maxAge) {
        headers.set("Access-Control-Max-Age", String(corsApi.cors.maxAge));
      }
      
      return new Response(null, {
        status: 204,
        headers
      });
    }
  }
  
  // 404 if no API found
  if (!api) {
    // Generate traffic log for 404
    await repo.storeTrafficLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      request: {
        method,
        path,
        headers: safeHeaders,
        query: safeQuery,
      },
      response: { status: 404, headers: {}, body: "Not Found" },
      performance: { total: performance.now() - start, auth: 0, processing: performance.now() - start },
      mockApi: { id: "", path, method, auth: { type: "none" } },
      error: { message: "Endpoint not found" }
    });
    
    return c.text("Not Found", { status: 404 });
  }
  
  // Add CORS headers if enabled
  const headers = new Headers();
  if (api.cors?.enabled) {
    headers.set("Access-Control-Allow-Origin", api.cors.origins?.[0] || "*");
    
    if (api.cors.allowCredentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    
    if (api.cors.exposedHeaders && api.cors.exposedHeaders.length > 0) {
      headers.set("Access-Control-Expose-Headers", api.cors.exposedHeaders.join(", "));
    }
  }
  
  // Use dynamic API authentication middleware
  const authResult = await dynamicApiAuthMiddleware(c, api);
  
  // If authentication failed, return proper HTTP error response
  if (!authResult.success) {
    const authTime = authResult.authTime;
    const authError = authResult.error || 'Authentication failed';
    const statusCode = authResult.statusCode || 401;
    
    // Generate traffic log for auth error
    await repo.storeTrafficLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      request: {
        method,
        path,
        headers: safeHeaders,
        query: safeQuery,
      },
      response: { 
        status: statusCode, 
        headers: Object.fromEntries(headers.entries()), 
        body: { error: "Unauthorized", message: authError } 
      },
      performance: { total: performance.now() - start, auth: authTime, processing: 0 },
      mockApi: { id: api.id, path: api.path, method: api.method, auth: api.auth },
      error: { message: authError }
    });
    
    // Return JSON error response for API endpoints
    return c.json(
      { 
        error: "Unauthorized", 
        message: authError,
        timestamp: new Date().toISOString(),
        path: path,
        method: method
      }, 
      { 
        status: statusCode,
        headers: headers
      }
    );
  }
  
  // Get auth timing for metrics
  const authTime = authResult.authTime;
  
  // --- Simulation logic (refactored) ---
  const simulationResult = await applySimulation(api.simulation);
  // Add simulation metadata headers
  headers.set("X-MockAPI-Simulation-Delay", simulationResult.delayApplied.toString());
  headers.set("X-MockAPI-Simulation-Error-Chance", (api.simulation?.errorChance ?? 0).toString());
  if (simulationResult.simulatedError) {
    // Indicate simulated error in headers
    headers.set("X-MockAPI-Simulation-Error", "true");
    headers.set("X-MockAPI-Simulation-Error-Status", simulationResult.errorStatus?.toString() || "");
    
    // Add any custom headers from the simulation result
    if (simulationResult.errorHeaders) {
      Object.entries(simulationResult.errorHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }
    
    const errorStatus = simulationResult.errorStatus || 503;
    const errorBody = simulationResult.errorBody || { error: "Service Unavailable", message: "A network error was simulated." };
    const totalTime = performance.now() - start;
    await repo.storeTrafficLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      request: {
        method,
        path,
        headers: safeHeaders,
        query: safeQuery,
      },
      response: { status: errorStatus, headers: {}, body: errorBody },
      performance: { total: totalTime, auth: authTime, processing: totalTime - authTime },
      mockApi: { id: api.id, path: api.path, method: api.method, auth: api.auth },
      error: {
        message: "Simulated network error",
        timing: {
          configured: api.simulation?.delay,
          actual: simulationResult.delayApplied,
          total: totalTime
        }
      }
    });
    return c.json(errorBody, { status: errorStatus, headers });
  }
  
  // Before final response, indicate no simulated error
  headers.set("X-MockAPI-Simulation-Error", "false");

  // Process dynamic response variables if needed
  let responseData = api.response.data;
  
  // Process response data if it's dynamic
  if (api.response.dynamic) {
    if (api.response.type === "json" && typeof responseData === "object") {
      const processJsonWithVariables = (obj: unknown): unknown => {
        if (obj === null) return null;
        
        if (Array.isArray(obj)) {
          return obj.map(item => processJsonWithVariables(item));
        }
        
        if (typeof obj === "object") {
          const newObj: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(obj)) {
            newObj[key] = processJsonWithVariables(value);
          }
          return newObj;
        }
        
        if (typeof obj === "string") {
          return processTemplateString(obj);
        }
        
        return obj;
      };
      
      responseData = processJsonWithVariables(responseData);
    } else if (typeof responseData === "string") {
      responseData = processTemplateString(responseData);
    }
  }
  
  // Generate content type based on response type
  if (!headers.has("Content-Type")) {
    if (api.response.contentType) {
      headers.set("Content-Type", api.response.contentType);
    } else {
      switch (api.response.type) {
        case "json":
          headers.set("Content-Type", "application/json");
          break;
        case "text":
          headers.set("Content-Type", "text/plain");
          break;
        case "html":
          headers.set("Content-Type", "text/html");
          break;
        case "xml":
          headers.set("Content-Type", "application/xml");
          break;
        case "csv":
          headers.set("Content-Type", "text/csv");
          break;
        default:
          headers.set("Content-Type", "application/octet-stream");
      }
    }
  }
  
  // Prepare response
  const status = api.statusCode;
  const totalTime = performance.now() - start;
  const processingTime = totalTime - authTime;
  
  // Log traffic (non-blocking - don't let logging failures affect API response)
  try {
    await repo.storeTrafficLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      request: {
        method,
        path,
        headers: safeHeaders,
        query: safeQuery,
        body: method === 'GET' ? null : await getRequestBody(c.req.raw)
      },
      response: { 
        status, 
        headers: Object.fromEntries(headers.entries()), 
        body: responseData 
      },
      performance: { 
        total: totalTime, 
        auth: authTime, 
        processing: processingTime 
      },
      mockApi: { 
        id: api.id, 
        path: api.path, 
        method: api.method, 
        auth: api.auth 
      }
    });
  } catch (error) {
    console.error(`Traffic logging failed for ${method} ${path}:`, error);
    // Continue with API response even if logging fails
  }
  
  // Return response
  if (api.response.type === "json") {
    return c.json(responseData, { status, headers });
  }
  return c.body(String(responseData), { status, headers });
}

// Mock API handler for dynamic endpoints
app.all("/api/*", async (c) => {
  return await handleDynamicApiEndpoint(c, "/api");
});

// Mock API handler for /rest/api/* endpoints
app.all("/rest/api/*", async (c) => {
  return await handleDynamicApiEndpoint(c, "/rest/api");
});

// Root route with dashboard
app.get("/", async (c) => {
  const repo = c.get("mockApiRepository");
  const apis = await repo.getAllApis();
  const logs = (await repo.getTrafficLogs()).logs;
  
  // Calculate statistics
  const totalApis = apis.length;
  const totalRequests = logs.length;
  
  // Group APIs by method
  const methodCounts: Record<string, number> = {};
  apis.forEach(api => {
    const method = api.method;
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  
  // Group APIs by auth type
  const authCounts: Record<string, number> = {};
  apis.forEach(api => {
    const authType = api.auth.type;
    authCounts[authType] = (authCounts[authType] || 0) + 1;
  });
  
  // Get response code distribution
  const statusCounts: Record<string, number> = {};
  logs.forEach(log => {
    const statusGroup = Math.floor(log.response.status / 100) * 100;
    statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
  });
  
  // Get recent logs
  const recentLogs = logs.slice(0, 5);
  
  c.set("title", "MockAPI Studio - Dashboard");
  
  return c.render(
    <div class="container mx-auto px-4 pt-4 pb-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">MockAPI Studio</h1>
          <p class="text-gray-600 mt-2">Uma ferramenta poderosa para simular APIs RESTful</p>
        </div>
        <div class="flex space-x-4">
          <a href="/mock-api/new" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center gap-1 font-medium">
            <span class="material-icons text-sm">add</span>
            Nova API
          </a>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Total de APIs</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{totalApis}</p>
            </div>
            <div class="bg-blue-100 p-2.5 rounded-lg text-blue-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">api</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/mock-api" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
              Ver todas
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Requisições</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{totalRequests}</p>
            </div>
            <div class="bg-green-100 p-2.5 rounded-lg text-green-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">sync</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/traffic" class="text-sm text-green-600 hover:text-green-800 inline-flex items-center">
              Ver logs
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Métodos HTTP</p>
              <div class="flex flex-wrap gap-1 mt-3">
                {Object.entries(methodCounts).slice(0, 4).map(([method, count]) => (
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      method === 'POST' ? 'bg-green-100 text-green-800' :
                      method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}`
                  }>
                    {method} ({count})
                  </span>
                ))}
              </div>
            </div>
            <div class="bg-purple-100 p-2.5 rounded-lg text-purple-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">http</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/mock-api" class="text-sm text-purple-600 hover:text-purple-800 inline-flex items-center">
              Ver detalhes
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-amber-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Status HTTP</p>
              <div class="flex flex-wrap gap-1 mt-3">
                {Object.entries(statusCounts).slice(0, 4).map(([statusGroup, count]) => (
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${statusGroup === '200' ? 'bg-green-100 text-green-800' :
                      statusGroup === '300' ? 'bg-blue-100 text-blue-800' :
                      statusGroup === '400' ? 'bg-yellow-100 text-yellow-800' :
                      statusGroup === '500' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}`
                  }>
                    {statusGroup}s ({count})
                  </span>
                ))}
              </div>
            </div>
            <div class="bg-amber-100 p-2.5 rounded-lg text-amber-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">assistant</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/traffic" class="text-sm text-amber-600 hover:text-amber-800 inline-flex items-center">
              Ver detalhes
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Features */}
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Funcionalidades</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-start space-x-4">
                <div class="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <span class="material-icons">cloud_sync</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">APIs RESTful</h3>
                  <p class="text-sm text-gray-600 mt-1">Crie APIs com suporte a todos os métodos HTTP: GET, POST, PUT, DELETE, etc.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-4">
                <div class="bg-green-100 p-2 rounded-lg text-green-600">
                  <span class="material-icons">security</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">Autenticação</h3>
                  <p class="text-sm text-gray-600 mt-1">Bearer Token, API Key, Basic Auth, OAuth, JWT e outros métodos de autenticação.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-4">
                <div class="bg-purple-100 p-2 rounded-lg text-purple-600">
                  <span class="material-icons">assessment</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">Monitoramento</h3>
                  <p class="text-sm text-gray-600 mt-1">Acompanhe todas as requisições com logs detalhados e métricas de performance.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-4">
                <div class="bg-amber-100 p-2 rounded-lg text-amber-600">
                  <span class="material-icons">science</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">Simulação</h3>
                  <p class="text-sm text-gray-600 mt-1">Simule latência, erros de rede e respostas personalizadas para testar cenários reais.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-4">
                <div class="bg-red-100 p-2 rounded-lg text-red-600">
                  <span class="material-icons">travel_explore</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">CORS</h3>
                  <p class="text-sm text-gray-600 mt-1">Configure cabeçalhos CORS para permitir acesso de origens específicas.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-4">
                <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <span class="material-icons">auto_fix_high</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">Respostas Dinâmicas</h3>
                  <p class="text-sm text-gray-600 mt-1">Crie respostas com dados dinâmicos usando variáveis e templates.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent APIs */}
          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-gray-900">APIs Recentes</h2>
              <a href="/mock-api" class="text-sm text-blue-600 hover:text-blue-800">Ver todas</a>
            </div>
            
            {apis.length === 0 ? (
              <div class="text-center py-6">
                <p class="text-gray-600">Nenhuma API configurada ainda</p>
                <a href="/mock-api/new" class="mt-2 inline-block text-blue-600 hover:text-blue-800">Criar sua primeira API</a>
              </div>
            ) : (
              <div class="overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    {apis.slice(0, 5).map((api) => (
                      <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 whitespace-nowrap">
                          <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${api.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                              api.method === 'POST' ? 'bg-green-100 text-green-800' :
                              api.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              api.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`
                          }>
                            {api.method}
                          </span>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">
                          <div class="text-sm text-gray-900 font-mono">/api{api.path}</div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">
                          <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${api.statusCode >= 200 && api.statusCode < 300 ? 'bg-green-100 text-green-800' :
                              api.statusCode >= 300 && api.statusCode < 400 ? 'bg-blue-100 text-blue-800' :
                              api.statusCode >= 400 && api.statusCode < 500 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}`
                          }>
                            {api.statusCode}
                          </span>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-right space-x-2">
                          <a href={`/mock-api/${api.id}`} class="text-gray-500 hover:text-blue-600" title="Editar">
                            <span class="material-icons text-sm">edit</span>
                          </a>
                          <a href={`/api${api.path}`} target="_blank" class="text-gray-500 hover:text-green-600" title="Testar">
                            <span class="material-icons text-sm">play_arrow</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Right column: Activity and Help */}
        <div class="space-y-6">
          {/* Recent Activity */}
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Atividade Recente</h2>
            
            {logs.length === 0 ? (
              <div class="text-center py-6">
                <p class="text-gray-600">Nenhuma requisição processada ainda</p>
                <p class="text-sm text-gray-500 mt-1">As requisições aparecerão aqui quando suas APIs forem utilizadas</p>
              </div>
            ) : (
              <div class="space-y-4">
                {recentLogs.map((log) => (
                  <div class="border-l-4 pl-4 py-1 border-gray-200 hover:border-blue-500 transition-colors">
                    <div class="flex justify-between">
                      <div class="flex space-x-2 items-center">
                        <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                          ${log.request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            log.request.method === 'POST' ? 'bg-green-100 text-green-800' :
                            log.request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            log.request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}`
                        }>
                          {log.request.method}
                        </span>
                        <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                          ${log.response.status >= 200 && log.response.status < 300 ? 'bg-green-100 text-green-800' :
                            log.response.status >= 300 && log.response.status < 400 ? 'bg-blue-100 text-blue-800' :
                            log.response.status >= 400 && log.response.status < 500 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}`
                        }>
                          {log.response.status}
                        </span>
                      </div>
                      <div class="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div class="text-sm font-mono text-gray-600 mt-1 truncate">
                      /api{log.request.path}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      Tempo: {log.performance.total.toFixed(2)}ms
                    </div>
                  </div>
                ))}
                
                <div class="text-center pt-2">
                  <a href="/traffic" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
                    Ver todos os logs
                    <span class="material-icons text-sm ml-1">arrow_forward</span>
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Start */}
          <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Guia Rápido</h2>
            
            <div class="space-y-4">
              <div class="flex items-start space-x-3">
                <div class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h3 class="font-medium text-gray-900">Crie uma API</h3>
                  <p class="text-sm text-gray-600 mt-1">Defina o método HTTP, caminho, código de status e a resposta desejada.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-3">
                <div class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h3 class="font-medium text-gray-900">Configure opções avançadas</h3>
                  <p class="text-sm text-gray-600 mt-1">Adicione autenticação, configurações CORS e comportamentos de simulação.</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-3">
                <div class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h3 class="font-medium text-gray-900">Teste sua API</h3>
                  <p class="text-sm text-gray-600 mt-1">Acesse <code class="bg-gray-100 px-1 py-0.5 rounded">http://localhost:8000/api/seu-caminho</code> ou use a aba "Testar API".</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-3">
                <div class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h3 class="font-medium text-gray-900">Monitore requisições</h3>
                  <p class="text-sm text-gray-600 mt-1">Acompanhe todas as requisições através dos logs de tráfego.</p>
                </div>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-100 text-center">
              <a href="/mock-api/new" class="text-blue-600 hover:text-blue-800">
                Criar primeira API
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Redirect / to /mock-api (comment this line since we now have a dashboard)
// app.get("/", (c) => c.redirect("/mock-api"));

// Run the server
console.log(`Server running on http://localhost:${config.server.port}`);
serve(app.fetch, { port: config.server.port });

// Function to format date for traffic logs display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Process traffic logs for the UI
function _processTrafficLogs(logs: TrafficLog[]): unknown[] {
  return logs.map((log: TrafficLog) => {
    return {
      ...log,
      formattedDate: formatDate(log.timestamp)
    };
  });
}

// --- Postman Collection Export Route ---
app.get("/mock-api/:id/postman-collection", async (c) => {
  const repo = c.get("mockApiRepository");
  const api = await repo.getApiById(c.req.param("id"));
  if (!api) return c.text("API not found", 404);

  // Generate Postman Collection JSON
  const collection = generatePostmanCollection(api, c);

  // Serve as downloadable file
  const filename = `postman-${api.method}-${api.path.replace(/\//g, "_")}.json`;
  c.header("Content-Disposition", `attachment; filename=\"${filename}\"`);
  c.header("Content-Type", "application/json");
  return c.body(JSON.stringify(collection, null, 2));
});

function generatePostmanCollection(api: MockApi, c: Context<{ Variables: Variables }>) {
  // Determine base URL (protocol + host + /api)
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}/api`;
  // Compose full endpoint path
  const endpoint = api.path.startsWith("/") ? api.path : `/${api.path}`;

  // Auth mapping
  let auth: Record<string, unknown> | undefined = undefined;
  const headers: Array<{ key: string; value: string; description?: string }> = [];
  const query: Array<{ key: string; value: string; description?: string }> = [];
  if (api.auth && api.auth.type !== "none") {
    switch (api.auth.type) {
      case "bearer":
      case "jwt":
        auth = {
          type: "bearer",
          bearer: [
            { key: "token", value: api.auth.token || "", type: "string" }
          ]
        };
        break;
      case "basic":
        auth = {
          type: "basic",
          basic: [
            { key: "username", value: api.auth.username || "", type: "string" },
            { key: "password", value: api.auth.password || "", type: "string" }
          ]
        };
        break;
      case "api_key":
        if (api.auth.apiKeyInQuery) {
          query.push({ key: api.auth.headerName || "apikey", value: api.auth.apiKey || "", description: "API Key" });
        } else {
          headers.push({ key: api.auth.headerName || "X-API-Key", value: api.auth.apiKey || "", description: "API Key" });
        }
        break;
      case "custom_header":
        headers.push({ key: api.auth.headerName || "", value: api.auth.headerValue || "", description: "Custom Header" });
        break;
    }
  }

  // Add CORS headers if needed (optional, for demo)
  if (api.cors && api.cors.enabled) {
    headers.push({ key: "Origin", value: api.cors.origins?.[0] || "*", description: "CORS Origin" });
  }

  // Compose request body if needed
  let body: unknown = undefined;
  if (api.method !== "GET" && api.response && api.response.data) {
    if (api.response.type === "json") {
      body = {
        mode: "raw",
        raw: typeof api.response.data === "string" ? api.response.data : JSON.stringify(api.response.data, null, 2),
        options: { raw: { language: "json" } }
      };
    } else if (api.response.type === "text") {
      body = {
        mode: "raw",
        raw: String(api.response.data)
      };
    }
    // Add more types as needed
  }

  // Compose the Postman Collection object
  return {
    info: {
      name: `MockAPI: ${api.method} ${endpoint}`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      description: api.description || "Exported from MockAPI Studio"
    },
    item: [
      {
        name: `${api.method} ${endpoint}`,
        request: {
          method: api.method,
          header: headers,
          url: {
            raw: `${baseUrl}${endpoint}` + (query.length ? `?${query.map(q => `${q.key}=${q.value}`).join("&")}` : ""),
            protocol: url.protocol.replace(":", ""),
            host: url.host.split("."),
            port: url.port || undefined,
            path: ["api", ...endpoint.replace(/^\//, "").split("/")],
            query: query.length ? query : undefined
          },
          ...(body ? { body } : {}),
          ...(auth ? { auth } : {})
        },
        response: []
      }
    ]
  };
} 