# iLiberty User Management

![Logo](./static/favicon.png)

## 📋 Sobre o Projeto

O iLiberty User Management é um sistema centralizado de gerenciamento de usuários desenvolvido para uso interno. O sistema permite administrar usuários, seus papéis e permissões através de uma interface web moderna e amigável, integrada com Auth0 para autenticação e autorização.

## 🔧 Tecnologias Utilizadas

- **Deno**: Runtime JavaScript/TypeScript
- **Hono**: Framework web leve e rápido
- **Auth0**: Plataforma de autenticação e autorização
- **TailwindCSS**: Framework CSS utility-first
- **JSX/TSX**: Para renderização de componentes

## 🚀 Estrutura do Projeto

```
📦 iLiberty User Management
 ┣ 📂 src                 # Código-fonte principal
 ┃ ┣ 📂 components       # Componentes reutilizáveis da UI
 ┃ ┣ 📂 routes           # Rotas e controladores da aplicação
 ┃ ┣ 📂 services         # Serviços e lógica de negócios
 ┃ ┣ 📂 types            # Definições de tipos TypeScript
 ┃ ┣ 📂 utils            # Utilitários e funções auxiliares
 ┃ ┗ 📜 main.tsx         # Ponto de entrada da aplicação
 ┣ 📂 static             # Arquivos estáticos (CSS, imagens)
 ┣ 📂 public             # Arquivos públicos
 ┣ 📂 docs               # Documentação adicional
 ┣ 📜 deno.json          # Configuração do Deno
 ┣ 📜 deno.jsonc         # Configuração extendida do Deno
 ┣ 📜 tailwind.config.cjs # Configuração do TailwindCSS
 ┗ 📜 README.md          # Este arquivo
```

## 📄 Arquivos Principais e Suas Funções

### 📁 Componentes

- **NewLayout.tsx**: Layout principal da aplicação com navegação e estrutura de página
- **LoginLayout.tsx**: Layout específico para páginas de autenticação
- **LoginPage.tsx**: Página de login da aplicação
- **MockApiForm.tsx**: Formulário para gerenciamento de APIs mockadas
- **MockApiList.tsx**: Lista de APIs mockadas
- **MockApiPage.tsx**: Página de gerenciamento de APIs mockadas

### 📁 Rotas

- **auth.tsx**: Rotas de autenticação (login, logout, callback)
- **users.tsx**: Gerenciamento de usuários (listar, criar, editar, excluir)
- **clients.tsx**: Gerenciamento de clientes/aplicações OAuth
- **settings.tsx**: Configurações do sistema

### 📁 Utilitários

- **auth.ts**: Funções auxiliares de autenticação e middleware
- **auth0.ts**: Integração com a API do Auth0
- **env.ts**: Gerenciamento de variáveis de ambiente
- **formDataMapper.ts**: Mapeamento de dados de formulários para objetos

### 🏛️ Arquitetura

O projeto segue uma arquitetura baseada em componentes com roteamento declarativo. O fluxo de autenticação é gerenciado através do Auth0, conforme detalhado no arquivo `README_AUTH.md`.

## ⚙️ Requisitos de Ambiente

- Deno 1.36.0 ou superior
- Node.js 18+ (para ferramentas auxiliares como TailwindCSS)
- Conta Auth0 configurada (veja seção de autenticação)

## 🚀 Instalação e Execução

1. Clone o repositório:
   ```bash
   git clone [URL_DO_REPOSITÓRIO]
   cd iLiberty-user-management
   ```

2. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```
   AUTH0_DOMAIN=seu-tenant.auth0.com
   AUTH0_CLIENT_ID=seu-client-id
   AUTH0_CLIENT_SECRET=seu-client-secret
   AUTH0_CALLBACK_URL=http://localhost:8888/callback
   AUTH0_LOGOUT_REDIRECT=http://localhost:8888
   AUTH0_MGMT_CLIENT_ID=seu-management-client-id
   AUTH0_MGMT_CLIENT_SECRET=seu-management-client-secret
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   deno task dev
   ```

4. Acesse a aplicação em [http://localhost:8888](http://localhost:8888)

## 🔒 Autenticação e Autorização

O sistema utiliza Auth0 como provedor de identidade. Consulte o arquivo `README_AUTH.md` para mais detalhes sobre a implementação da autenticação.

Principais características:
- Single Sign-On (SSO) para todas as aplicações internas
- Gerenciamento de roles (admin, manager, user)
- Autorização baseada em claims
- Autenticação de dois fatores (2FA) para contas administrativas

## 🧩 Ampliando o Projeto

### Adicionando Novas Rotas

1. Crie um novo arquivo na pasta `src/routes`
2. Defina um novo sub-aplicativo Hono:
   ```typescript
   const myFeatureApp = new Hono<{ Variables: Variables }>();
   
   myFeatureApp.get('/', authMiddleware, (c) => {
     c.set('title', 'Minha Feature');
     return c.render(<MinhaFeatureComponent />);
   });
   
   export default myFeatureApp;
   ```

3. Adicione a rota no arquivo `main.tsx`:
   ```typescript
   import myFeatureApp from "./routes/myFeature.tsx";
   // ...
   app.route("/myfeature", myFeatureApp);
   ```

### Adicionando Novos Componentes

1. Crie um novo arquivo na pasta `src/components`
2. Defina seu componente usando JSX:
   ```typescript
   /** @jsxImportSource hono/jsx */
   
   export function MeuComponente(props: {titulo: string, children: any}) {
     return (
       <div class="container mx-auto p-4">
         <h1 class="text-2xl font-bold">{props.titulo}</h1>
         <div class="mt-4">{props.children}</div>
       </div>
     );
   }
   ```

3. Importe e utilize em suas rotas ou outros componentes

### Modificando o Layout

O layout principal da aplicação está em `src/components/NewLayout.tsx`. Para modificar a estrutura global da aplicação, edite este arquivo.

## 📊 Dashboard e Métricas

O dashboard principal (`/dashboard`) exibe métricas importantes sobre o sistema:
- Total de usuários
- Usuários ativos
- Número de administradores

Essas métricas são obtidas em tempo real da API do Auth0.

## 📝 Convenções de Código

- Utilize TypeScript para todos os novos arquivos
- Siga a convenção de nomeação camelCase para variáveis e funções
- Utilize PascalCase para componentes e interfaces
- Prefira funções assíncronas (async/await) para operações de I/O
- Utilize o formatador padrão do Deno para manter a consistência do código

## 🤝 Contribuindo

1. Crie uma branch para sua feature: `git checkout -b feature/nome-da-feature`
2. Faça commit das suas alterações: `git commit -m 'feat: adiciona nova funcionalidade'`
3. Faça push para a branch: `git push origin feature/nome-da-feature`
4. Abra um Pull Request

## 📚 Recursos Adicionais

- [Documentação do Deno](https://deno.land/manual)
- [Documentação do Hono](https://hono.dev)
- [Documentação do Auth0](https://auth0.com/docs)
- [Documentação do TailwindCSS](https://tailwindcss.com/docs)

## 📞 Suporte

Para suporte interno, entre em contato com a equipe de desenvolvimento através do canal `#iliberty-dev` no Slack.

## ⚖️ Licença

Este projeto é privado e de uso exclusivo interno da empresa. Todos os direitos reservados. 