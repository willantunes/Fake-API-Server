/** @jsxImportSource hono/jsx */
// Removed: import { jsx, Fragment } from 'hono/jsx'; // Unused
import { useRequestContext } from "hono/jsx-renderer";
import type { User } from '../types/User.ts'; // Keep if User prop is planned
import type { JSXNode } from 'hono/jsx/index.ts';

interface NewLayoutProps {
  title: string;
  children: JSXNode | JSXNode[];
  user?: User;
  extraHead?: JSXNode;
  activePath?: string;
  breadcrumbs?: Array<{ href?: string; label: string }>;
}

// Removed user from destructuring as it's not used yet, also extraHead, fullWidth, hideHeader
export function NewLayout({ children, title, activePath = '/', breadcrumbs, extraHead }: NewLayoutProps) {
  const ctx = useRequestContext();
  const user = ctx.get("user") as User | undefined;
  const isAuthenticated = !!ctx.get("isAuthenticated");
  // Role-based UI controls
  const adminCount = (ctx.get("adminCount") as number) ?? 0;
  const currentUserIsAdmin = (ctx.get("currentUserIsAdmin") as boolean) ?? false;
  
  // Helper to generate nav link classes
  const navLinkClass = (path: string) => 
    `nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:text-white transition-colors ${
      activePath.startsWith(path) ? 'text-white' : 'text-gray-300'
    }`;

  return (
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Administração</title>
        <link href="/static/style.css" rel="stylesheet" />
        <link href="/static/form-styles.css" rel="stylesheet" />
        <link href="/static/favicon.png" rel="icon" type="image/png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css" />
        {extraHead}
        <style>
          {`
          :root {
            --brand-dark: #002b49;
            --brand-light: #00b6d6;
            --brand-primary: #00bf9a;
            --brand-secondary: #002b49;
          }
          
          body {
            background-color: #f5f7fa;
            color: #333;
            font-family: 'Inter', sans-serif;
          }
          
          .bg-brand-dark {
            background-color: var(--brand-dark);
          }
          
          .text-brand-light {
            color: var(--brand-light);
          }
          
          .hover\\:text-brand-light:hover {
            color: var(--brand-light);
          }
          
          .bg-brand-light\\/10 {
            background-color: rgba(0, 182, 214, 0.1);
          }
          
          .header-logo {
            filter: brightness(0) invert(1);
            transition: transform 0.2s;
          }
          
          .header-logo:hover {
            transform: scale(1.05);
          }
          
          .material-symbols-outlined {
            font-variation-settings:
            'FILL' 0,
            'wght' 400,
            'GRAD' 0,
            'opsz' 24
          }
          .header-title {
            background-image: linear-gradient(to right, #00B6D6, #ffffff);
            -webkit-background-clip: text;
            background-clip: text;
            font-weight: 600;
            color: transparent;
          }
          .header-divider {
            width: 1px;
            height: 1.5rem;
            background-color: rgba(255, 255, 255, 0.3);
          }
          .nav-link {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.875rem;
            padding: 0.5rem;
            color: rgba(255, 255, 255, 0.85);
            transition: all 0.2s;
          }
          .nav-link:hover, .nav-link.active {
            color: white;
          }
          .btn-primary {
            background-color: #00b6d6;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
          }
          .btn-primary:hover {
            background-color: #00a0c0;
          }
          .mobile-nav-link {
            display: flex;
            align-items: center; 
            gap: 0.5rem;
            padding: 0.75rem 0.5rem;
            color: rgba(255, 255, 255, 0.9);
            transition: all 0.2s;
          }
          .mobile-nav-link:hover {
            color: white;
            background-color: rgba(255, 255, 255, 0.1);
          }
          `}
        </style>
      </head>
      <body class="min-h-screen flex flex-col">
        {/* Header */}
        <header class="header sticky top-0 z-50 bg-brand-dark text-white">
          <div class="container mx-auto px-4">
            <nav class="flex items-center h-16">
              <div class="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                <a href="/" class="flex items-center">
                  <img src="/static/logo-iliberty-tecnologia.png" alt="Mock API Server Logo" class="header-logo h-8 sm:h-10" />
                </a>
                <div class="header-divider hidden sm:block"></div>
                <h1 class="header-title text-lg sm:text-xl">Administração</h1>
              </div>
              
              {/* Navigation menu centered between logo and profile */}
              <div class="hidden md:flex flex-1 justify-center items-center gap-6 lg:gap-8">
                <a href="/dashboard" class={navLinkClass("/dashboard")}>
                  <span class="material-icons">home</span><span>Início</span>
                </a>
                {currentUserIsAdmin && (
                  <a href="/users" class={navLinkClass("/users")}>
                    <span class="material-icons">people</span><span>Usuários</span>
                  </a>
                )}
                {currentUserIsAdmin && (
                  <a href="/clients" class={navLinkClass("/clients")}>
                    <span class="material-icons">apps</span><span>Apps</span>
                  </a>
                )}
              </div>
              
              <div class="hidden md:flex items-center gap-2 flex-shrink-0">
                {isAuthenticated && (
                  <div class="relative" id="user-dropdown-container">
                    <button 
                      class="flex items-center gap-2 text-white hover:text-gray-200 focus:outline-none text-sm" 
                      onclick="document.getElementById('user-dropdown').classList.toggle('hidden')"
                    >
                      <span class="material-icons">account_circle</span>
                      <span>{user?.name || 'Administrator'}</span>
                      <span class="material-icons text-sm">expand_more</span>
                    </button>
                    
                    <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 text-sm">
                      <div class="px-4 py-2 text-gray-700 border-b text-sm">
                        <div class="font-medium">Administrator</div>
                      </div>
                      <a href="/settings" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                        <span class="material-icons text-sm">settings</span>
                        <span>Configurações</span>
                      </a>
                      <a href="/logout" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                        <span class="material-icons text-sm">logout</span>
                        <span>Sair</span>
                      </a>
                    </div>
                  </div>
                )}
                
                {!isAuthenticated && (
                  <a href="/login" class="btn btn-primary flex items-center gap-1 text-sm">
                    <span class="material-icons text-sm">login</span><span>Entrar</span>
                  </a>
                )}
              </div>
              <button class="md:hidden p-2 text-white hover:bg-white/10 rounded-lg" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')">
                <span class="material-icons">menu</span>
              </button>
            </nav>
          </div>
          <div id="mobile-menu" class="hidden md:hidden text-sm">
            <div class="container mx-auto px-4 py-3 space-y-1 bg-brand-dark/95 backdrop-blur-sm border-t border-white/10">
              <a href="/dashboard" class="mobile-nav-link flex items-center gap-2">
                <span class="material-icons">home</span><span>Início</span>
              </a>
              {currentUserIsAdmin && (
                <a href="/users" class="mobile-nav-link flex items-center gap-2">
                  <span class="material-icons">people</span><span>Usuários</span>
                </a>
              )}
              {currentUserIsAdmin && (
                <a href="/clients" class="mobile-nav-link flex items-center gap-2">
                  <span class="material-icons">apps</span><span>Apps</span>
                </a>
              )}
              <div class="border-t border-white/10 mt-2 pt-2">
                {isAuthenticated && (
                  <>
                    <div class="mobile-nav-link flex items-center gap-2 font-medium">
                      <span class="material-icons">account_circle</span>
                      <span>{user?.name || 'Administrator'}</span>
                    </div>
                    <a href="/settings" class="mobile-nav-link flex items-center gap-2 pl-8">
                      <span class="material-icons text-sm">settings</span>
                      <span>Configurações</span>
                    </a>
                    <a href="/logout" class="mobile-nav-link flex items-center gap-2 pl-8">
                      <span class="material-icons text-sm">logout</span>
                      <span>Sair</span>
                    </a>
                  </>
                )}
              </div>
              {!isAuthenticated && (
                <a href="/login" class="mobile-nav-link flex items-center gap-2">
                  <span class="material-icons">login</span><span>Entrar</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main class="container mx-auto px-4 py-4 flex-1 mt-3">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div class="mb-4">
              <nav class="text-sm">
                <ol class="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li class="flex items-center">
                      {crumb.href ? (
                        <a href={crumb.href} class="text-blue-600 hover:text-blue-800">{crumb.label}</a>
                      ) : (
                        <span class="font-medium text-gray-500">{crumb.label}</span>
                      )}
                      {index < breadcrumbs.length - 1 && (
                        <span class="material-symbols-outlined text-gray-500 mx-2 text-xs">chevron_right</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          ) : null}
          
          {children}
        </main>

        {/* Footer */}
        <footer class="border-t border-gray-200 mt-auto py-4 bg-white">
          <div class="container mx-auto px-4 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} iGateway - iLiberty. Todos os direitos reservados.
          </div>
        </footer>
        
        {/* Scripts */}
        <script src="https://unpkg.com/htmx.org@1.9.5" integrity="sha384-xcuj3WpfgjlKF+FXhSQFQ0ZNr39ln+hwjN3npfM9VBnUskLolQAcN80McRIVOPuO" crossorigin="anonymous"></script>
        <script src="https://unpkg.com/@popperjs/core@2"></script>
        <script src="https://unpkg.com/tippy.js@6"></script>
        <script src="/static/tooltips.js"></script>
        <script dangerouslySetInnerHTML={{__html: `
          // Close dropdown when clicking outside of it
          document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('user-dropdown');
            const container = document.getElementById('user-dropdown-container');
            
            if (dropdown && container && !container.contains(event.target)) {
              dropdown.classList.add('hidden');
            }
          });
        `}}></script>
      </body>
    </html>
  );
} 