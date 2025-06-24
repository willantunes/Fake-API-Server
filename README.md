# Refactoring Runbook: Fake API Server New iUI

This runbook guides the refactoring of the Fake API Server New iUI project to align with best practices for Deno, Hono, HTMX, and clean code architecture. Use this as a checklist and reference for your refactor.

---

## 1. Current State
- **Monolithic main.tsx**: Most logic (routing, middleware, business, helpers) is in a single large file.
- **Some modularization**: There are `components/`, `services/`, `routes/`, `types/`, and `utils/` directories, but boundaries are unclear.
- **No automated tests**: No Deno or other test files found.
- **Authentication, error handling, and logging**: Logic is duplicated and scattered.
- **HTMX**: Used, but not fully leveraged for partial updates or advanced UX.

---

## 2. Target Architecture & Directory Structure

**Proposed structure:**

```
/src
  /controllers    # Request handlers (business logic)
  /middleware     # Auth, logging, error handling
  /services       # Business/domain logic
  /repositories   # Data access (if needed)
  /routes         # Route definitions (grouped by feature)
  /utils          # Pure helpers
  /components     # JSX UI components
  /types          # TypeScript types
  /tests          # Unit/integration tests
```

---

## 3. Refactor Plan (Step-by-Step)

### 3.1. Modularize main.tsx
- [x] **Extract route handlers** to `/controllers`.
- [x] **Move middleware** (auth, logger, static, layout) to `/middleware`.
  - [x] Logger middleware
  - [x] Static file middleware
  - [x] Layout middleware
  - [x] Auth middleware
- [x] **Move helper functions** (e.g., template string processing, request body parsing) to `/utils`.
- [x] **Keep only app setup and route registration** in `main.tsx`.
- [x] **Group routes by feature in `/routes` and register routes in `main.tsx` only**

### 3.2. Middleware Improvements
- [ ] **Centralize authentication**: Create `/middleware/auth.ts` for all token extraction and validation logic.
- [ ] **Centralize error handling**: Add `/middleware/errorHandler.ts` for consistent error responses.
- [ ] **Centralize logging**: Use a single logger middleware.

### 3.3. Service & Repository Pattern
- [ ] **Define interfaces** for repositories in `/repositories`.
- [ ] **Move business logic** (e.g., traffic log storage, API matching) to `/services`.
- [ ] **Inject dependencies** via context or constructor.

### 3.4. Route Organization
- [x] **Group routes by feature in `/routes` and register routes in `main.tsx` only**

### 3.5. HTMX Best Practices
- [x] **Create dedicated endpoints** for partial updates (fragments).
- [x] **Use HTMX response headers** (e.g., `HX-Redirect`, `HX-Refresh`).
- [x] **Document HTMX patterns** in code and README.

### 3.6. Error Handling
- [x] **Use try/catch** in all async handlers.
- [x] **Return structured error responses** (JSON for APIs, HTML for UI).
- [x] **Log errors with context**.

### 3.7. Authentication
- [ ] **Move all token logic** to middleware.
- [ ] **Support multiple auth types** via strategy pattern if needed.
- [ ] **Document the flow** in `/middleware/auth.ts` and README.

### 3.8. Testing
- [ ] **Add unit tests** for utils, services, and middleware in `/tests`.
- [ ] **Add integration tests** for routes.
- [ ] **Use Deno's built-in test runner.**

### 3.9. Documentation
- [ ] **Update README** with architecture, setup, and usage.
- [ ] **Document each module** with JSDoc/TSDoc.
- [ ] **Add code comments for complex logic.**

---

## 4. Best Practices Checklist
- [x] Each file < 300 lines (except UI components)
- [x] Extract route handlers to `/controllers`
- [x] Move middleware (auth, logger, static, layout) to `/middleware`
  - [x] Logger middleware
  - [x] Static file middleware
  - [x] Layout middleware
  - [x] Auth middleware
- [x] All helpers in `/utils`
- [x] Keep only app setup and route registration in `main.tsx`
- [x] Group routes by feature in `/routes` and register routes in `main.tsx` only
- [ ] No business logic in route files
- [x] All middleware in `/middleware`
- [x] All helpers in `/utils`
- [x] All types in `/types`
  - All context and domain types are now defined in `/types` and imported where needed.
- [ ] All tests in `/tests`
  - No test files or test directories were found in the codebase. It is recommended to add a `/tests` directory with Deno tests for key modules and routes.
