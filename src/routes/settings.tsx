/** @jsxImportSource hono/jsx */
import { Hono, Context } from "hono/mod.ts";
import { authMiddleware } from "../utils/auth.ts";
import { changeAuth0Password } from "../utils/auth0.ts";

const settings = new Hono();
settings.use("*", authMiddleware);

// Display the settings form
settings.get("/", (c: Context) => {
  const user = c.get("user") as { id: string; name?: string };
  c.set("title", "Configurações");
  c.set("breadcrumbs", [{ label: "Configurações" }]);
  return c.render(
    <div className="container mx-auto px-4 py-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Minha Conta</h1>
      <form method="post" action="/settings" className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
          <input 
            type="password" 
            id="newPassword" 
            name="newPassword" 
            required 
            className="mt-1 block w-full border-gray-300 rounded-md" 
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
          <input 
            type="password" 
            id="confirmPassword" 
            name="confirmPassword" 
            required 
            className="mt-1 block w-full border-gray-300 rounded-md" 
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Alterar Senha</button>
      </form>
    </div>
  );
});

// Handle form submission
settings.post("/", async (c: Context) => {
  const form = await c.req.formData();
  const newPassword = form.get("newPassword")?.toString() || "";
  const confirmPassword = form.get("confirmPassword")?.toString() || "";
  c.set("title", "Configurações");
  c.set("breadcrumbs", [{ label: "Configurações" }]);

  // Validate matching passwords
  if (newPassword !== confirmPassword) {
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-md">
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          <p className="font-medium">As senhas não coincidem.</p>
        </div>
        {/* Re-render form */}
        <form method="post" action="/settings" className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
            <input type="password" id="newPassword" name="newPassword" required className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Alterar Senha</button>
        </form>
      </div>
    );
  }

  // Attempt to change password
  const user = c.get("user") as { id: string; name?: string };
  try {
    await changeAuth0Password(user.id, newPassword);
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-md">
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
          <p className="font-medium">Senha alterada com sucesso.</p>
        </div>
      </div>
    );
  } catch (err: any) {
    return c.render(
      <div className="container mx-auto px-4 py-4 max-w-md">
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          <p className="font-medium">Erro ao alterar senha: {err.message}</p>
        </div>
        {/* Re-render form */}
        <form method="post" action="/settings" className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
            <input type="password" id="newPassword" name="newPassword" required className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required className="mt-1 block w-full border-gray-300 rounded-md" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Alterar Senha</button>
        </form>
      </div>
    );
  }
});

export default settings; 