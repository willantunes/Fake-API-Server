/** @jsxImportSource hono/jsx */

interface LoginLayoutProps {
  title: string;
  children: any;
}

export const LoginLayout = ({ title, children }: LoginLayoutProps) => {
  return (
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} | Integrador - Gateway de APIs</title>
        <link rel="icon" type="image/png" href="/static/favicon.png" />
        {/* Reference the main CSS file */}
        <link rel="stylesheet" href="/static/style.css" />
        <link rel="stylesheet" href="/public/styles.css" />
        <script src="https://unpkg.com/htmx.org@1.9.12/dist/htmx.min.js" defer></script>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4">
        {/* Logo Container */}
        <div class="mb-8 text-center">
          {/* Use the same logo as in NewLayout header */}
          <img src="/static/logo-iliberty-tecnologia.png" alt="iLiberty" class="h-12 mx-auto" /> 
        </div>

        {/* Main Content Area (Login Card) */}
        <div class="w-full max-w-md">
          {children} {/* The LoginForm will be rendered here */}
        </div>

        {/* Footer */}
        <footer class="mt-8 text-center text-gray-600 text-sm">
          <p>© 2025 iLiberty. Todos os direitos reservados.</p>
        </footer>
      </body>
    </html>
  );
}; 