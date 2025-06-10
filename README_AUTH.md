# Autenticação e Autorização Centralizada com Auth0

Este documento descreve a arquitetura, as melhores práticas e os passos de integração do Auth0 como mecanismo de autenticação e autorização para todo o portfólio de aplicações (internas e externas) da empresa.

## 1. Visão Geral

- **Auth0 como Provedor de Identidade (IDP):** Será responsável pela autenticação (AuthN) e autorização (AuthZ) centralizadas.
- **Tenants Separados:**
  - Tenant Corporativo: para aplicações internas e SSO de funcionários.
  - Tenant de Clientes: para a SaaS LIS, isolando dados e configurações de segurança.
- **Universal Login:** Uso do Universal Login customizado para garantir experiência única e marca consistente.
- **API Gateway de Autenticação:** Camada intermediária que expõe apenas as operações necessárias (login, refresh, gestão de usuários, atribuição de roles) e valida tokens.

## Início Rápido

1. **Obter Credenciais**
   - Solicite acesso ao tenant apropriado (Corporativo ou SaaS)
   - Obtenha seu `CLIENT_ID` e `CLIENT_SECRET`
   - Obtenha a URL do Auth Gateway para seu ambiente

2. **Integração Básica (3 minutos)**
   ```typescript
   // 1. Adicionar middleware de autenticação à sua aplicação
   app.use("*", async (c, next) => {
     const AUTH_GATEWAY_URL = config.authGateway.url;
     if (!AUTH_GATEWAY_URL) {
       console.warn("AUTH_GATEWAY_URL não definida, pulando autenticação");
       await next();
       return;
     }

     // 2. Encaminhar cookies para autenticação central
     const cookieHeader = c.req.header("Cookie") || "";
     const introspectRes = await fetch(`${AUTH_GATEWAY_URL}/api/introspect`, {
       headers: { Cookie: cookieHeader }
     });

     // 3. Tratar resposta não autorizada
     if (!introspectRes.ok) {
       return c.redirect(`${AUTH_GATEWAY_URL}/login?return_to=${c.req.url}`);
     }

     // 4. Obter informações do usuário
     const data = await introspectRes.json();
     c.set("user", data.user);
     await next();
   });
   ```

3. **Teste**
   - Acesse sua aplicação
   - Você deve ser redirecionado para o login central
   - Após o login, você voltará à sua aplicação com as informações de usuário

## Pontos de Atenção Comuns

1. **Manipulação de Cookies**
   - Garanta que os cookies estejam sendo encaminhados corretamente
   - Verifique as configurações SameSite e Secure dos cookies
   - Confirme se a configuração de domínio está correta

2. **Problemas de CORS**
   - Adicione o domínio do Auth Gateway à lista de permissões CORS
   - Garanta que as credenciais sejam incluídas nas requisições CORS
   - Verifique se o domínio da sua aplicação está registrado no Auth Gateway

3. **Expiração de Token**
   - Trate as respostas 401 adequadamente
   - Implemente refresh silencioso quando possível
   - Não armazene tokens em localStorage

## Boas Práticas de Segurança

1. **Nunca:**
   - Armazenar tokens em localStorage
   - Registrar tokens ou credenciais de usuário
   - Desabilitar SSL/TLS
   - Compartilhar CLIENT_SECRET no código frontend

2. **Sempre:**
   - Usar variáveis de ambiente para dados sensíveis
   - Implementar tratamento de erros adequado
   - Configurar flags de segurança dos cookies adequadamente
   - Manter dependências atualizadas

## Guia de Solução de Problemas

| Problema                 | Verificar                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| 401 Não Autorizado       | - CLIENT_ID/SECRET válidos<br>- Expiração de token<br>- Encaminhamento de cookies correto |
| Erros de CORS            | - Origens permitidas no Auth Gateway<br>- Modo de credenciais nas requisições fetch |
| Redirecionamentos infinitos | - Configurações de cookies<br>- Configuração de domínio<br>- Configurações de SSL/TLS |

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
  - `/api/introspect`: introspecção de tokens; retorna `{ active, client_id, user { id, name, email, isAdmin, role }, exp, iat }`.
- **Responsabilidades:**
  - Encapsular a Management API do Auth0.
  - Aplicar políticas de segurança (rate limit, CORS, etc.).
  - Fornecer SDK cliente leve (JS/TS, .NET, etc.) para integração.

### 4.1 Variáveis de Ambiente Necessárias

O serviço requer as seguintes variáveis de ambiente (exemplo: arquivo `.env`):

- `AUTH0_DOMAIN`: domínio Auth0 (ex.: `dev-ulp8mj8hsi4j2ofh.us.auth0.com`)
- `AUTH0_CLIENT_ID`: Client ID da aplicação OIDC.
- `AUTH0_CLIENT_SECRET`: Client Secret da aplicação OIDC.
- `AUTH0_CALLBACK_URL`: URL de callback registrada no Auth0 (ex.: `http://localhost:8000/api/callback`).
- `AUTH0_LOGOUT_REDIRECT`: URL de redirecionamento após logout.
- `AUTH0_MGMT_CLIENT_ID`: Client ID do aplicativo Machine-to-Machine para Management API.
- `AUTH0_MGMT_CLIENT_SECRET`: Client Secret do aplicativo Machine-to-Machine.

### 4.1.1 Padrões e Validação de Variáveis

Para facilitar a configuração, você pode usar o seguinte padrão (exemplo no arquivo `.env`):

```bash
# Obrigatórias
AUTH_GATEWAY_URL=https://auth.company.com  # Base URL da camada de autenticação
CLIENT_ID=your_client_id                   # Do painel Auth0
CLIENT_SECRET=your_client_secret           # Do painel Auth0

# Opcionais
AUTH_COOKIE_NAME=session                   # Padrão: 'session'
AUTH_COOKIE_DOMAIN=.company.com            # Padrão: domínio atual
AUTH_COOKIE_SECURE=true                    # Padrão: true em produção
```

> **Importante:** Para que o cookie de sessão (`session`) seja enviado corretamente em todos os subdomínios de `.iliberty.com.br` (por exemplo `mockapi.iliberty.com.br`, `iprojectmanager.iliberty.com.br`), defina o atributo `Domain` do cookie como `.iliberty.com.br` e `SameSite=None`. Caso contrário, o navegador não enviará o cookie em cenários cross-site, resultando em redirecionamentos infinitos.

### 4.2 Endpoint `/api/introspect`

Endpoint para validar tokens de sessão (cookie HTTP-only `session` ou header `Authorization: Bearer <token>`). **Use `/api/introspect`**. Retorna JSON:

```json
{
  "active": true,
  "client_id": "RXK7W9x8t0bnfwjkJlmbpGrfjqLqvyGL",
  "user": {
    "id": "auth0|682b510ab01795ddd5095437",
    "name": "william@iliberty.com.br",
    "email": "william@iliberty.com.br",
    "isAdmin": true,
    "role": "admin"
  },
  "exp": 1748051931,
  "iat": 1748015931
}
```

- Se o token não estiver presente ou inválido: retornará `401` com `{ "active": false, "error": "..." }`.

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