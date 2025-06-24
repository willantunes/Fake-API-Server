# Autenticação e Autorização Centralizada com Auth0

Este documento descreve a arquitetura, as melhores práticas e os passos de integração do Auth0 como mecanismo de autenticação e autorização para todo o portfólio de aplicações (internas e externas) da empresa.

## 1. Visão Geral

- **Auth0 como Provedor de Identidade (IDP):** Será responsável pela autenticação (AuthN) e autorização (AuthZ) centralizadas.
- **Tenants Separados:**
  - Tenant Corporativo: para aplicações internas e SSO de funcionários.
  - Tenant de Clientes: para a SaaS LIS, isolando dados e configurações de segurança.
- **Universal Login:** Uso do Universal Login customizado para garantir experiência única e marca consistente.
- **API Gateway de Autenticação:** Camada intermediária que expõe apenas as operações necessárias (login, refresh, gestão de usuários, atribuição de roles) e valida tokens.

## 2. Estrutura de Tenants

| Tenant              | Finalidade                         | Domínio Customizado            |
|---------------------|------------------------------------|--------------------------------|
| Corporativo         | Aplicações internas e SSO          | auth.empresa.com               |
| Clientes (SaaS LIS) | Clientes externos da SaaS          | auth.lis.empresa.com           |

## 3. Fluxo de Autenticação

1. O cliente (SPA, Mobile, .NET, etc.) redireciona o usuário para o Universal Login.
2. Auth0 autentica e decide em qual tenant operar (baseado em domínio, parâmetros ou subdomínio).
3. O Auth0 retorna o ID Token e o Access Token ao cliente.
4. O cliente inclui o Access Token nas requisições ao API Gateway.
5. O Gateway valida o token (verifica assinatura, expiração, escopos e roles).
6. O Gateway aplica RBAC via middleware e encaminha a chamada aos microserviços.

## 4. Camada de API Gateway

- **EndPoints Expostos:**
  - `/login`: inicia fluxo OIDC (redirect).
  - `/logout`: encerra a sessão.
  - `/refresh`: renova tokens (refresh tokens rotativos).
  - `/users`: criação, atualização, remoção de usuários.
  - `/roles`: atribuição e remoção de roles.
  - `/introspect`: introspecção de tokens.
- **Responsabilidades:**
  - Encapsular a Management API do Auth0.
  - Aplicar políticas de segurança (rate limit, CORS, etc.).
  - Fornecer SDK cliente leve (JS/TS, .NET, etc.) para integração.

## 5. Integração de Clientes

### 5.1 TypeScript / React

```ts
import createAuth0Client from '@auth0/auth0-spa-js';

const auth0 = await createAuth0Client({
  domain: 'auth.empresa.com',
  client_id: 'CLIENT_ID',
  redirect_uri: window.location.origin,
  audience: 'API_GATEWAY_AUDIENCE',
});

// Exemplo de login
await auth0.loginWithRedirect();

// Após callback, obtém token silenciosamente
const token = await auth0.getTokenSilently();
```

### 5.2 .NET Core 6+

```csharp
builder.Services.AddAuth0WebAppAuthentication(options => {
  options.Domain = "auth.empresa.com";
  options.ClientId = Configuration["Auth0:ClientId"];
  options.ClientSecret = Configuration["Auth0:ClientSecret"];
  options.Scope = "openid profile email";
});

// Protegendo APIs:
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(options => {
    options.Authority = "https://auth.empresa.com/";
    options.Audience = "API_GATEWAY_AUDIENCE";
  });
```

## 6. Gerenciamento de Sessões e Tokens

- **Access Tokens Curto Prazo:** 5-15 minutos.
- **Refresh Tokens Rotativos:** habilitar Refresh Token Rotation.
- **Armazenamento Seguro:** usar cookies HTTP-only e same-site=strict ou storage seguro.
- **Timeouts:** configurar idle timeout e absolute timeout no Auth0.

## 7. RBAC e Permissões

- Definir Roles e Permissões no painel do Auth0.
- Incluir claims de roles em `app_metadata.roles` no ID/Access Token.
- No Gateway, usar middleware para verificar roles antes de permitir o acesso.

## 8. Regras e Extensões

- **MFA:** obrigatório para contas administrativas.
- **Actions:** personalizar o fluxo (ex.: adicionar claims, sincronizar dados).
- **Logs e Monitoramento:** configurar alertas e Webhooks.

## 9. Referências

- https://auth0.com/docs
- https://auth0.com/docs/architecture
- https://auth0.com/docs/quickstart

---

> Para visualizar o diagrama de arquitetura, veja `docs/auth_architecture.mmd`.

## 10. Gerenciamento de Aplicações Clientes

Nesta interface de administração, você pode gerenciar as aplicações internas que consumirão nosso sistema de autenticação central:

- **Acessar o menu "Apps"**: no menu principal, clique em "Apps" para ver a lista de aplicações registradas.
- **Criar Novo App**: informe o nome da aplicação, uma descrição opcional e as URLs de callback (separadas por vírgula). O sistema criará um `Client ID` e um `Client Secret`.
- **Visualizar Credenciais**: após a criação, será exibido o `Client Secret` apenas uma vez. Guarde-o em local seguro.
- **Editar App**: atualize nome, descrição ou URLs de callback.
- **Excluir App**: remova o acesso de uma aplicação, invalidando seu `Client ID` e `Client Secret`.

### Exemplos de Integração de Apps Internas

#### Deno (Hono)
```ts
import { Hono } from "hono/mod.ts";

const app = new Hono();

app.get("/login", (c) => {
  // Redireciona para o provedor de autenticação central, passando return_to
  const redirectTo = encodeURIComponent("https://minha-app-frontend.com/callback");
  return c.redirect(`/login?return_to=${redirectTo}`);
});

app.get("/callback", async (c) => {
  // Após o callback, o usuário será redirecionado de volta ao URL configurado em return_to
  return c.text("Autenticado com sucesso!");
});
```

#### HTMX
```html
<button
  hx-get="/login?return_to=https://minha-app-frontend.com/callback"
  hx-swap="none"
>
  Entrar na Minha App
</button>
```

> **Nota:** Em suas aplicações, use sempre o `Client ID` cadastrado e configure o callback no provedor de autenticação para corresponder à URL utilizada.

Auth server is running in localhost:8888 