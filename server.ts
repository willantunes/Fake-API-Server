/// <reference lib="deno.unstable" />

import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

// Types for our mock API system
interface MockApi {
    id: string;
    path: string;
    method: string;
    auth: {
        type: "none" | "bearer" | "oauth" | "client_credentials" | "api_key" | "custom_header";
        token?: string;
        clientId?: string;
        clientSecret?: string;
        apiKey?: string;
        headerName?: string;
        headerValue?: string;
        tokenEndpoint?: boolean;
        allowedClientId?: string;
        allowedClientSecret?: string;
        allowedScopes?: string[];    // Available scopes for this endpoint
        requiredScopes?: string[];   // Required scopes to access this endpoint
    };
    response: any;
    statusCode: number;
    createdAt: Date;
    updatedAt: Date;
}

// After the MockApi interface, add a new interface for tokens
interface OAuthToken {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    client_id: string;
    scopes: string[];               // Granted scopes
}

// Initialize Deno KV
const kv = await Deno.openKv();

// Helper functions for KV operations
async function getAllApis(): Promise<MockApi[]> {
    const apis: MockApi[] = [];
    const entries = kv.list({ prefix: ["apis"] });
    for await (const entry of entries) {
        apis.push(entry.value as MockApi);
    }
    return apis;
}

async function getApiById(id: string): Promise<MockApi | null> {
    const result = await kv.get(["apis", id]);
    return result.value as MockApi | null;
}

// Add this helper function to parse path parameters
function matchPath(templatePath: string, actualPath: string): { match: boolean; params: Record<string, string> } {
    const templateParts = templatePath.split('/');
    const actualParts = actualPath.split('/');
    const params: Record<string, string> = {};

    if (templateParts.length !== actualParts.length) {
        return { match: false, params };
    }

    for (let i = 0; i < templateParts.length; i++) {
        const template = templateParts[i];
        const actual = actualParts[i];

        // Check if it's a parameter
        if (template.startsWith('{') && template.endsWith('}')) {
            const paramName = template.slice(1, -1);
            params[paramName] = actual;
            continue;
        }

        // Regular path segment comparison
        if (template !== actual) {
            return { match: false, params };
        }
    }

    return { match: true, params };
}

// Update the findApiByPathAndMethod function
async function findApiByPathAndMethod(path: string, method: string): Promise<{ api: MockApi | null; params: Record<string, string> }> {
    const apis = await getAllApis();
    
    for (const api of apis) {
        const { match, params } = matchPath(api.path, path);
        if (match && api.method === method) {
            return { api, params };
        }
    }
    
    return { api: null, params: {} };
}

// Add a new KV collection for tokens
async function storeToken(token: OAuthToken): Promise<void> {
    await kv.set(["tokens", token.access_token], token);
}

async function getToken(access_token: string): Promise<OAuthToken | null> {
    const result = await kv.get(["tokens", access_token]);
    return result.value as OAuthToken | null;
}

const router = new Router();

// Add this logging middleware at the top of the routes
router.use(async (ctx, next) => {
    const start = Date.now();
    const { method, url, headers } = ctx.request;
    
    console.log('\n=== Incoming Request (Raw) ===');
    console.log('Method:', method);
    console.log('URL:', url.pathname);
    console.log('Content-Type:', headers.get('content-type'));
    console.log('Headers:', Object.fromEntries(headers.entries()));
    
    // Log raw body if available, **except** for `/token` endpoints
    if (method === 'POST' && !url.pathname.endsWith('/token')) {
        try {
            const jsonBody = await ctx.request.body.json();
            console.log('JSON Body:', jsonBody);
        } catch (error) {
            console.error('Error reading body:', error);
        }
    }
    
    await next();
    
    const ms = Date.now() - start;
    console.log('\n=== Response ===');
    console.log(`Status: ${ctx.response.status}`);
    console.log(`Response Time: ${ms}ms`);
    console.log('Response Body:', ctx.response.body);
    console.log('==================\n');
});

// Static file middleware
const staticFileMiddleware = async (ctx: any, next: any) => {
    const path = ctx.request.url.pathname;
    if (path === "/" || path === "/index.html") {
        try {
            const content = await Deno.readTextFile("./index.html");
            ctx.response.type = "text/html";
            ctx.response.body = content;
            return;
        } catch (err) {
            console.error("Error reading index.html:", err);
        }
    } else if (path === "/script.js") {
        try {
            const content = await Deno.readTextFile("./script.js");
            ctx.response.type = "application/javascript";
            ctx.response.body = content;
            return;
        } catch (err) {
            console.error("Error reading script.js:", err);
        }
    }
    await next();
};

// List all mock APIs
router.get("/apis", async (ctx) => {
    const apis = await getAllApis();
    ctx.response.body = apis;
});

