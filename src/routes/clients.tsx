/** @jsxImportSource hono/jsx */
import { Hono, Context } from "hono/mod.ts";
import { authMiddleware } from "../utils/auth.ts";
import {
  listAuth0Clients,
  createAuth0Client,
  updateAuth0Client,
  deleteAuth0Client,
  Auth0Client,
} from "../utils/auth0.ts";
import { NewLayout } from "../components/NewLayout.tsx";

const clients = new Hono();
clients.use("*", authMiddleware);

// Add toast message component for success
function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-50 animate-fade-in">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="material-icons text-green-500">check_circle</span>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Display list of registered client applications
clients.get("/", async (c: Context) => {
  c.set("title", "Aplicações Autorizadas");
  
  // Check for success message parameter
  const success = c.req.query("success");
  
  try {
    const apps = await listAuth0Clients();
    return c.render(
      <div className="container mx-auto px-4 py-4">
        {success === "created" && (
          <>
            <SuccessToast message="Aplicação criada com sucesso!" />
            <script dangerouslySetInnerHTML={{ __html: "setTimeout(function() { window.location.href = '/clients'; }, 1000);" }} />
          </>
        )}
        {success === "updated" && (
          <>
            <SuccessToast message="Aplicação atualizada com sucesso!" />
            <script dangerouslySetInnerHTML={{ __html: "setTimeout(function() { window.location.href = '/clients'; }, 1000);" }} />
          </>
        )}
        {success === "deleted" && (
          <>
            <SuccessToast message="Aplicação excluída com sucesso!" />
            <script dangerouslySetInnerHTML={{ __html: "setTimeout(function() { window.location.href = '/clients'; }, 1000);" }} />
          </>
        )}
        
        {/* Header with title and button in same line */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Aplicações</h1>
            <p className="text-gray-600 mt-2">Gerencie aplicações clientes e URLs de callback</p>
          </div>
          <a href="/clients/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center gap-1 font-medium">
            <span className="material-icons">add</span>
            Nova Aplicação
          </a>
        </div>
        
        {/* Search and filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  type="text"
                  placeholder="Buscar aplicações..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  APLICAÇÃO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CLIENT ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CALLBACKS
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AÇÕES
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apps.map((app: Auth0Client) => (
                <tr key={app.client_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="material-icons text-gray-500">apps</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{app.name}</div>
                        {app.description && <div className="text-xs text-gray-500">{app.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-600">{app.client_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-md truncate">
                      {app.callbacks.length > 0 ? app.callbacks.join(", ") : 
                        <span className="text-gray-400 italic">Nenhuma URL configurada</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href={`/clients/${app.client_id}/edit`} className="text-gray-500 hover:text-blue-600 mr-2" title="Editar">
                      <span className="material-icons">edit</span>
                    </a>
                    <form method="post" action={`/clients/${app.client_id}/delete`} className="inline" 
                          onSubmit={(e) => {
                            if (!confirm('Tem certeza que deseja excluir esta aplicação? Esta ação não pode ser desfeita.')) {
                              e.preventDefault();
                            }
                          }}>
                      <button type="submit" className="text-gray-500 hover:text-red-600" title="Excluir">
                        <span className="material-icons">delete</span>
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              
              {apps.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <span className="material-icons text-4xl mb-2">apps</span>
                      <p className="text-lg font-medium">Nenhuma aplicação encontrada</p>
                      <p className="text-sm mt-1">Clique em "Nova Aplicação" para registrar um cliente.</p>
                      <a href="/clients/create" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                        <span className="material-icons text-sm align-middle mr-1">add</span>
                        Nova Aplicação
                      </a>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {apps.length > 0 && (
            <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando 1 a {apps.length} de {apps.length} resultados
              </div>
              <div className="flex items-center space-x-2">
                <button disabled className="px-3 py-1 border border-gray-300 rounded-md text-gray-400 bg-gray-50">
                  <span className="material-icons text-sm">chevron_left</span>
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-md bg-blue-50 text-blue-600">
                  1
                </button>
                <button disabled className="px-3 py-1 border border-gray-300 rounded-md text-gray-400 bg-gray-50">
                  <span className="material-icons text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (err: any) {
    return c.text(`Erro ao listar aplicações: ${err.message}`, 500);
  }
});

// Display create app form
clients.get("/create", (c: Context) => {
  c.set("title", "Nova Aplicação");
  
  return c.render(
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Nova Aplicação</h1>
        <p className="text-gray-600 mt-2">Adicione uma nova aplicação cliente</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <form method="post" action="/clients/create" className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome da Aplicação</label>
            <input id="name" name="name" type="text" required 
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <p className="mt-1 text-xs text-gray-500">Nome visível da aplicação cliente (ex: "Portal de Clientes")</p>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <input id="description" name="description" type="text" 
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <p className="mt-1 text-xs text-gray-500">Breve descrição sobre o propósito desta aplicação</p>
          </div>
          <div>
            <label htmlFor="callbacks" className="block text-sm font-medium text-gray-700 mb-1">URLs de Callback</label>
            <input id="callbacks" name="callbacks" type="text" placeholder="https://app.exemplo.com/callback" 
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <p className="mt-1 text-xs text-gray-500">URLs para onde o usuário será redirecionado após autenticação (separadas por vírgula)</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <a href="/clients" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
              <span className="material-icons mr-1 text-sm">arrow_back</span>
              Voltar
            </a>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
              <span className="material-icons mr-1 text-sm">save</span>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Handle create app submission
clients.post("/create", async (c: Context) => {
  const form = await c.req.formData();
  const name = form.get("name")?.toString() || "";
  const description = form.get("description")?.toString() || undefined;
  const callbacksRaw = form.get("callbacks")?.toString() || "";
  const callbacks = callbacksRaw.split(",").map(u => u.trim()).filter(Boolean);
  try {
    const newApp = await createAuth0Client({ name, description, callbacks });
    // Render secret on creation
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Aplicação Criada</h1>
          <p className="text-gray-600 mt-2">Suas credenciais foram geradas com sucesso</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="material-icons text-green-500">check_circle</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">Credenciais geradas com sucesso</h3>
                <p className="mt-2 text-sm">Guarde estas informações em um local seguro. O Client Secret <strong>não será exibido novamente</strong>.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-1">Client ID</p>
              <div className="flex items-center">
                <code className="flex-1 bg-gray-100 text-gray-800 p-2 rounded font-mono text-sm break-all">{newApp.client_id}</code>
                <button onClick={() => {
                  navigator.clipboard.writeText(newApp.client_id);
                  alert('Client ID copiado para a área de transferência');
                }} className="ml-2 p-1 text-gray-500 hover:text-gray-700">
                  <span className="material-icons">content_copy</span>
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-bold text-gray-700 mb-1">Client Secret</p>
              <div className="flex items-center">
                <code className="flex-1 bg-gray-100 text-gray-800 p-2 rounded font-mono text-sm break-all">{newApp.client_secret}</code>
                <button onClick={() => {
                  navigator.clipboard.writeText(newApp.client_secret || '');
                  alert('Client Secret copiado para a área de transferência');
                }} className="ml-2 p-1 text-gray-500 hover:text-gray-700">
                  <span className="material-icons">content_copy</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <a href="/clients" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
              <span className="material-icons mr-1 text-sm">arrow_back</span>
              Voltar para lista
            </a>
            <a href={`/clients/${newApp.client_id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
              <span className="material-icons mr-1 text-sm">edit</span>
              Editar Aplicação
            </a>
          </div>
        </div>
      </div>
    );
  } catch (err: any) {
    c.set("title", "Nova Aplicação");
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Nova Aplicação</h1>
          <p className="text-gray-600 mt-2">Adicione uma nova aplicação cliente</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="material-icons text-red-500">error_outline</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">Erro ao criar aplicação</h3>
                <p className="mt-2 text-sm">{err.message}</p>
              </div>
            </div>
          </div>
          
          <form method="post" action="/clients/create" className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome da Aplicação</label>
              <input id="name" name="name" type="text" required value={name}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">Nome visível da aplicação cliente (ex: "Portal de Clientes")</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <input id="description" name="description" type="text" value={description}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">Breve descrição sobre o propósito desta aplicação</p>
            </div>
            <div>
              <label htmlFor="callbacks" className="block text-sm font-medium text-gray-700 mb-1">URLs de Callback</label>
              <input id="callbacks" name="callbacks" type="text" placeholder="https://app.exemplo.com/callback" value={callbacksRaw}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">URLs para onde o usuário será redirecionado após autenticação (separadas por vírgula)</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <a href="/clients" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
                <span className="material-icons mr-1 text-sm">arrow_back</span>
                Voltar
              </a>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                <span className="material-icons mr-1 text-sm">save</span>
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
});

// Display edit form
clients.get("/:clientId/edit", async (c: Context) => {
  const { clientId } = c.req.param();
  try {
    const apps = await listAuth0Clients();
    const app = apps.find(a => a.client_id === clientId);
    if (!app) {
      return c.text("Aplicação não encontrada.", 404);
    }
    c.set("title", "Editar Aplicação");
    
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Editar Aplicação</h1>
          <p className="text-gray-600 mt-2">Atualize as informações da aplicação</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <form method="post" action={`/clients/${clientId}/edit`} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome da Aplicação</label>
              <input id="name" name="name" type="text" value={app.name} required 
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">Nome visível da aplicação cliente</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <input id="description" name="description" type="text" value={app.description} 
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">Breve descrição sobre o propósito desta aplicação</p>
            </div>
            <div>
              <label htmlFor="callbacks" className="block text-sm font-medium text-gray-700 mb-1">URLs de Callback</label>
              <input id="callbacks" name="callbacks" type="text" value={app.callbacks.join(", ")} 
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">URLs para onde o usuário será redirecionado após autenticação (separadas por vírgula)</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Client ID</div>
              <div className="flex items-center">
                <code className="flex-1 bg-gray-100 text-gray-800 p-2 rounded font-mono text-sm break-all">{app.client_id}</code>
                <button type="button" onClick={() => {
                  navigator.clipboard.writeText(app.client_id);
                  alert('Client ID copiado para a área de transferência');
                }} className="ml-2 p-1 text-gray-500 hover:text-gray-700">
                  <span className="material-icons">content_copy</span>
                </button>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <a href="/clients" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
                <span className="material-icons mr-1 text-sm">arrow_back</span>
                Voltar
              </a>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                <span className="material-icons mr-1 text-sm">save</span>
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } catch (err: any) {
    return c.text(`Erro ao carregar aplicação: ${err.message}`, 500);
  }
});

// Handle edit submission
clients.post("/:clientId/edit", async (c: Context) => {
  const { clientId } = c.req.param();
  const form = await c.req.formData();
  const name = form.get("name")?.toString();
  const description = form.get("description")?.toString() || undefined;
  const callbacksRaw = form.get("callbacks")?.toString() || "";
  const callbacks = callbacksRaw.split(",").map(u => u.trim()).filter(Boolean);
  try {
    await updateAuth0Client(clientId, { name, description, callbacks });
    return c.redirect("/clients?success=updated");
  } catch (err: any) {
    c.set("title", "Editar Aplicação");
    
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Editar Aplicação</h1>
          <p className="text-gray-600 mt-2">Atualize as informações da aplicação</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="material-icons text-red-500">error_outline</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">Erro ao atualizar aplicação</h3>
                <p className="mt-2 text-sm">{err.message}</p>
              </div>
            </div>
          </div>
          
          <form method="post" action={`/clients/${clientId}/edit`} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome da Aplicação</label>
              <input id="name" name="name" type="text" value={name} required 
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">Nome visível da aplicação cliente</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <input id="description" name="description" type="text" value={description} 
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">Breve descrição sobre o propósito desta aplicação</p>
            </div>
            <div>
              <label htmlFor="callbacks" className="block text-sm font-medium text-gray-700 mb-1">URLs de Callback</label>
              <input id="callbacks" name="callbacks" type="text" value={callbacksRaw} 
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              <p className="mt-1 text-xs text-gray-500">URLs para onde o usuário será redirecionado após autenticação (separadas por vírgula)</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <a href="/clients" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
                <span className="material-icons mr-1 text-sm">arrow_back</span>
                Voltar
              </a>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                <span className="material-icons mr-1 text-sm">save</span>
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
});

// Handle delete action
clients.post("/:clientId/delete", async (c: Context) => {
  const { clientId } = c.req.param();
  try {
    await deleteAuth0Client(clientId);
    return c.redirect("/clients?success=deleted");
  } catch (err: any) {
    return c.text(`Erro ao excluir aplicação: ${err.message}`, 500);
  }
});

export default clients; 