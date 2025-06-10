/** @jsxImportSource hono/jsx */
import { Hono, Context } from "hono/mod.ts";
import { loginHandler, callbackHandler, logoutHandler, introspectTokenHandler } from "../utils/auth.ts";

const auth = new Hono();

// Redirect root to login to avoid 404
auth.get("/", (c: Context) => c.redirect("/login"));

// Redirect to Auth0 for login
auth.get("/login", loginHandler);

// Callback and logout routes
auth.get("/callback", callbackHandler);
auth.get("/logout", logoutHandler);

// API endpoint for token introspection
auth.post("/api/introspect", introspectTokenHandler);

export default auth; 