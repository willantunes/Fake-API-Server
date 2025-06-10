import type { Context, Next } from "hono/mod.ts";
import {
  getCookies,
  setCookie,
  jwtVerify,
  createRemoteJWKSet,
  JWTPayload,
} from "../deps.ts";
import { env } from "./env.ts";

console.log("[startup] AUTH0_CLIENT_ID:", env.AUTH0_CLIENT_ID);

// Normalize Auth0 domain and URLs
const domain = env.AUTH0_DOMAIN.replace(/\/+$/, "");
// Construct base URL (no trailing slash) and issuer (with trailing slash) for JWT validation
const baseUrl = `https://${domain}`;
const issuer = `${baseUrl}/`;
// JSON Web Key Set URL
const JWKS = createRemoteJWKSet(new URL(`${baseUrl}/.well-known/jwks.json`));

/**
 * Redirects the user to Auth0's /authorize endpoint
 */
export async function loginHandler(c: Context) {
  // Debug: log login request details
  console.log("[loginHandler] URL:", c.req.url);
  // Generate state ID and nonce
  const stateId = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const reqUrl = new URL(c.req.url);
  const origin = reqUrl.origin;
  // Dynamically compute callback URI
  const callbackUri = `${origin}/callback`;

  // Determine post-login return path: explicit param, same-origin referer, or fallback to configured default
  const explicit = reqUrl.searchParams.get("return_to");
  const referer = c.req.header("Referer");
  let returnTo: string;
  if (explicit) {
    returnTo = explicit;
  } else if (referer && referer.startsWith(origin)) {
    returnTo = referer;
  } else {
    returnTo = `${origin}/dashboard`;
  }
  console.log("[loginHandler] stateId:", stateId, "nonce:", nonce, "returnTo:", returnTo);

  // Build state object and encode
  const stateObj = { id: stateId, returnTo };
  const state = btoa(JSON.stringify(stateObj));

  // Determine secure cookie flag based on host
  const host = new URL(c.req.url).host;
  const secureFlag = !host.startsWith("localhost");
  console.log("[loginHandler] host:", host, "secureFlag:", secureFlag);

  // Store OIDC state and nonce in cookies that persist across Auth0 redirects
  const stateSameSite = secureFlag ? "None" : "Lax";
  setCookie(c.res.headers, {
    name: "oidc_state",
    value: stateId,
    httpOnly: true,
    secure: secureFlag,
    sameSite: stateSameSite,
    path: "/",
  });
  setCookie(c.res.headers, {
    name: "oauth_nonce",
    value: nonce,
    httpOnly: true,
    secure: secureFlag,
    sameSite: stateSameSite,
    path: "/",
  });

  // LOG all Set-Cookie headers for debugging
  console.log("[loginHandler] Response Set-Cookie headers:");
  for (const [name, val] of c.res.headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      console.log(val);
    }
  }

  // Redirect to Auth0 authorize endpoint
  const authorizeUrl = new URL(`${baseUrl}/authorize`);
  authorizeUrl.searchParams.set("client_id", env.AUTH0_CLIENT_ID);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid profile email");
  authorizeUrl.searchParams.set("redirect_uri", callbackUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", nonce);

  // Support HTMX redirect
  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", authorizeUrl.toString());
    return c.text("");
  }
  return c.redirect(authorizeUrl.toString());
}

/**
 * Handles the OAuth2 callback, exchanges code, verifies ID token, and sets session cookie
 */
