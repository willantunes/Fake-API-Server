/** @jsxImportSource hono/jsx */
import { Hono, Context } from "hono/mod.ts";
import { NewLayout } from "../components/NewLayout.tsx";
import { authMiddleware } from "../utils/auth.ts";
import { listAuth0Users, createAuth0User, updateAuth0User, deleteAuth0User, Auth0User } from "../utils/auth0.ts";

const users = new Hono();
users.use("*", authMiddleware);

// Render user creation form
users.get("/create", async (c: Context) => {
  // Block non-admin users once an admin exists
  const allUsers = await listAuth0Users();
  const adminUsersCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = allUsers.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  if (adminUsersCount > 0 && !currentUserIsAdmin) {
    return c.text("Forbidden", 403);
  }
  c.set("title", "Novo Usuário");
  c.set("breadcrumbs", [{ href: "/users", label: "Usuários" }, { label: "Novo Usuário" }]);
  return c.render(
    <div class="container mx-auto px-4 py-4 max-w-md">
      <h1 class="text-2xl font-bold mb-4">Criar Novo Usuário</h1>
      <form method="post" action="/users/create" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input name="email" id="email" type="email" required class="mt-1 block w-full border-gray-300 rounded-md" />
        </div>
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Nome</label>
          <input name="name" id="name" type="text" class="mt-1 block w-full border-gray-300 rounded-md" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
          <input name="password" id="password" type="password" required class="mt-1 block w-full border-gray-300 rounded-md" />
        </div>
        <div class="flex justify-end">
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md">Criar</button>
        </div>
      </form>
    </div>
  );
});

