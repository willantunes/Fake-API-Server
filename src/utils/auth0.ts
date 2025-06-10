import { env } from "./env.ts";

// Normalize domain and construct URLs
const domain = env.AUTH0_DOMAIN.replace(/\/+$/, "");
const baseUrl = `https://${domain}`;
const mgmtAudience = `${baseUrl}/api/v2/`;

let mgmtToken: string;
let tokenExpiry = 0;

/**
 * Retrieve or refresh Auth0 Management API token
 */
export async function getMgmtToken(): Promise<string> {
  if (mgmtToken && Date.now() < tokenExpiry) {
    return mgmtToken;
  }
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.AUTH0_MGMT_CLIENT_ID,
      client_secret: env.AUTH0_MGMT_CLIENT_SECRET,
      audience: mgmtAudience,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to obtain management token: ${res.status}`);
  }
  const json = await res.json();
  mgmtToken = json.access_token;
  tokenExpiry = Date.now() + json.expires_in * 1000 - 60000; // refresh 1 min early
  return mgmtToken;
}

/**
 * Auth0 user shape for our UI
 */
export interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
  created_at: string;
  last_login: string;
  blocked?: boolean;
  app_metadata?: Record<string, any>;
}

/**
 * List all users from Auth0
 */
export async function listAuth0Users(): Promise<Auth0User[]> {
  const token = await getMgmtToken();
  const res = await fetch(
    `${mgmtAudience}users?fields=user_id,email,name,created_at,last_login,blocked,app_metadata&include_fields=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to list users: ${res.status}`);
  }
  return await res.json();
}

/**
 * Sign up a new user via Auth0 Database Connection (Authentication API)
 */
export async function createAuth0User(data: {
  email: string;
  password: string;
  name?: string;
  app_metadata?: Record<string, any>;
}): Promise<Auth0User> {
  // Use Auth0 Authentication API signup endpoint (no M2M token required)
  const res = await fetch(`${baseUrl}/dbconnections/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.AUTH0_CLIENT_ID,
      email: data.email,
      password: data.password,
      connection: env.AUTH0_DATABASE_CONNECTION,
      name: data.name,
      user_metadata: data.app_metadata,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    // Extract a human-readable message from Auth0 response
    const message = typeof (json as any).error_description === 'string'
      ? (json as any).error_description
      : typeof (json as any).description === 'string'
        ? (json as any).description
        : typeof (json as any).error === 'string'
          ? (json as any).error
          : JSON.stringify(json);
    throw new Error(`Failed to signup user: ${message}`);
  }
  // Map signup response to Auth0User shape (only limited fields)
  return {
    user_id: json._id,
    email: json.email,
    name: data.name,
    created_at: json.created_at,
    last_login: json.created_at,
    blocked: false,
    app_metadata: data.app_metadata,
  };
}

/**
 * Update an existing Auth0 user
 */
export async function updateAuth0User(
  user_id: string,
  data: {
    email?: string;
    name?: string;
    app_metadata?: Record<string, any>;
    blocked?: boolean;
  }
): Promise<Auth0User> {
  const token = await getMgmtToken();
  const res = await fetch(`${mgmtAudience}users/${encodeURIComponent(user_id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update user: ${res.status}`);
  }
  return await res.json();
}

/**
 * Delete a user in Auth0
 */
export async function deleteAuth0User(user_id: string): Promise<void> {
  const token = await getMgmtToken();
  const res = await fetch(`${mgmtAudience}users/${encodeURIComponent(user_id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to delete user: ${res.status}`);
  }
}

/**
 * Change a user's password in Auth0 via the Management API
 */
export async function changeAuth0Password(user_id: string, newPassword: string): Promise<void> {
  const token = await getMgmtToken();
  const res = await fetch(`${mgmtAudience}users/${encodeURIComponent(user_id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: newPassword, connection: env.AUTH0_DATABASE_CONNECTION }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to change password: ${res.status} ${JSON.stringify(err)}`);
  }
}

// Add Auth0 client management functions
export interface Auth0Client {
  client_id: string;
  name: string;
  description?: string;
  callbacks: string[];
  client_secret?: string;
}