// Get single mock API
router.get("/apis/:id", async (ctx) => {
    const id = ctx.params.id;
    const api = await getApiById(id);
    
    if (!api) {
        ctx.response.status = 404;
        ctx.response.body = { error: "API not found" };
        return;
    }
    
    ctx.response.body = api;
});

// Create new mock API
router.post("/apis", async (ctx) => {
    const body = await ctx.request.body.json();
    const id = crypto.randomUUID();
    
    const mockApi: MockApi = {
        id,
        path: body.path.startsWith("/") ? body.path : `/${body.path}`,
        method: body.method.toUpperCase(),
        auth: body.auth,
        response: body.response,
        statusCode: body.statusCode || 200,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await kv.set(["apis", id], mockApi);
    ctx.response.body = mockApi;
});

// Update existing mock API
router.put("/apis/:id", async (ctx) => {
    const id = ctx.params.id;
    const body = await ctx.request.body.json();
    
    const existingApi = await getApiById(id);
    if (!existingApi) {
        ctx.response.status = 404;
        ctx.response.body = { error: "API not found" };
        return;
    }

    const mockApi: MockApi = {
        ...existingApi,
        path: body.path.startsWith("/") ? body.path : `/${body.path}`,
        method: body.method.toUpperCase(),
        auth: body.auth,
        response: body.response,
        statusCode: body.statusCode || 200,
        updatedAt: new Date()
    };

    await kv.set(["apis", id], mockApi);
    ctx.response.body = mockApi;
});

// Delete mock API
router.delete("/apis/:id", async (ctx) => {
    const id = ctx.params.id;
    await kv.delete(["apis", id]);
    ctx.response.status = 204;
});

// Replace the array-style route with individual routes
router.post("/oauth/token", handleTokenRequest);
router.post("/api/token", handleTokenRequest);

// Move the handler logic to a separate function
async function handleTokenRequest(ctx: any) {
    try {
        let body;
        const contentType = ctx.request.headers.get('content-type');

        // Parse body based on content type
        if (contentType?.includes('application/x-www-form-urlencoded')) {
            const rawBody = await ctx.request.body.text();
            console.log('Raw request body:', rawBody);
            body = Object.fromEntries(new URLSearchParams(rawBody));
        } else {
            // Attempt to parse as JSON
            try {
                body = await ctx.request.body.json();
            } catch {
                // Fallback to form data if JSON parsing fails
                const rawBody = await ctx.request.body.text();
                body = Object.fromEntries(new URLSearchParams(rawBody));
            }
        }

        console.log('Parsed body:', body);
        
        let { grant_type, client_id, client_secret, scope } = body;

        // Try to get credentials from Basic Auth header
        const authHeader = ctx.request.headers.get('authorization');
        if (authHeader?.startsWith('Basic ')) {
            const base64Credentials = authHeader.split(' ')[1];
            const credentials = atob(base64Credentials).split(':');
            client_id = client_id || credentials[0];
            client_secret = client_secret || credentials[1];
        }

        if (!grant_type) {
            ctx.response.status = 400;
            ctx.response.body = { error: "invalid_request" };
            return;
        }

        if (grant_type === "client_credentials") {
            const apis = await getAllApis();
            const matchingApi = apis.find(api => 
                api.auth.type === "oauth" && 
                api.auth.tokenEndpoint && 
                (!client_id || api.auth.allowedClientId === client_id) && 
                (!client_secret || api.auth.allowedClientSecret === client_secret)
            );

            if (!matchingApi) {
                ctx.response.status = 401;
                ctx.response.body = { 
                    error: "invalid_client",
                    error_description: "Client credentials are invalid"
                };
                return;
            }

            // Handle scopes
            const requestedScopes = scope ? scope.split(' ') : [];
            const allowedScopes = matchingApi.auth.allowedScopes || [];
            
            // Validate requested scopes
            const invalidScopes = requestedScopes.filter(
                (s: string) => !allowedScopes.includes(s)
            );
            if (invalidScopes.length > 0) {
                ctx.response.status = 400;
                ctx.response.body = {
                    error: "invalid_scope",
                    error_description: `Invalid scopes requested: ${invalidScopes.join(', ')}`
                };
                return;
            }

            // Use allowed scopes if none requested
            const grantedScopes = requestedScopes.length > 0 ? requestedScopes : allowedScopes;

            const token: OAuthToken = {
                access_token: crypto.randomUUID(),
                refresh_token: crypto.randomUUID(),
                expires_at: Date.now() + 3600000,
                client_id,
                scopes: grantedScopes
            };

            await storeToken(token);
            
            ctx.response.body = {
                access_token: token.access_token,
                token_type: "Bearer",
                expires_in: 3600,
                scope: grantedScopes.join(' ')
            };
        } else {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "unsupported_grant_type",
                error_description: "Only client_credentials grant type is supported"
            };
        }
    } catch (error) {
        console.error('Body parsing error:', error);
        ctx.response.status = 400;
        ctx.response.body = { error: "invalid_request", error_description: "Could not parse request body" };
        return;
    }
}