// Add toast message component for success
function SuccessToast({ message }: { message: string }) {
  return (
    <div class="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-50 animate-fade-in">
      <div className="flex">
        <div className="flex-shrink-0">
          <span class="material-icons text-green-500">check_circle</span>
        </div>
        <div className="ml-3">
          <p class="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Handle form submission for creating user
users.post("/create", async (c: Context) => {
  // Block non-admin users once an admin exists
  const allUsers = await listAuth0Users();
  const adminUsersCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = allUsers.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  if (adminUsersCount > 0 && !currentUserIsAdmin) {
    return c.text("Forbidden", 403);
  }
  const form = await c.req.formData();
  const email = form.get("email")?.toString() || "";
  const name = form.get("name")?.toString() || undefined;
  const password = form.get("password")?.toString() || "";
  try {
    await createAuth0User({ email, name, password });
    const redirectUrl = "/users?success=created";
    // Support HTMX redirect
    if (c.req.header("HX-Request") === "true") {
      c.header("HX-Redirect", redirectUrl);
      return c.text("");
    }
    return c.redirect(redirectUrl);
  } catch (err: any) {
    // Extract and translate the error message
    let errorMessage = "Ocorreu um erro ao criar o usuário.";
    
    if (err.message.includes("PasswordStrengthError") || err.message.includes("Password is too weak")) {
      errorMessage = "A senha não atende aos requisitos de segurança. Por favor, utilize uma senha que contenha:";
    } else if (err.message.includes("already exists")) {
      errorMessage = "Este email já está em uso. Por favor, utilize outro email.";
    }
    
    c.set("title", "Novo Usuário");
    c.set("breadcrumbs", [{ href: "/users", label: "Usuários" }, { label: "Novo Usuário" }]);
    return c.render(
      <div class="container mx-auto px-4 py-4 max-w-md">
        <div class="mb-6 p-5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
          <div class="flex">
            <div className="flex-shrink-0">
              <span className="material-icons text-red-500">error_outline</span>
            </div>
            <div className="ml-3">
              <h3 class="text-lg font-medium">Não foi possível criar o usuário</h3>
              <div className="mt-2">
                <p>{errorMessage}</p>
                {err.message.includes("PasswordStrengthError") && (
                  <ul className="mt-2 ml-5 list-disc text-sm">
                    <li className="mt-1">Pelo menos 8 caracteres</li>
                    <li className="mt-1">Pelo menos 3 dos seguintes tipos de caracteres:</li>
                    <ul className="ml-5 list-circle text-sm">
                      <li>Letras minúsculas (a-z)</li>
                      <li>Letras maiúsculas (A-Z)</li>
                      <li>Números (0-9)</li>
                      <li>Caracteres especiais (!@#$%&*)</li>
                    </ul>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4">Criar Novo Usuário</h1>
        <form method="post" action="/users/create" className="space-y-4">
          <div>
            <label for="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" id="email" type="email" required value={email} className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <div>
            <label for="name" className="block text-sm font-medium text-gray-700">Nome</label>
            <input name="name" id="name" type="text" value={name} className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <div>
            <label for="password" className="block text-sm font-medium text-gray-700">Senha</label>
            <input name="password" id="password" type="password" required className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Criar</button>
          </div>
        </form>
      </div>
    );
  }
});

users.get("/", async (c: Context) => {
  c.set("title", "Usuários");
  const auth0Users: Auth0User[] = await listAuth0Users();
  
  // Determine if current user can assign admin roles
  const adminCount = auth0Users.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = auth0Users.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  
  // Check for success message parameter
  const success = c.req.query("success");
  
  return c.render(
    <div className="container mx-auto px-4 py-4">
      {success === "created" && (
        <>
          <SuccessToast message="Usuário criado com sucesso!" />
          <script dangerouslySetInnerHTML={{ __html: "setTimeout(function() { window.location.href = '/users'; }, 1000);" }} />
        </>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-2">Gerencie usuários, permissões e acessos</p>
        </div>
        {(adminCount === 0 || currentUserIsAdmin) && (
          <div className="flex space-x-4">
            <a href="/users/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center gap-1 font-medium">
              <span className="material-icons text-sm">add</span>
              Novo Usuário
            </a>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar usuários..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Todos os Papéis</option>
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="user">Usuário</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Papel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                {(adminCount === 0 || currentUserIsAdmin) && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auth0Users.map((user) => (
                <tr className="hover:bg-gray-50" key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          <span className="material-icons">person</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || user.email}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.app_metadata?.roles?.includes('admin') ? 'bg-purple-100 text-purple-800' :
                        user.app_metadata?.roles?.includes('manager') ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}`
                    }>
                      {user.app_metadata?.roles?.includes('admin') ? 'Administrador' :
                       user.app_metadata?.roles?.includes('manager') ? 'Gerente' :
                       'Usuário'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`
                    }>
                      {user.blocked ? 'Inativo' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.last_login).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  {(adminCount === 0 || currentUserIsAdmin) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button className="text-gray-500 hover:text-blue-600" title="Editar">
                        <span className="material-icons text-sm">edit</span>
                      </button>
                      <button className="text-gray-500 hover:text-red-600" title="Excluir">
                        <span className="material-icons text-sm">delete</span>
                      </button>
                      <form method="post" action={`/users/role/${user.user_id}`} className="inline">
                        <input type="hidden" name="makeAdmin" value={user.app_metadata?.roles?.includes('admin') ? "false" : "true"} />
                        <button type="submit"
                          className={user.app_metadata?.roles?.includes('admin') ? "text-gray-500 hover:text-red-600" : "text-gray-500 hover:text-purple-600"}
                          title={user.app_metadata?.roles?.includes('admin') ? "Remover Admin" : "Tornar Admin"}>
                          <span className="material-icons text-sm">
                            {user.app_metadata?.roles?.includes('admin') ? 'person_remove' : 'admin_panel_settings'}
                          </span>
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Anterior
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">1</span> a <span className="font-medium">20</span> de{' '}
                <span className="font-medium">20</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="material-icons text-sm">chevron_left</span>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="material-icons text-sm">chevron_right</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// API endpoint: create a new Auth0 user
users.post("/api", async (c: Context) => {
  // Block non-admin users once an admin exists
  const allUsers = await listAuth0Users();
  const adminUsersCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = allUsers.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  if (adminUsersCount > 0 && !currentUserIsAdmin) {
    return c.json({ error: "Forbidden" }, 403);
  }
  try {
    const data = await c.req.json();
    const newUser = await createAuth0User(data);
    return c.json(newUser, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// API endpoint: update an existing Auth0 user
users.patch("/api/:user_id", async (c: Context) => {
  // Block non-admin users once an admin exists
  const allUsers = await listAuth0Users();
  const adminUsersCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = allUsers.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  if (adminUsersCount > 0 && !currentUserIsAdmin) {
    return c.json({ error: "Forbidden" }, 403);
  }
  try {
    const userId = c.req.param("user_id");
    const data = await c.req.json();
    const updated = await updateAuth0User(userId, data);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// API endpoint: delete an Auth0 user
users.delete("/api/:user_id", async (c: Context) => {
  // Block non-admin users once an admin exists
  const allUsers = await listAuth0Users();
  const adminUsersCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = allUsers.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  if (adminUsersCount > 0 && !currentUserIsAdmin) {
    return c.json({ error: "Forbidden" }, 403);
  }
  try {
    const userId = c.req.param("user_id");
    await deleteAuth0User(userId);
    return c.text("", 204);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// Handle role assignment (promote/demote admin)
users.post("/role/:user_id", async (c: Context) => {
  const userId = c.req.param("user_id");
  const form = await c.req.formData();
  const makeAdmin = form.get("makeAdmin") === "true";
  // Refresh users and compute permissions
  const allUsers = await listAuth0Users();
  const adminUsersCount = allUsers.filter(u => u.app_metadata?.roles?.includes('admin')).length;
  const currentUserCtx = c.get("user") as { id: string };
  const currentAuth0User = allUsers.find(u => u.user_id === currentUserCtx.id);
  const currentUserIsAdmin = !!currentAuth0User?.app_metadata?.roles?.includes('admin');
  if (adminUsersCount > 0 && !currentUserIsAdmin) {
    return c.text("Forbidden", 403);
  }
  const targetUser = allUsers.find(u => u.user_id === userId);
  if (!targetUser) {
    return c.text("User not found", 404);
  }
  const existingRoles = (targetUser.app_metadata?.roles ?? []) as string[];
  const newRoles = makeAdmin
    ? Array.from(new Set([...existingRoles, "admin"]))
    : existingRoles.filter((r: string) => r !== "admin");
  await updateAuth0User(userId, { app_metadata: { roles: newRoles } });
  const redirectUrl = "/users";
  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", redirectUrl);
    return c.text("");
  }
  return c.redirect(redirectUrl);
});

export default users; 