- [x] Consistent error handling and logging
- [x] Modular, composable route registration
  - All feature routes are registered in main.tsx using app.route(), and controllers are imported and used for individual handlers.
- [x] HTMX endpoints return fragments, not full pages
  - All HTMX endpoints return fragments, use HX-Redirect and HX-Refresh as appropriate, and follow best practices for partial updates.
- [x] Use HTMX response headers (e.g., `HX-Redirect`, `HX-Refresh`)
  - All relevant endpoints set these headers for navigation and partial updates as appropriate.
- [x] Document HTMX patterns in code and README
- [x] Authentication is DRY and centralized
  - All authentication logic is now handled in a single middleware (authIntrospectionMiddleware), and no routes or controllers duplicate authentication checks.
- [x] README and code are well documented
  - The README now documents architecture, setup, usage, and authentication flow. Code is documented with comments and JSDoc/TSDoc where appropriate.
- [x] Improve error handling (try/catch, structured responses, contextual logging)
  - try/catch blocks, contextual logging, and structured error responses (HTML for UI, JSON for API/HTMX) were added to all relevant POST handlers in mockApi routes.

---

## 5. References
- [Deno Best Practices](https://deno.land/manual@v1.40.0/basics/best_practices)
- [Hono Documentation](https://hono.dev/docs)
- [HTMX Patterns](https://htmx.org/docs/)
- [Clean Architecture](https://github.com/ryanmcdermott/clean-code-javascript)

---

**Use this runbook as a checklist and guide for your refactor.**

# Fake API Server New iUI

Servidor de API Fake (Mock API Server) construído com Deno, Hono e HTMX para facilitar o desenvolvimento e testes de integrações.

## Migrating to Central Auth (Autenticação Centralizada)

A partir desta versão, todas as rotas de front-end e de API são protegidas pelo nosso servidor de autenticação central.

### Variáveis de Ambiente Necessárias

- `CENTRAL_AUTH_URL` (opcional): URL base do servidor de autenticação central (padrão: `http://localhost:8888`).
- Para o servidor de autenticação central (Auth0 Gateway), use estas variáveis:
  ```dotenv
  AUTH0_DOMAIN=dev-ulp8mj8hsi4j2ofh.us.auth0.com
  AUTH0_CLIENT_ID=FWjzQfi1yeIGVqBa7ON7p1sy7Iy6LAY9
  AUTH0_CLIENT_SECRET=-A84NCTmtEkKfAnzUzrzOt4I8q4L6JdC7aO-xQoeCdDezQ6GdpVSTCMe6giWYDXk
  AUTH0_CALLBACK_URL=https://your-app.com/callback
  AUTH0_LOGOUT_REDIRECT=https://your-app.com/logout
  AUTH0_MGMT_CLIENT_ID=<your-mgmt-client-id>
  AUTH0_MGMT_CLIENT_SECRET=<your-mgmt-client-secret>
  ```

### Fluxos de Login e Logout

- **Login**: 
  ```http
  GET /login?return_to=/caminho-desejado
  ```
  - Redireciona para o servidor de autenticação central.
  - Para requisições HTMX, utiliza cabeçalho `HX-Redirect`.

- **Logout**:
  ```http
  POST /api/auth/logout?return_to=/caminho-desejado
  ```
  - Encerra a sessão no servidor de autenticação central e redireciona de volta.
  - Para HTMX, utiliza cabeçalho `HX-Redirect`.

### Exemplos de Integração de Cliente

#### HTMX
```html
<button
  hx-get="/login?return_to=/"
  hx-swap="none"
>
  Entrar
</button>
```

#### Deno (Hono)
```ts
import { Hono } from "hono/mod.ts";

const app = new Hono();

app.get("/login", (c) => {
  const returnTo = encodeURIComponent("http://localhost:3000/callback");
  return c.redirect(`/login?return_to=${returnTo}`);
});

app.post("/api/auth/logout", (c) => {
  const returnTo = encodeURIComponent("/");
  return c.redirect(`/logout?return_to=${returnTo}`);
});
```

### Executando a Aplicação

```bash
export CENTRAL_AUTH_URL=http://localhost:8888
# (Opcionalmente configure as variáveis do servidor Auth0 Gateway)
deno run -A src/main.tsx
```

## Uso Básico

- Navegue em `/` para Início.
- `/mock-api` para CRUD de APIs mock.
- `/traffic` para visualizar logs de tráfego.

Por favor, consulte também o arquivo `