export async function callbackHandler(c: Context) {
  // Debug: log callback invocation
  console.log("[callbackHandler] URL:", c.req.url);
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code") || "";
  const returnedState = url.searchParams.get("state") || "";
  console.log("[callbackHandler] code:", code, "returnedState:", returnedState);

  // ADDED LOGGING
  console.log("[callbackHandler] Raw Cookie Header:", c.req.header("Cookie"));
  const cookies = getCookies(c.req.raw.headers);
  console.log("[callbackHandler] Parsed Cookies:", JSON.stringify(cookies));

  // Parse state object
  let stateObj: { id: string; returnTo: string };
  try {
    stateObj = JSON.parse(atob(returnedState));
    console.log("[callbackHandler] parsed stateObj:", stateObj);
  } catch {
    console.error("[callbackHandler] Invalid state format, cannot parse");
    return c.text("Invalid state", { status: 400 });
  }

  const storedStateId = cookies["oidc_state"];
  console.log("[callbackHandler] storedStateId cookie:", storedStateId);
  if (!storedStateId || storedStateId !== stateObj.id) {
    console.error("[callbackHandler] State mismatch: expected", stateObj.id, "got", storedStateId);
    return c.text("Invalid state", { status: 400 });
  }

  // Exchange code for tokens
  const callbackOrigin = new URL(c.req.url).origin;
  const callbackUri2 = `${callbackOrigin}/callback`;
  console.log("[callbackHandler] exchanging code for tokens");
  const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: callbackUri2,
    }),
  });
  const tokenJson = await tokenResponse.json();
  console.log("[callbackHandler] tokenResponse status:", tokenResponse.status, "body:", tokenJson);
  if (!tokenResponse.ok) {
    console.error("[callbackHandler] Token exchange failed", tokenJson);
    return c.text(tokenJson.error_description || "Token exchange failed", { status: tokenResponse.status });
  }

  const idToken = tokenJson.id_token as string;
  // Verify the ID token
  const { payload } = (await jwtVerify(idToken, JWKS, {
    issuer,
    audience: env.AUTH0_CLIENT_ID,
  })) as { payload: JWTPayload };
  console.log("[callbackHandler] verified ID token payload sub:", payload.sub);

  // Set session cookie for later API calls
  const secureFlag2 = !new URL(c.req.url).host.startsWith("localhost");
  console.log("[callbackHandler] setting session cookie. secureFlag2:", secureFlag2);
  if (secureFlag2) {
    setCookie(c.res.headers, {
      name: "session",
      value: idToken,
      httpOnly: true,
      secure: secureFlag2,
      sameSite: "None",
      domain: ".iliberty.com.br",
      path: "/",
    });
  } else {
    setCookie(c.res.headers, {
      name: "session",
      value: idToken,
      httpOnly: true,
      secure: secureFlag2,
      sameSite: "Lax",
      path: "/",
    });
  }

  // Clear OIDC state and nonce cookies
  console.log("[callbackHandler] clearing state and nonce cookies");
  setCookie(c.res.headers, {
    name: "oidc_state",
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: secureFlag2,
    sameSite: "Lax",
    path: "/",
  });
  setCookie(c.res.headers, {
    name: "oauth_nonce",
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: secureFlag2,
    sameSite: "Lax",
    path: "/",
  });

  // LOG all Set-Cookie headers for debugging
  console.log("[callbackHandler] Response Set-Cookie headers:");
  for (const [name, val] of c.res.headers.entries()) {
    if (name.toLowerCase() === "set-cookie") {
      console.log(val);
    }
  }

  // Determine redirect after callback: returnTo from state or fallback to configured default
  const redirectTo = stateObj.returnTo || `${new URL(c.req.url).origin}/dashboard`;
  console.log("[callbackHandler] redirecting to:", redirectTo);
  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", redirectTo);
    return c.text("");
  }
  return c.redirect(redirectTo);
}

/**
 * Logs the user out by clearing the session cookie and redirecting to Auth0 logout
 */
export function logoutHandler(c: Context) {
  // Parse optional return_to param and compute default
  const reqUrl = new URL(c.req.url);
  const explicit = reqUrl.searchParams.get("return_to");
  const host = reqUrl.host;
  const secureFlag = !host.startsWith("localhost");
  // Default returnTo to the application root if none provided
  const returnTo = explicit || reqUrl.origin;

  // Clear session cookie across all subdomains (prod) or just localhost (dev)
  if (secureFlag) {
    setCookie(c.res.headers, {
      name: "session",
      value: "",
      maxAge: 0,
      httpOnly: true,
      secure: secureFlag,
      sameSite: "None",
      domain: ".iliberty.com.br",
      path: "/",
    });
  } else {
    setCookie(c.res.headers, {
      name: "session",
      value: "",
      maxAge: 0,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
    });
  }

  // Redirect to Auth0 logout endpoint with proper returnTo
  const logoutUrl = new URL(`${baseUrl}/v2/logout`);
  logoutUrl.searchParams.set("client_id", env.AUTH0_CLIENT_ID);
  logoutUrl.searchParams.set("returnTo", returnTo);

  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", logoutUrl.toString());
    return c.text("");
  }
  return c.redirect(logoutUrl.toString());
}