// Update the validateAuth function to handle OAuth token validation
async function validateAuth(ctx: any, mockApi: MockApi) {
    console.log('\n=== Auth Validation Details ===');
    console.log('Auth Type:', mockApi.auth.type);
    console.log('Headers:', Object.fromEntries(ctx.request.headers.entries()));

    const headers = ctx.request.headers;

    switch (mockApi.auth.type) {
        case "bearer":
            const authHeader = headers.get("Authorization");
            console.log('Received Bearer Token:', authHeader?.replace('Bearer ', ''));
            console.log('Expected Bearer Token:', mockApi.auth.token);
            if (!authHeader || authHeader !== `Bearer ${mockApi.auth.token}`) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid bearer token" };
                return false;
            }
            break;

        case "oauth":
            const oauthHeader = headers.get("Authorization");
            console.log('Received OAuth Token:', oauthHeader?.replace('Bearer ', ''));
            if (!oauthHeader) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Missing OAuth token" };
                return false;
            }

            const token = oauthHeader.replace("Bearer ", "");
            const storedToken = await getToken(token);
            
            console.log('Stored Token Details:', storedToken ? {
                client_id: storedToken.client_id,
                scopes: storedToken.scopes,
                expires_at: new Date(storedToken.expires_at).toISOString()
            } : 'No stored token found');

            if (mockApi.auth.requiredScopes) {
                console.log('Required Scopes:', mockApi.auth.requiredScopes);
            }
            
            if (!storedToken || storedToken.expires_at < Date.now()) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid or expired OAuth token" };
                return false;
            }

            // Validate scopes
            if (mockApi.auth.requiredScopes && mockApi.auth.requiredScopes.length > 0) {
                const hasRequiredScopes = mockApi.auth.requiredScopes.every(
                    (scope: string) => storedToken.scopes.includes(scope)
                );
                
                console.log('Scope Validation:', {
                    required: mockApi.auth.requiredScopes,
                    provided: storedToken.scopes,
                    valid: hasRequiredScopes
                });
                
                if (!hasRequiredScopes) {
                    ctx.response.status = 403;
                    ctx.response.body = { 
                        error: "insufficient_scope",
                        error_description: `Required scopes: ${mockApi.auth.requiredScopes.join(' ')}`
                    };
                    return false;
                }
            }
            break;

        case "client_credentials":
            const clientId = headers.get("client-id");
            const clientSecret = headers.get("client-secret");
            console.log('Client Credentials:', {
                received: { clientId, clientSecret },
                expected: { 
                    clientId: mockApi.auth.clientId, 
                    clientSecret: mockApi.auth.clientSecret 
                }
            });
            if (clientId !== mockApi.auth.clientId || clientSecret !== mockApi.auth.clientSecret) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid client credentials" };
                return false;
            }
            break;

        case "api_key":
            const apiKey = headers.get("x-api-key");
            console.log('API Key:', {
                received: apiKey,
                expected: mockApi.auth.apiKey
            });
            if (apiKey !== mockApi.auth.apiKey) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid API key" };
                return false;
            }
            break;

        case "custom_header":
            const customHeader = headers.get(mockApi.auth.headerName!);
            console.log('Custom Header:', {
                name: mockApi.auth.headerName,
                received: customHeader,
                expected: mockApi.auth.headerValue
            });
            if (customHeader !== mockApi.auth.headerValue) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid custom header" };
                return false;
            }
            break;
    }

    console.log('Authentication Result: Success');
    return true;
}

// Update the dynamic route handler
router.all("/:path(.*)", async (ctx) => {
    const path = ctx.params.path;
    const method = ctx.request.method;

    console.log("Requested path:", path);
    console.log("Requested method:", method);

    const { api: mockApi, params } = await findApiByPathAndMethod(`/${path}`, method);

    if (!mockApi) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Mock API not found" };
        return;
    }

    const isAuthValid = await validateAuth(ctx, mockApi);
    if (!isAuthValid) return;

    // Process response with path parameters
    let response = mockApi.response;
    if (typeof response === 'object') {
        // Replace path parameters in the response
        response = JSON.parse(JSON.stringify(response)); // Deep clone
        const replaceParams = (obj: any) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    // Check if the value matches any parameter
                    for (const paramName in params) {
                        if (obj[key] === `{${paramName}}` || obj[key].toString() === params[paramName]) {
                            obj[key] = params[paramName];
                        }
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    replaceParams(obj[key]);
                }
            }
        };
        replaceParams(response);
    }

    ctx.response.status = mockApi.statusCode;
    ctx.response.body = response;
});

const app = new Application();

// Apply CORS
app.use(oakCors());

// Apply static file middleware
app.use(staticFileMiddleware);

// Apply router
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
console.log("Mock API server running on http://localhost:8000");
await app.listen({ port: 8000 }); 