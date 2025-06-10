/** @jsxImportSource hono/jsx */

interface LoginPageProps {
  error?: string;
  registered?: boolean;
  admin?: boolean;
}

export const LoginPage = ({ error, registered, admin }: LoginPageProps) => {
  return (
    <div class="auth-card animate-fade-in">
      <div class="auth-header">
        <h2 class="auth-title animate-slide-up" style="animation-delay: 100ms">
          Bem-vindo de volta
        </h2>
        <p class="auth-subtitle animate-slide-up" style="animation-delay: 200ms">
          Acesse sua conta para continuar aprendendo
        </p>
      </div>

      <div class="auth-body">
        {registered && (
          <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-lg animate-fade-in">
            <p class="flex items-center">
              <span class="material-icons mr-2">check_circle</span>
              {admin 
                ? "Conta de administrador criada com sucesso! Por favor, faça login para acessar o painel administrativo."
                : "Conta criada com sucesso! Por favor, faça login para continuar."}
            </p>
          </div>
        )}

        <div id="login-error" class="mb-4">
          {error && (
            <div class="p-4 bg-red-50 text-red-700 rounded-lg animate-shake">
              <p class="flex items-center">
                <span class="material-icons mr-2">error</span>
                {error}
              </p>
            </div>
          )}
        </div>
        
        <form 
          class="auth-form" 
          hx-post="/api/auth/login" 
          hx-target="#login-error" 
          hx-swap="innerHTML" 
        >
          <div class="auth-input-group">
            <div class="animate-slide-up" style="animation-delay: 300ms">
              <label for="email" class="auth-label">Email</label>
              <div class="auth-input-wrapper">
                <span class="auth-input-icon material-icons">mail</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  class="auth-input auth-input-with-icon"
                  placeholder="Seu email"
                />
              </div>
            </div>
            <div class="animate-slide-up" style="animation-delay: 400ms">
              <label for="password" class="auth-label">Senha</label>
              <div class="auth-input-wrapper">
                <span class="auth-input-icon material-icons">lock</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  class="auth-input auth-input-with-icon"
                  placeholder="Sua senha"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between mt-6 animate-slide-up" style="animation-delay: 500ms">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                class="auth-checkbox"
              />
              <label for="remember-me" class="auth-checkbox-label">
                Lembrar de mim
              </label>
            </div>

            <div class="text-sm">
     
            </div>
          </div>

          <div class="mt-6 animate-slide-up" style="animation-delay: 600ms">
            <button
              type="submit"
              class="auth-button group"
            >
              <span 
                class="auth-button-icon-base material-icons"
              >
                login
              </span>
              Entrar
            </button>
          </div>
        </form>

        <p class="mt-8 text-center text-sm text-gray-600 animate-slide-up" style="animation-delay: 800ms">
          Não tem uma conta?{" "}
          <a href="/register" class="auth-link">
            Registre-se agora
          </a>
        </p>
      </div>
    </div>
  );
}; 