/**
 * Middleware to protect routes by validating the JWT in the session cookie
 */
export async function authMiddleware(c: Context, next: Next) {
  const cookies = getCookies(c.req.raw.headers);
  const token = cookies["session"];
  if (!token) {
    // For HTML pages, redirect to login
    if (c.req.header("HX-Request") !== "true" && (!c.req.path.startsWith("/api/") && c.req.header("accept")?.includes("text/html"))) {
        return c.redirect("/login");
    }
    // For API calls, return 401
    return c.json({ error: "Unauthorized: No session token" }, 401);
  }
  try {
    const { payload } = (await jwtVerify(token, JWKS, {
      issuer,
      audience: env.AUTH0_CLIENT_ID,
    })) as { payload: JWTPayload };
    // Attach user info to context
    c.set("user", {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
    });
    c.set("isAuthenticated", true);
    return next();
  } catch (_e) {
    // For HTML pages, redirect to login
    if (c.req.header("HX-Request") !== "true" && (!c.req.path.startsWith("/api/") && c.req.header("accept")?.includes("text/html"))) {
        return c.redirect("/login");
    }
    // For API calls, return 401
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }
}

/**
 * Handles token introspection for API consumers.
 */
export async function introspectTokenHandler(c: Context) {
    // Debug: inspect incoming cookies and authorization header
    const cookies = getCookies(c.req.raw.headers);
    const authHeader = c.req.header("Authorization") || c.req.header("authorization");
    console.log("[introspectTokenHandler] cookies:", cookies);
    console.log("[introspectTokenHandler] authHeader:", authHeader);
    // Allow token either via session cookie or Bearer Authorization header
    let token = cookies["session"];
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring("Bearer ".length);
    }
    console.log("[introspectTokenHandler] token:", token);

    if (!token) {
        return c.json({ active: false, error: "No session token provided" }, 401);
    }

    try {
        const { payload } = (await jwtVerify(token, JWKS, {
            issuer,
            audience: env.AUTH0_CLIENT_ID,
        })) as { payload: JWTPayload };
        // Fetch roles from Auth0 Management API
        let rolesArray: string[] = [];
        try {
            // Obtain Management API token
            const mgmtResp = await fetch(`${baseUrl}/oauth/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grant_type: "client_credentials",
                    client_id: env.AUTH0_MGMT_CLIENT_ID,
                    client_secret: env.AUTH0_MGMT_CLIENT_SECRET,
                    audience: `${baseUrl}/api/v2/`,
                }),
            });
            const mgmtJson = await mgmtResp.json();
            if (mgmtResp.ok && mgmtJson.access_token) {
                const mgmtToken = mgmtJson.access_token as string;
                // Fetch user metadata
                const userResp = await fetch(`${baseUrl}/api/v2/users/${payload.sub}`, {
                    headers: { "Authorization": `Bearer ${mgmtToken}` },
                });
                const userJson = await userResp.json();
                if (userResp.ok && userJson.app_metadata && Array.isArray(userJson.app_metadata.roles)) {
                    rolesArray = userJson.app_metadata.roles;
                } else {
                    console.error("[introspectTokenHandler] Roles not found in user metadata", userJson);
                }
            } else {
                console.error("[introspectTokenHandler] Failed to get management token", mgmtJson);
            }
        } catch (err) {
            console.error("[introspectTokenHandler] Error fetching roles from Management API", err);
        }
        const isAdmin = rolesArray.includes("admin");
        const role = rolesArray.length > 0 ? rolesArray[0] : undefined;
        return c.json({
            active: true,
            client_id: payload.aud,
            user: {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                isAdmin,
                role,
            },
            exp: payload.exp,
            iat: payload.iat,
        });
    } catch (err: any) {
        console.error("Introspection error:", err.message);
        return c.json({ active: false, error: "Invalid token" }, 401);
    }
} 