export async function listAuth0Clients(): Promise<Auth0Client[]> {
  const token = await getMgmtToken();
  const res = await fetch(
    `${mgmtAudience}clients?fields=name,client_id,description,callbacks&include_fields=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to list clients: ${res.status}`);
  }
  const clients = await res.json();
  return clients.map((client: any) => ({
    ...client,
    callbacks: client.callbacks || [],
  }));
}

/**
 * Fetch the current callbacks and allowed logout URLs for a given Auth0 client
 */
async function fetchClientSettings(clientId: string): Promise<{ callbacks: string[]; allowed_logout_urls: string[] }> {
  const token = await getMgmtToken();
  const res = await fetch(
    `${mgmtAudience}clients/${encodeURIComponent(clientId)}?fields=callbacks,allowed_logout_urls&include_fields=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch client settings: ${res.status}`);
  }
  const json = await res.json();
  return {
    callbacks: json.callbacks || [],
    allowed_logout_urls: json.allowed_logout_urls || [],
  };
}

/**
 * Update the central-auth application's callbacks and logout URLs to include new client URLs
 */
async function updateCentralAuthAppUrls(newUrls: string[]): Promise<void> {
  const centralClientId = env.AUTH0_CLIENT_ID;
  // Merge with existing settings
  const settings = await fetchClientSettings(centralClientId);
  const mergedCallbacks = Array.from(new Set([...settings.callbacks, ...newUrls]));
  const mergedLogout = Array.from(new Set([...settings.allowed_logout_urls, ...newUrls]));
  const token = await getMgmtToken();
  const res = await fetch(
    `${mgmtAudience}clients/${encodeURIComponent(centralClientId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ callbacks: mergedCallbacks, allowed_logout_urls: mergedLogout }),
    }
  );
  if (!res.ok) {
    console.error(`Failed to update central-auth client URLs: ${res.status}`);
  }
}

export async function createAuth0Client(data: { name: string; description?: string; callbacks: string[] }): Promise<Auth0Client> {
  const token = await getMgmtToken();
  const callbacks = data.callbacks.length > 0 ? data.callbacks : ["http://localhost:8887/callback"];
  const body = {
    name: data.name,
    description: data.description,
    callbacks,
    allowed_logout_urls: callbacks,
    token_endpoint_auth_method: "client_secret_post",
    grant_types: ["authorization_code", "refresh_token", "client_credentials"],
    app_type: "regular_web",
    oidc_conformant: true
  };
  const res = await fetch(
    `${mgmtAudience}clients`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }
  );
  const created = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to create client: ${res.status} ${JSON.stringify(created)}`);
  }
  // Auto-create client grant to allow client_credentials on Management API
  try {
    await fetch(
      `${mgmtAudience}client-grants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ client_id: created.client_id, audience: mgmtAudience, scope: [] }),
      }
    );
  } catch {
    // ignore errors here
  }
  // Ensure central-auth application is updated with new URLs
  try {
    await updateCentralAuthAppUrls(callbacks);
  } catch (e) {
    console.error('Error updating central-auth app URLs:', e);
  }
  return created;
}

export async function updateAuth0Client(
  clientId: string,
  data: { name?: string; description?: string; callbacks?: string[] }
): Promise<Auth0Client> {
  const token = await getMgmtToken();
  // Prepare payload, include logout URLs when callbacks updated
  const payload: Record<string, unknown> = {};
  if (data.name) payload.name = data.name;
  if (data.description) payload.description = data.description;
  if (data.callbacks) {
    payload.callbacks = data.callbacks;
    payload.allowed_logout_urls = data.callbacks;
  }
  const res = await fetch(
    `${mgmtAudience}clients/${encodeURIComponent(clientId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to update client: ${res.status} ${JSON.stringify(err)}`);
  }
  // If callbacks were updated, sync central-auth application
  if (data.callbacks) {
    try {
      await updateCentralAuthAppUrls(data.callbacks);
    } catch (e) {
      console.error('Error updating central-auth app URLs:', e);
    }
  }
  return await res.json();
}

export async function deleteAuth0Client(clientId: string): Promise<void> {
  const token = await getMgmtToken();
  const res = await fetch(
    `${mgmtAudience}clients/${encodeURIComponent(clientId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to delete client: ${res.status} ${JSON.stringify(err)}`);
  }
} 