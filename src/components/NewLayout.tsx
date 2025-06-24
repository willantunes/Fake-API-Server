/** @jsxImportSource hono/jsx */
// Removed: import { jsx, Fragment } from 'hono/jsx'; // Unused
import type { User } from '../types/User.ts'; // Keep if User prop is planned
import type { JSXNode } from 'hono/jsx/index.ts';

interface NewLayoutProps {
  title: string;
  children: JSXNode | JSXNode[];
  user?: User;
  isAuthenticated?: boolean;
  extraHead?: JSXNode;
  activePath?: string;
  breadcrumbs?: Array<{ href?: string; label: string }>;
}

// Removed user from destructuring as it's not used yet, also extraHead, fullWidth, hideHeader
export function NewLayout({ children, title, activePath = '/', breadcrumbs, extraHead, user, isAuthenticated }: NewLayoutProps) {
  // For demonstration, create a mock user - in a real app this would come from your authentication system
  // user and isAuthenticated come from central auth introspection middleware
  
  // Helper to generate nav link classes with special handling for home path
  const navLinkClass = (path: string) => {
    // For home path, only highlight if exact match
    if (path === '/') {
      return `nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
        activePath === '/' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white'
      }`;
    } 
    // For other paths, use startsWith to match nested routes
    return `nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
      activePath.startsWith(path) ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white'
    }`;
  };

  return (
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Mock API Studio</title>
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
            font-size: 0.95rem;
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
          .nav-link.active {
            color: white;
            background-color: rgba(255, 255, 255, 0.1);
          }
          
          /* User dropdown styles */
          #user-dropdown-menu {
            display: none;
          }
          
          #user-dropdown-menu.show {
            display: block;
          }
          
          /* Dropdown menu item styles */
          #user-dropdown-menu a,
          #user-dropdown-menu button {
            color: #4b5563; /* text-gray-700 */
          }
          
          #user-dropdown-menu a:hover,
          #user-dropdown-menu button:hover {
            background-color: #f3f4f6; /* bg-gray-100 */
          }
          
          #user-dropdown-menu a span,
          #user-dropdown-menu button span {
            color: inherit;
          }
          
          #user-dropdown-menu button.logout {
            color: #dc2626; /* text-red-600 */
          }
          `}
        </style>
      </head>
      <body class="min-h-screen flex flex-col">
        {/* Header */}
        <header class="header sticky top-0 z-50 bg-brand-dark text-white">
          <div class="container mx-auto px-4">
            <nav class="flex items-center justify-between h-16">
              {/* Left side - Logo */}
              <div class="flex items-center gap-4 sm:gap-6">
                <a href="/" class="flex items-center">
                  <img src="/static/logo-iliberty-tecnologia.png" alt="Mock API Server Logo" class="header-logo h-8 sm:h-10" />
                </a>
                <div class="header-divider hidden sm:block"></div>
                <h1 class="header-title text-lg sm:text-xl">Mock API Studio</h1>
              </div>
              
              {/* Center - Navigation Links */}
              <div class="hidden md:flex items-center justify-center gap-6 lg:gap-8 flex-1">
                <a href="/" class={navLinkClass('/')}> 
                  <span class="material-icons">home</span>
                  <span>Início</span> 
                </a>
                <a href="/mock-api" class={navLinkClass('/mock-api')}> 
                  <span class="material-icons">api</span>
                  <span>APIs</span> 
                </a>
                <a href="/traffic" class={navLinkClass('/traffic')}> 
                  <span class="material-icons">analytics</span>
                  <span>Logs</span> 
                </a>

              </div>
              
              {/* Right side - User profile */}
              <div class="flex items-center space-x-4">
                <div class="hidden md:flex items-center">
                  <div class="relative">
                    <button id="user-menu-button" class="flex items-center gap-1 hover:text-brand-light" type="button">
                      <span class="material-icons">account_circle</span>
                      <span class="text-sm">{user?.name || user?.email || 'Usuário'}</span>
                      <span class="material-icons">expand_more</span>
                    </button>
                    <div id="user-dropdown-menu" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      {isAuthenticated && (
                        <div class="px-4 py-2 text-sm text-gray-700">
                          {user?.email || user?.name}
                          <div class="text-xs text-gray-400 mt-0.5">
                            {user?.isAdmin || user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                          </div>
                        </div>
                      )}
                      <hr />
                      <button class="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 logout" hx-post="/api/auth/logout" hx-target="body" hx-swap="innerHTML" hx-trigger="click" type="button">
                        <span class="material-icons">logout</span>
                        <span>Sair</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button id="app-mobile-menu-button" class="md:hidden flex items-center p-1" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')" type="button">
                  <span class="material-icons text-2xl">menu</span>
                </button>
              </div>
            </nav>
          </div>
          <div id="mobile-menu" class="hidden md:hidden">
            <div class="container mx-auto px-4 py-3 space-y-1 bg-brand-dark/95 backdrop-blur-sm border-t border-white/10">
              <a href="/" class={`mobile-nav-link ${activePath === '/' ? 'bg-white/10' : ''}`} type="button">
                <span class="material-icons">home</span>
                <span>Início</span>
              </a>
              <a href="/mock-api" class={`mobile-nav-link ${activePath.startsWith('/mock-api') ? 'bg-white/10' : ''}`} type="button">
                <span class="material-icons">api</span>
                <span>APIs</span>
              </a>
              <a href="/traffic" class={`mobile-nav-link ${activePath.startsWith('/traffic') ? 'bg-white/10' : ''}`} type="button">
                <span class="material-icons">analytics</span>
                <span>Logs</span>
              </a>

              <div class="border-t border-white/10 pt-2 mt-2">
                <button class="w-full text-left mobile-nav-link text-red-300" hx-post="/api/auth/logout" hx-target="body" hx-swap="innerHTML" hx-trigger="click" type="button">
                  <span class="material-icons">logout</span>
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main class="container mx-auto px-4 py-6 flex-1 mt-6">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div class="mb-6">
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
            &copy; {new Date().getFullYear()} Mock API Studio - iLiberty. Todos os direitos reservados.
          </div>
        </footer>
        
        {/* Scripts */}
        <script src="https://unpkg.com/htmx.org@1.9.5" integrity="sha384-xcuj3WpfgjlKF+FXhSQFQ0ZNr39ln+hwjN3npfM9VBnUskLolQAcN80McRIVOPuO" crossorigin="anonymous"></script>
        <script src="https://unpkg.com/@popperjs/core@2"></script>
        <script src="https://unpkg.com/tippy.js@6"></script>
        <script src="/static/tooltips.js"></script>
        <script src="/static/dropdown.js"></script>
      </body>
    </html>
  );
} 