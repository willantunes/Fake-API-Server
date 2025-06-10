/** @jsxImportSource hono/jsx */
// Import Hono TSX-based server (v4)
import { Hono, Context, Next } from "hono/mod.ts";
import { serve } from "std/http/server.ts";
import { serveStatic } from "hono/middleware.ts";
import { logger } from "hono/middleware.ts";
import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";

import authApp from "./routes/auth.tsx";
import usersApp from "./routes/users.tsx";
import settingsApp from "./routes/settings.tsx";
import clientsApp from "./routes/clients.tsx";
import { NewLayout } from "./components/NewLayout.tsx";
import { authMiddleware } from "./utils/auth.ts";
import { listAuth0Users } from "./utils/auth0.ts";

// Define context variables
type Variables = {
  user?: { id: string; name: string; isAdmin?: boolean };
  isAuthenticated?: boolean;
  title?: string;
  layoutProps?: object;
  breadcrumbs?: Array<{ href?: string; label: string }>;
  // Role-based UI controls
  adminCount?: number;
  currentUserIsAdmin?: boolean;
};

// Root app
const app = new Hono<{ Variables: Variables }>();

// Inline CORS for API routes: allow cross-origin cookies from consumer app
app.use("/api/*", async (c, next) => {
  const origin = c.req.header("Origin") || "";
  // Reflect the Origin header to allow cross-site cookies
  c.header("Vary", "Origin");
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (c.req.method === "OPTIONS") {
    return c.text("", 204);
  }
  await next();
});

// Logger middleware
app.use("*", logger());

// Static assets - serve first to ensure they have priority
app.use("/static/*", serveStatic({ root: "./" }));

// After serving static files, log the request
app.use("/static/*", async (c, next) => {
  console.log(`[Static] ${c.req.method} ${new URL(c.req.url).pathname}`);
  await next();
});

// Layout middleware (cast to any to work around type mismatches)
const LayoutMiddleware = jsxRenderer(
  ((props: any, c: any) => {
    const ctx = useRequestContext();
    return NewLayout({
      title: props.title || ctx.get("title") || "Administração",
      breadcrumbs: props.breadcrumbs || ctx.get("breadcrumbs"),
      activePath: new URL(ctx.req.url).pathname,
      children: props.children ?? [],
    });
  }) as any,
  { docType: "<!DOCTYPE html>" }
);

// Bypass layout for API routes, auth routes, and HTMX requests, apply layout otherwise
app.use("*", async (c: Context<{ Variables: Variables }>, next: Next) => {
  const path = c.req.path;
  if (
    path.startsWith('/api/') ||
    c.req.header('HX-Request') === 'true' ||
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/callback') ||
    path.startsWith('/logout')
  ) {
    await next();
  } else {
    // Ensure user is authenticated to set context user
    await authMiddleware(c, async () => {});
    console.log(`Standard request: ${c.req.method} ${path} - Applying layout.`);
    // Compute role-based layout variables
    try {
      const allUsers = await listAuth0Users();
      const adminCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
      const currentUserCtx = c.get("user") as { id: string };
      const currentUserIsAdmin = !!allUsers.find(u => u.user_id === currentUserCtx.id)?.app_metadata?.roles?.includes('admin');
      c.set("adminCount", adminCount);
      c.set("currentUserIsAdmin", currentUserIsAdmin);
    } catch {
      c.set("adminCount", 0);
      c.set("currentUserIsAdmin", false);
    }
    await (LayoutMiddleware as any)(c, next);
  }
});

// Auth Routes
app.route("/", authApp);

// Users Routes
app.route("/users", usersApp);

// Settings Route
app.route("/settings", settingsApp);

// Clients Route
app.route("/clients", clientsApp);

// Root route with dashboard
app.get("/dashboard", authMiddleware, async (c) => {
  c.set("title", "Dashboard");
  
  // Fetch real user data from Auth0 and compute metrics
  const users = await listAuth0Users();
  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.blocked).length;
  const adminUsers = users.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  
  // Determine current user's admin status on dashboard
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = users.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  
  return c.render(
    <div class="container mx-auto px-4 pt-2 pb-4">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p class="text-gray-600 mt-2">Bem-vindo ao sistema de gerenciamento de usuários</p>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Total de Usuários</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{totalUsers}</p>
            </div>
            <div class="bg-blue-100 p-2.5 rounded-lg text-blue-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">people</span>
            </div>
          </div>
          <div class="mt-2">
            {(adminUsers === 0 || currentUserIsAdmin) && (
              <a href="/users" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
                Ver todos
                <span class="material-icons text-sm ml-1">arrow_forward</span>
              </a>
            )}
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Usuários Ativos</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{activeUsers}</p>
            </div>
            <div class="bg-green-100 p-2.5 rounded-lg text-green-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">check_circle</span>
            </div>
          </div>
          <div class="mt-2">
            {(adminUsers === 0 || currentUserIsAdmin) && (
              <a href="/users?status=active" class="text-sm text-green-600 hover:text-green-800 inline-flex items-center">
                Ver ativos
                <span class="material-icons text-sm ml-1">arrow_forward</span>
              </a>
            )}
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Administradores</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{adminUsers}</p>
            </div>
            <div class="bg-purple-100 p-2.5 rounded-lg text-purple-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">admin_panel_settings</span>
            </div>
          </div>
          <div class="mt-2">
            {(adminUsers === 0 || currentUserIsAdmin) && (
              <a href="/users?role=admin" class="text-sm text-purple-600 hover:text-purple-800 inline-flex items-center">
                Ver administradores
                <span class="material-icons text-sm ml-1">arrow_forward</span>
              </a>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      {(adminUsers === 0 || currentUserIsAdmin) && (
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/users" class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div class="bg-blue-100 p-2 rounded-lg text-blue-600">
              <span class="material-icons">people</span>
            </div>
            <div class="ml-4">
              <h3 class="font-medium text-gray-900">Gerenciar Usuários</h3>
              <p class="text-sm text-gray-600">Ver e gerenciar todos os usuários</p>
            </div>
          </a>
          
          <a href="/users?status=inactive" class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors">
            <div class="bg-yellow-100 p-2 rounded-lg text-yellow-600">
              <span class="material-icons">person_off</span>
            </div>
            <div class="ml-4">
              <h3 class="font-medium text-gray-900">Usuários Inativos</h3>
              <p class="text-sm text-gray-600">Gerenciar usuários inativos</p>
            </div>
          </a>
          
          <a href="/users?role=manager" class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <div class="bg-green-100 p-2 rounded-lg text-green-600">
              <span class="material-icons">supervisor_account</span>
            </div>
            <div class="ml-4">
              <h3 class="font-medium text-gray-900">Gerentes</h3>
              <p class="text-sm text-gray-600">Gerenciar usuários com papel de gerente</p>
            </div>
          </a>
        </div>
      </div>
      )}
    </div>
  );
});

// Run the server
console.log("Server running on http://localhost:8888");
serve(app.fetch, { port: 8888 }); 