/** @jsxImportSource hono/jsx */
import { Hono } from 'hono/mod.ts';
import { MockApiPage } from "../components/MockApiPage.tsx";
import { MockApiForm } from "../components/MockApiForm.tsx";
import type { MockApi, AuthConfig, ResponseType } from "../types/MockApi.ts";
import { ApiResults } from "../components/MockApiList.tsx";
import type { Variables } from "../main.tsx";

// Initialize the routes
const mockApi = new Hono<{ Variables: Variables }>();

// Main page - list of APIs
mockApi.get('/', async (c) => {
  const mockApiRepo = c.get('mockApiRepository');
  const apis = await mockApiRepo.getAllApis();
  const logs = (await mockApiRepo.getTrafficLogs()).logs;
  
  // Get notification parameters from URL
  const success = c.req.query('success');
  const error = c.req.query('error');
  const imported = c.req.query('imported');
  const skipped = c.req.query('skipped');
  const failed = c.req.query('failed');
  const message = c.req.query('message');
  
  // Determine if we should show a notification
  let notification = null;
  
  if (success === 'import-complete') {
    notification = {
      type: 'success',
      title: 'Importação concluída',
      message: `${imported} APIs importadas, ${skipped} ignoradas (já existentes) e ${failed} falhas.`
    };
  } else if (error === 'import-failed') {
    notification = {
      type: 'error',
      title: 'Falha na importação',
      message: message || 'Ocorreu um erro ao importar as APIs.'
    };
  } else if (error === 'no-file') {
    notification = {
      type: 'error',
      title: 'Arquivo não selecionado',
      message: 'Selecione um arquivo JSON para importar.'
    };
  } else if (error === 'invalid-json') {
    notification = {
      type: 'error',
      title: 'Arquivo inválido',
      message: 'O arquivo não contém JSON válido.'
    };
  } else if (error === 'export-failed') {
    notification = {
      type: 'error',
      title: 'Falha na exportação',
      message: 'Ocorreu um erro ao exportar as APIs.'
    };
  }
  
  c.set('title', 'APIs');
  return c.render(
    <>
      {notification && (
        <div id="notification" class={`mb-6 p-4 rounded-md ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <div class="flex">
            <div class="flex-shrink-0">
              <span class="material-icons">
                {notification.type === 'success' ? 'check_circle' : 'error'}
              </span>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium">{notification.title}</h3>
              <div class="mt-1 text-sm">
                <p>{notification.message}</p>
              </div>
            </div>
            <div class="ml-auto pl-3">
              <div class="-mx-1.5 -my-1.5">
                <button 
                  type="button" 
                  class={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${notification.type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' : 'text-red-500 hover:bg-red-100 focus:ring-red-600'}`}
                  onclick="this.closest('#notification').remove()"
                >
                  <span class="material-icons text-sm">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <MockApiPage apis={apis} logs={logs} />
    </>
  );
});

// HTMX search/filter handler - Moved BEFORE '/:id' to ensure correct matching
mockApi.get('/search', async (c) => {
  console.log("--- /mock-api/search handler accessed ---");
  const mockApiRepo = c.get('mockApiRepository');
  let apis = await mockApiRepo.getAllApis();
  
  const searchQuery = c.req.query('q') || '';
  const methodFilter = c.req.query('method-filter') || '';
  const categoryFilter = c.req.query('category-filter') || '';
  const tagFilter = c.req.query('tag') || '';
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    apis = apis.filter(api => 
      api.path.toLowerCase().includes(query) || 
      (api.description || '').toLowerCase().includes(query)
    );
  }
  if (methodFilter) {
    apis = apis.filter(api => api.method === methodFilter);
  }
  if (categoryFilter) {
    apis = apis.filter(api => (api.category || 'Sem Categoria') === categoryFilter);
  }
  if (tagFilter) {
    apis = apis.filter(api => api.tags?.includes(tagFilter));
  }
  
  return c.html(<ApiResults apis={apis} />);
});

// HTMX handler for auth fields
mockApi.get('/auth-fields', (c) => {
  const authType = c.req.query('type') || c.req.query('authType') || 'none';
  const token = c.req.query('token') || '';
  const apiKey = c.req.query('apiKey') || '';
  const headerName = c.req.query('headerName') || '';
  const headerValue = c.req.query('headerValue') || '';
  const username = c.req.query('username') || '';
  const password = c.req.query('password') || '';
  const clientId = c.req.query('clientId') || '';
  const clientSecret = c.req.query('clientSecret') || '';
  const allowedScopes = c.req.query('allowedScopes') || '';
  const requiredScopes = c.req.query('requiredScopes') || '';
  const apiKeyInQuery = c.req.query('apiKeyInQuery') === 'true';
  console.log('Auth fields request:', { 
    authType, 
    token, 
    apiKey, 
    headerName, 
    headerValue,
    username,
    password,
    clientId,
    clientSecret,
    allowedScopes,
    requiredScopes,
    apiKeyInQuery
  });

  switch (authType) {
    case 'bearer':
      return c.html(
        <div>
          <label for="token" class="block text-sm font-medium text-gray-700">Bearer Token</label>
          <input
            type="text"
            id="token"
            name="token"
            value={token}
            placeholder="Token de acesso"
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            required
            onblur="window.validateField && window.validateField(this)"
          />
          <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
        </div>
      );
    case 'api_key':
      return c.html(
        <>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="headerName" class="block text-sm font-medium text-gray-700">Nome do Header/Parâmetro</label>
              <input
                type="text"
                id="headerName"
                name="headerName"
                value={headerName || 'X-API-Key'}
                class="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
                onblur="window.validateField && window.validateField(this)"
              />
              <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
            </div>
            <div>
              <label for="apiKey" class="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="text"
                id="apiKey"
                name="apiKey"
                value={apiKey}
                class="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
                onblur="window.validateField && window.validateField(this)"
              />
              <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
            </div>
          </div>
          <div class="mt-2">
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                name="apiKeyInQuery"
                value="true"
                checked={apiKeyInQuery}
                class="mr-2"
              />
              <span class="text-sm text-gray-700">Aceitar API Key como parâmetro de query string</span>
            </label>
          </div>
        </>
      );
    case 'custom_header':
      return c.html(
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="headerName" class="block text-sm font-medium text-gray-700">Nome do Header</label>
            <input
              type="text"
              id="headerName"
              name="headerName"
              value={headerName}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
              onblur="window.validateField && window.validateField(this)"
            />
            <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
          </div>
          <div>
            <label for="headerValue" class="block text-sm font-medium text-gray-700">Valor do Header</label>
            <input
              type="text"
              id="headerValue"
              name="headerValue"
              value={headerValue}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
              onblur="window.validateField && window.validateField(this)"
            />
            <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
          </div>
        </div>
      );
    case 'basic':
      return c.html(
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">Usuário</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
              onblur="window.validateField && window.validateField(this)"
            />
            <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="text"
              id="password"
              name="password"
              value={password}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
              onblur="window.validateField && window.validateField(this)"
            />
            <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
          </div>
        </div>
      );
    case 'oauth':
    case 'client_credentials':
      return c.html(
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="clientId" class="block text-sm font-medium text-gray-700">Client ID</label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={clientId}
                class="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label for="clientSecret" class="block text-sm font-medium text-gray-700">Client Secret</label>
              <input
                type="text"
                id="clientSecret"
                name="clientSecret"
                value={clientSecret}
                class="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
          <div>
            <label for="allowedScopes" class="block text-sm font-medium text-gray-700">Escopos Permitidos (separados por espaço)</label>
            <input
              type="text"
              id="allowedScopes"
              name="allowedScopes"
              placeholder="read write profile"
              value={allowedScopes}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
      );
    case 'jwt':
      return c.html(
        <div class="space-y-4">
          <div>
            <label for="token" class="block text-sm font-medium text-gray-700">JWT Secret ou Public Key</label>
            <textarea
              id="token"
              name="token"
              rows={3}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2 font-mono text-sm"
            >{token}</textarea>
          </div>
          <div>
            <label for="requiredScopes" class="block text-sm font-medium text-gray-700">Claims Exigidos (JSON)</label>
            <input
              type="text"
              id="requiredScopes"
              name="requiredScopes"
              placeholder='{"role": "admin"}'
              value={requiredScopes}
              class="mt-1 block w-full border border-gray-300 rounded-md p-2 font-mono"
            />
          </div>
        </div>
      );
    default:
      return c.html(
        <div class="text-sm text-gray-500">Nenhuma configuração necessária para autenticação.</div>
      );
  }
});

// Add a new HTMX endpoint to check for duplicate path+method combinations
mockApi.get('/check-duplicate', async (c) => {
  const path = c.req.query('path') || '';
  const method = c.req.query('method') || 'GET';
  const currentId = c.req.query('id') || '';
  
  // Don't check if path is empty
  if (!path) {
    return c.html('');
  }
  
  console.log('Checking duplicate:', { path, method, currentId });
  
  const repo = c.get('mockApiRepository');
  const existingApi = await repo.findApiByPathAndMethod(path, method);
  
  if (existingApi && existingApi.id !== currentId) {
    return c.html(`
      <div class="validation-warning mt-2 flex items-start p-2 bg-amber-50 border border-amber-200 rounded-md">
        <span class="material-icons mr-2 text-amber-500 flex-shrink-0">warning</span>
        <div>
          <p class="text-sm text-amber-800">
            Esta API já existe: <strong>${method} ${path}</strong>
          </p>
          <a href="/mock-api/${existingApi.id}" class="text-xs text-amber-800 hover:text-amber-900 underline mt-1 inline-block">
            Ver ou editar API existente
          </a>
        </div>
      </div>
    `);
  }
  
  return c.html('');
});

// HTMX handler for CORS fields
mockApi.get('/cors-fields', (c) => {
  const enabled = (c.req.query('value') || c.req.query('corsEnabled')) === 'true';
  console.log('CORS fields request:', { enabled });
  
  if (!enabled) {
    return c.html(<div class="text-sm text-gray-500">CORS desabilitado para esta API.</div>);
  }
  
  const origins = c.req.query('corsOrigins') || '*';
  const headersVal = c.req.query('corsHeaders') || ''; // Renamed to avoid conflict with Headers class
  const methods = c.req.query('corsMethods') || '';
  const allowCredentials = c.req.query('corsCredentials') === 'true';
  
  return c.html(
    <div class="space-y-4 p-3 bg-white rounded-md border border-indigo-100 mt-2">
      <div>
        <label for="corsOrigins" class="block text-sm font-medium text-gray-700">Origens Permitidas (separadas por vírgula)</label>
        <input
          type="text"
          id="corsOrigins"
          name="corsOrigins"
          placeholder="*"
          value={origins}
          class="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
        <p class="text-xs text-gray-500 mt-1">Use * para permitir qualquer origem</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="corsHeaders" class="block text-sm font-medium text-gray-700">Headers Permitidos</label>
          <input
            type="text"
            id="corsHeaders"
            name="corsHeaders"
            placeholder="Content-Type, Authorization"
            value={headersVal} // Use renamed variable
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label for="corsMethods" class="block text-sm font-medium text-gray-700">Métodos Permitidos</label>
          <input
            type="text"
            id="corsMethods"
            name="corsMethods"
            placeholder="GET, POST, PUT, DELETE"
            value={methods}
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
      </div>
      <div class="flex items-center">
        <input
          type="checkbox"
          id="corsCredentials"
          name="corsCredentials"
          value="true"
          checked={allowCredentials}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="corsCredentials" class="ml-2 block text-sm text-gray-700">
          Permitir Credenciais (cookies, auth headers)
        </label>
      </div>
    </div>
  );
});

// HTMX handler for response fields
mockApi.get('/response-fields', (c) => {
  const type = c.req.query('type') || 'json';
  const body = c.req.query('body') || '';
  
  // Build HTML string directly to avoid TSX parsing issues
  const html = `
    <label for="body" class="block text-sm font-medium text-gray-700">Corpo da Resposta</label>
    <div class="relative">
      <textarea id="body" name="body" rows="10" class="mt-1 block w-full border border-gray-300 rounded-md p-2 font-mono text-sm" spellcheck="false">${body}</textarea>
      <div class="absolute top-2 right-2 flex space-x-1">
        ${type === 'json' ? `<button type="button" id="formatJson" class="p-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700" onclick="formatJsonBody()">Format</button>` : ''}
        <button type="button" class="p-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700" onclick="insertMockData()">Mock Data</button>
      </div>
    </div>
    <p class="text-xs text-gray-600 mt-1">
      Suporte para variáveis: <code class="bg-gray-100 px-1 py-0.5 rounded">{{req.path}}</code>, <code class="bg-gray-100 px-1 py-0.5 rounded">{{req.method}}</code>, <code class="bg-gray-100 px-1 py-0.5 rounded">{{date}}</code>, etc.
    </p>
  `;
  return c.html(html);
});

// HTMX handler for testing endpoints
mockApi.post('/test-endpoint', async (c) => {
  try {
    const apiPath = c.req.query('path') || '/';
    const method = c.req.query('method') || 'GET';
    const body = await c.req.text();
    const startTime = performance.now();
    
    // Create tabs structure for response
    let responseHTML = `
      <div class="tab-content" id="response-main" style="display: block;">
        <div class="space-y-4">`;
    
    // Request details
    let requestDetails = `
      <div class="border-b border-gray-200 pb-3 mb-3">
        <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
          <div class="flex items-center">
            <span class="material-icons text-xs mr-1">north_east</span>
            <span>Request</span>
          </div>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="bg-gray-800 text-green-400 p-3 rounded-t-md font-mono text-xs overflow-x-auto flex items-center">
          <span class="${method === 'GET' ? 'text-blue-400' : method === 'POST' ? 'text-green-400' : method === 'PUT' ? 'text-yellow-400' : method === 'DELETE' ? 'text-red-400' : 'text-indigo-400'} mr-2">${method}</span>
          <span>/api${apiPath}</span>
        </div>`;
    
    if (body) {
      try {
        const jsonBody = JSON.parse(body);
        requestDetails += `
          <div class="bg-gray-800 text-green-400 p-3 rounded-b-md font-mono text-xs overflow-x-auto border-t border-gray-700">
            ${JSON.stringify(jsonBody, null, 2)}
          </div>`;
      } catch (_e) {
        requestDetails += `
          <div class="bg-gray-800 text-green-400 p-3 rounded-b-md font-mono text-xs overflow-x-auto border-t border-gray-700">
            ${body}
          </div>`;
      }
    }
    requestDetails += `</div>`;
    
    responseHTML += requestDetails;
    
    const mockApiRepo = c.get('mockApiRepository');
    const apis = await mockApiRepo.getAllApis();
    const api = apis.find(a => (a.method === method || a.method === "*") && a.path === apiPath);
    
    if (!api) {
      return c.html(`
        <div class="tab-content" id="response-main" style="display: block;">
          <div class="space-y-4">
            ${requestDetails}
            <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
              <div class="flex items-center">
                <span class="material-icons text-xs mr-1">south_east</span>
                <span>Response</span>
              </div>
              <span class="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">404 Not Found</span>
            </div>
            <div class="bg-red-50 text-red-700 p-4 rounded-md flex items-start">
              <span class="material-icons mr-2">error_outline</span>
              <div>
                <p class="font-medium">API não encontrada</p>
                <p class="text-sm mt-1">Endpoint não encontrado. Crie primeiro o endpoint antes de testá-lo.</p>
                <a href="/mock-api/new" class="text-red-700 underline text-sm mt-2 inline-block">Criar nova API</a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="tab-content" id="response-headers" style="display: none;">
          <div class="p-4 text-center text-gray-500">
            <span class="material-icons mb-2 text-gray-300 text-2xl">info</span>
            <p>Não há informações de headers disponíveis para mostrar</p>
          </div>
        </div>
        
        <div class="tab-content" id="response-config" style="display: none;">
          <div class="p-4 text-center text-gray-500">
            <span class="material-icons mb-2 text-gray-300 text-2xl">settings</span>
            <p>Não há informações de configuração disponíveis para mostrar</p>
          </div>
        </div>
      `);
    }
    
    // Apply simulation delay
    let _appliedDelay = 0;
    if (api.simulation?.delay) {
      const delayStart = performance.now();
      await new Promise(r => setTimeout(r, api.simulation?.delay || 0));
      _appliedDelay = performance.now() - delayStart;
    }
    
    // Simulate network errors if enabled
    if (api.simulation?.networkErrors && Math.random() * 100 < (api.simulation.errorChance || 10)) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      return c.html(`
        <div class="tab-content" id="response-main" style="display: block;">
          <div class="space-y-4">
            ${requestDetails}
            <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
              <div class="flex items-center">
                <span class="material-icons text-xs mr-1">south_east</span>
                <span>Response</span>
              </div>
              <span class="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">Simulated Error</span>
            </div>
            <div class="bg-red-50 border border-red-100 text-red-700 p-4 rounded-md flex items-start">
              <span class="material-icons mr-2">error_outline</span>
              <div>
                <p class="font-medium">Erro de rede simulado</p>
                <p class="text-sm mt-1">A solicitação falhou devido à simulação de erro configurada nesta API.</p>
                <p class="text-xs mt-2 text-red-600">Chance de erro configurada: ${api.simulation.errorChance || 10}%</p>
                <p class="text-xs mt-1 text-red-600">Tempo total de processamento: ${processingTime.toFixed(2)}ms</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="tab-content" id="response-headers" style="display: none;">
          <div class="p-4 bg-red-50 text-red-700 rounded-md">
            <p>Erro simulado - Não há headers disponíveis</p>
          </div>
        </div>
        
        <div class="tab-content" id="response-config" style="display: none;">
          <div class="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Configuração da API</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Simulação:</span>
                <span class="text-red-600">Erros de rede (${api.simulation.errorChance || 10}% chance)</span>
              </div>
              ${api.simulation.delay ? `
                <div class="flex items-start">
                  <span class="font-medium w-40 text-gray-600">Atraso:</span>
                  <span>${api.simulation.delay}ms</span>
                </div>` : ''}
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Autenticação:</span>
                <span>${api.auth.type === 'none' ? 'Nenhuma' : api.auth.type}</span>
              </div>
              ${api.cors?.enabled ? `
                <div class="flex items-start">
                  <span class="font-medium w-40 text-gray-600">CORS:</span>
                  <span>Habilitado (${api.cors.origins?.[0] || '*'})</span>
                </div>` : ''}
            </div>
          </div>
        </div>
      `);
    }
    
    // Process response
    let responseContent;
    let responseData;
    
    if (api.response.type === 'json') {
      try {
        responseData = typeof api.response.data === 'string' 
          ? JSON.parse(api.response.data) 
          : api.response.data;
          
        responseContent = `
          <div class="bg-gray-800 text-blue-400 p-3 rounded-md font-mono text-xs overflow-x-auto" id="response-body">
            ${JSON.stringify(responseData, null, 2)}
          </div>`;
      } catch (_e) {
        responseContent = `
          <div class="bg-gray-800 text-blue-400 p-3 rounded-md font-mono text-xs overflow-x-auto" id="response-body">
            ${JSON.stringify({error: "Erro ao analisar JSON"}, null, 2)}
          </div>`;
      }
    } else {
      responseContent = `
        <div class="bg-gray-800 text-blue-400 p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap" id="response-body">
          ${api.response.data}
        </div>`;
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    // Generate headers tab content
    const headersContent = `
      <div class="tab-content" id="response-headers" style="display: none;">
        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Headers da Resposta</h4>
            <table class="w-full text-sm">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr>
                  <td class="px-3 py-2 font-medium">Content-Type</td>
                  <td class="px-3 py-2">${api.response.contentType || (api.response.type === 'json' ? 'application/json' : 'text/plain')}</td>
                </tr>
                ${api.cors?.enabled ? `
                <tr>
                  <td class="px-3 py-2 font-medium">Access-Control-Allow-Origin</td>
                  <td class="px-3 py-2">${api.cors.origins?.[0] || '*'}</td>
                </tr>` : ''}
                <tr>
                  <td class="px-3 py-2 font-medium">Status</td>
                  <td class="px-3 py-2">${api.statusCode} ${getStatusText(api.statusCode)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    
    // Generate configuration tab content
    const configContent = `
      <div class="tab-content" id="response-config" style="display: none;">
        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Configuração da API</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">ID:</span>
                <span class="font-mono">${api.id}</span>
              </div>
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Caminho:</span>
                <span class="font-mono">/api${api.path}</span>
              </div>
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Método:</span>
                <span>${api.method}</span>
              </div>
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Status Code:</span>
                <span>${api.statusCode} ${getStatusText(api.statusCode)}</span>
              </div>
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Tipo de Resposta:</span>
                <span>${api.response.type}${api.response.contentType ? ` (${api.response.contentType})` : ''}</span>
              </div>
              ${api.response.dynamic ? `
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Resposta Dinâmica:</span>
                <span>Sim</span>
              </div>` : ''}
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Autenticação:</span>
                <span>${api.auth.type === 'none' ? 'Nenhuma' : api.auth.type}</span>
              </div>
              ${api.simulation?.delay ? `
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Atraso:</span>
                <span>${api.simulation.delay}ms</span>
              </div>` : ''}
              ${api.simulation?.networkErrors ? `
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Simulação:</span>
                <span>Erros de rede (${api.simulation.errorChance || 10}% chance)</span>
              </div>` : ''}
              ${api.cors?.enabled ? `
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">CORS:</span>
                <span>Habilitado (${api.cors.origins?.[0] || '*'})</span>
              </div>` : ''}
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Criado:</span>
                <span>${new Date(api.createdAt).toLocaleString()}</span>
              </div>
              <div class="flex items-start">
                <span class="font-medium w-40 text-gray-600">Modificado:</span>
                <span>${new Date(api.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
          ${api.tags?.length ? `
          <div class="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Tags</h4>
            <div class="flex flex-wrap gap-2">
              ${api.tags.map(tag => `<span class="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-xs">${tag}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>`;
    
    // Complete the response HTML
    responseHTML += `
      <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
        <div class="flex items-center">
          <span class="material-icons text-xs mr-1">south_east</span>
          <span>Response</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="${api.statusCode >= 200 && api.statusCode < 300 ? 'bg-green-100 text-green-800' : api.statusCode >= 300 && api.statusCode < 400 ? 'bg-blue-100 text-blue-800' : api.statusCode >= 400 && api.statusCode < 500 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} px-2 py-0.5 rounded text-xs">${api.statusCode} ${getStatusText(api.statusCode)}</span>
          <span class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">${processingTime.toFixed(2)}ms</span>
        </div>
      </div>
      ${responseContent}
    </div>
  </div>
  
  ${headersContent}
  ${configContent}`;
    
    return c.html(responseHTML);
  } catch (error) {
    return c.html(`
      <div class="bg-red-100 text-red-700 p-4 rounded-md flex items-start">
        <span class="material-icons mr-2">error_outline</span>
        <div>
          <p class="font-medium">Erro ao testar endpoint</p>
          <p class="text-sm mt-1">${(error as Error).message || "Erro desconhecido"}</p>
        </div>
      </div>
    `);
  }
});

// Helper function to get status text
function getStatusText(code: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return statusTexts[code] || '';
}

// Create new API handler
mockApi.post('/new', async (c) => {
  const repo = c.get('mockApiRepository');
  const form = await c.req.formData();
  console.log('Creating API with form data:', Object.fromEntries(form.entries()));
  
  try {
    const method = String(form.get('method') || 'GET');
    // Normalize path to ensure it starts with a slash
    const rawPath = String(form.get('path') || '/');
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const description = String(form.get('description') || '');
    const statusCode = Number(form.get('statusCode') || 200);
    // Extract simulation delay from number input or range input
    const simDelay = Number(form.get('simDelay') ?? form.get('simDelayRange') ?? 0);
    const responseType = String(form.get('responseType') || 'json');
    const contentType = form.get('contentType') ? String(form.get('contentType')) : undefined;
    const bodyText = String(form.get('body') || '');
    
    const authType = String(form.get('authType') || 'none');
    const auth: AuthConfig = { type: authType as AuthConfig["type"] };
    
    if (authType === 'bearer') {
      auth.token = String(form.get('token') || '');
    } else if (authType === 'api_key') {
      auth.headerName = String(form.get('headerName') || 'X-API-Key');
      auth.apiKey = String(form.get('apiKey') || '');
      auth.apiKeyInQuery = form.get('apiKeyInQuery') === 'true';
    } else if (authType === 'custom_header') {
      auth.headerName = String(form.get('headerName') || '');
      auth.headerValue = String(form.get('headerValue') || '');
    } else if (authType === 'basic') {
      auth.username = String(form.get('username') || '');
      auth.password = String(form.get('password') || '');
    } else if (authType === 'oauth' || authType === 'client_credentials') {
      auth.clientId = String(form.get('clientId') || '');
      auth.clientSecret = String(form.get('clientSecret') || '');
      const scopesValue = String(form.get('allowedScopes') || '');
      if (scopesValue) {
        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
        const scopes: string[] = [];
        let match;
        while ((match = regex.exec(scopesValue)) !== null) {
          if (match[1]) scopes.push(match[1]); 
          else if (match[2]) scopes.push(match[2]); 
          else scopes.push(match[0]);
        }
        auth.allowedScopes = scopes.length > 0 ? scopes : scopesValue.split(/\s+/).filter(Boolean);
      } else {
        auth.allowedScopes = [];
      }
    } else if (authType === 'jwt') {
      auth.token = String(form.get('token') || '');
      const requiredScopes = String(form.get('requiredScopes') || '');
      if (requiredScopes) {
        try {
          auth.requiredScopes = JSON.parse(requiredScopes);
        } catch (_e) {
          auth.requiredScopes = {};
        }
      }
    }
    
    const corsEnabled = form.get('corsEnabled') === 'true';
    let cors;
    if (corsEnabled) {
      cors = {
        enabled: true,
        origins: String(form.get('corsOrigins') || '*').split(',').map(s => s.trim()),
        allowCredentials: form.get('corsCredentials') === 'true',
        allowedHeaders: String(form.get('corsHeaders') || '').split(',').map(s => s.trim()).filter(Boolean),
        allowedMethods: String(form.get('corsMethods') || '').split(',').map(s => s.trim()).filter(Boolean)
      };
    }
    
    // Checkbox presence indicates simulation of network errors
    const simulateNetworkErrors = form.has('simulateNetworkErrors');
    const errorChance = Number(form.get('errorChance') || 0);
    
    let responseData;
    if (responseType === 'json') {
      try {
        responseData = JSON.parse(bodyText);
      } catch {
        responseData = bodyText;
      }
    } else {
      responseData = bodyText;
    }

    const category = String(form.get('category') || '');
    const tagsString = String(form.get('tags') || '');
    const tags = tagsString.split(',').map(s => s.trim()).filter(Boolean);
    const active = form.get('active') === 'true';

    // Prevent duplicate path+method
    const existingApi = await repo.findApiByPathAndMethod(path, method);
    if (existingApi) {
      // Set title and breadcrumbs for the error page
      c.set('title', 'Criar Nova API');
      c.set('breadcrumbs', [
        { href: '/mock-api', label: 'APIs' },
        { label: 'Criar Nova API' }
      ]);
      
      const url = new URL(c.req.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      
      // Return to form with error message
      return c.render(
        <>
          <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <div class="flex items-start">
              <div class="flex-shrink-0 pt-0.5">
                <span class="material-icons text-red-500">error_outline</span>
              </div>
              <div class="ml-3">
                <h3 class="text-lg font-medium">Erro ao criar API</h3>
                <p class="mt-1">
                  A API <strong>{method} {path}</strong> já existe. Escolha um caminho diferente ou outro método HTTP.
                </p>
                <div class="mt-3">
                  <a href={`/mock-api/${existingApi.id}`} class="text-sm text-red-700 underline hover:text-red-900">
                    Editar API existente
                  </a>
                </div>
              </div>
            </div>
          </div>
          <MockApiForm action="/mock-api/new" baseUrl={baseUrl} />
        </>
      );
    }

    await repo.createApi({
      method, path, description, statusCode, auth, cors,
      simulation: { delay: simDelay, networkErrors: simulateNetworkErrors, errorChance },
      response: {
        data: responseData,
        chunks: 0,
        type: responseType as ResponseType,
        contentType,
        dynamic: form.get('dynamicResponse') === 'true'
      },
      category: category || undefined, tags,
      active,
    });
    
    // HTMX redirect support
    if (c.req.header('HX-Request') === 'true') {
      c.header('HX-Redirect', '/mock-api');
      return c.text('');
    }
    return c.redirect('/mock-api');
  } catch (error) {
    console.error('Error creating API:', error);
    
    c.set('title', 'Criar Nova API - Erro');
    c.set('breadcrumbs', [
      { href: '/mock-api', label: 'APIs' },
      { label: 'Criar Nova API' }
    ]);
    
    const url = new URL(c.req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    return c.render(
      <>
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <div class="flex items-start">
            <div class="flex-shrink-0 pt-0.5">
              <span class="material-icons text-red-500">error_outline</span>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium">Erro ao criar API</h3>
              <p class="mt-1">
                {(error as Error).message || "Erro desconhecido"}
              </p>
            </div>
          </div>
        </div>
        <MockApiForm action="/mock-api/new" baseUrl={baseUrl} />
      </>
    );
  }
});

// Render create form
mockApi.get('/new', async (c) => {
  c.set('title', 'Criar Nova API');
  c.set('breadcrumbs', [
    { href: '/mock-api', label: 'APIs' },
    { label: 'Criar Nova API' }
  ]);
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return c.render(<MockApiForm action="/mock-api/new" baseUrl={baseUrl} />);
});

// Edit API form (allow any string as ID, but /export and /import must be registered before this)
mockApi.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  console.log('Edit API route hit for id:', id);
  const repo = c.get('mockApiRepository');
  const api = await repo.getApiById(id);
  if (!api) return c.redirect('/mock-api');
  c.set('title', `Editar API - ${api.path}`);
  c.set('breadcrumbs', [
    { href: '/mock-api', label: 'APIs' },
    { label: `Editar API: ${api.path}` }
  ]);
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return c.render(<MockApiForm api={api} action={`/mock-api/${id}`} baseUrl={baseUrl} />);
});

// Update API handler (allow any string as ID, but /export and /import must be registered before this)
mockApi.post('/:id', async (c) => {
  const repo = c.get('mockApiRepository');
  const id = c.req.param('id')!;
  const form = await c.req.formData();
  console.log('Updating API', id, 'with form data:', Object.fromEntries(form.entries()));
  
  try {
    const method = String(form.get('method') || 'GET');
    // Normalize path to ensure it starts with a slash
    const rawPath = String(form.get('path') || '/');
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const description = String(form.get('description') || '');
    const statusCode = Number(form.get('statusCode') || 200);
    // Extract simulation delay from number or range input
    const simDelay = Number(form.get('simDelay') ?? form.get('simDelayRange') ?? 0);
    const responseType = String(form.get('responseType') || 'json');
    const contentType = form.get('contentType') ? String(form.get('contentType')) : undefined;
    const bodyText = String(form.get('body') || '');
    
    const authType = String(form.get('authType') || 'none');
    const auth: AuthConfig = { type: authType as AuthConfig["type"] };

    if (authType === 'bearer') {
      auth.token = String(form.get('token') || '');
    } else if (authType === 'api_key') {
      auth.headerName = String(form.get('headerName') || 'X-API-Key');
      auth.apiKey = String(form.get('apiKey') || '');
      auth.apiKeyInQuery = form.get('apiKeyInQuery') === 'true';
    } else if (authType === 'custom_header') {
      auth.headerName = String(form.get('headerName') || '');
      auth.headerValue = String(form.get('headerValue') || '');
    } else if (authType === 'basic') {
      auth.username = String(form.get('username') || '');
      auth.password = String(form.get('password') || '');
    } else if (authType === 'oauth' || authType === 'client_credentials') {
      auth.clientId = String(form.get('clientId') || '');
      auth.clientSecret = String(form.get('clientSecret') || '');
      const scopesValue = String(form.get('allowedScopes') || '');
      if (scopesValue) {
        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
        const scopes: string[] = [];
        let match;
        while ((match = regex.exec(scopesValue)) !== null) {
          if (match[1]) scopes.push(match[1]);
          else if (match[2]) scopes.push(match[2]);
          else scopes.push(match[0]);
        }
        auth.allowedScopes = scopes.length > 0 ? scopes : scopesValue.split(/\s+/).filter(Boolean);
      } else {
        auth.allowedScopes = [];
      }
    } else if (authType === 'jwt') {
      auth.token = String(form.get('token') || '');
      const requiredScopes = String(form.get('requiredScopes') || '');
      if (requiredScopes) {
        try {
          auth.requiredScopes = JSON.parse(requiredScopes);
        } catch (_e) {
          auth.requiredScopes = {};
        }
      }
    }
    
    const corsEnabled = form.get('corsEnabled') === 'true';
    let cors;
    if (corsEnabled) {
      cors = {
        enabled: true,
        origins: String(form.get('corsOrigins') || '*').split(',').map(s => s.trim()),
        allowCredentials: form.get('corsCredentials') === 'true',
        allowedHeaders: String(form.get('corsHeaders') || '').split(',').map(s => s.trim()).filter(Boolean),
        allowedMethods: String(form.get('corsMethods') || '').split(',').map(s => s.trim()).filter(Boolean)
      };
    }
    
    // Checkbox presence indicates simulation of network errors
    const simulateNetworkErrors = form.has('simulateNetworkErrors');
    const errorChance = Number(form.get('errorChance') || 0);
    
    let responseData;
    if (responseType === 'json') {
      try {
        responseData = JSON.parse(bodyText);
      } catch {
        responseData = bodyText;
      }
    } else {
      responseData = bodyText;
    }

    const category = String(form.get('category') || '');
    const tagsString = String(form.get('tags') || '');
    const tags = tagsString.split(',').map(s => s.trim()).filter(Boolean);
    const active = form.get('active') === 'true';

    // Prevent duplicate path+method on update
    const existingApi2 = await repo.findApiByPathAndMethod(path, method);
    if (existingApi2 && existingApi2.id !== id) {
      const api = await repo.getApiById(id);
      if (!api) return c.redirect('/mock-api');
      
      c.set('title', `Editar API - ${api.path}`);
      c.set('breadcrumbs', [
        { href: '/mock-api', label: 'APIs' },
        { label: `Editar API: ${api.path}` }
      ]);
      
      const url = new URL(c.req.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      
      return c.render(
        <>
          <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <div class="flex items-start">
              <div class="flex-shrink-0 pt-0.5">
                <span class="material-icons text-red-500">error_outline</span>
              </div>
              <div class="ml-3">
                <h3 class="text-lg font-medium">Erro ao atualizar API</h3>
                <p class="mt-1">
                  A API <strong>{method} {path}</strong> já existe. Escolha um caminho diferente ou outro método HTTP.
                </p>
                <div class="mt-3">
                  <a href={`/mock-api/${existingApi2.id}`} class="text-sm text-red-700 underline hover:text-red-900">
                    Editar API existente
                  </a>
                </div>
              </div>
            </div>
          </div>
          <MockApiForm api={api} action={`/mock-api/${id}`} baseUrl={baseUrl} />
        </>
      );
    }

    await repo.updateApi(id, {
      id, path, method, description, statusCode, auth, cors,
      simulation: { delay: simDelay, networkErrors: simulateNetworkErrors, errorChance },
      response: {
        data: responseData,
        chunks: 0,
        type: responseType as ResponseType,
        contentType,
        dynamic: form.get('dynamicResponse') === 'true'
      },
      category: category || undefined, tags,
      active,
    });
    
    // HTMX redirect support
    if (c.req.header('HX-Request') === 'true') {
      c.header('HX-Redirect', '/mock-api');
      return c.text('');
    }
    return c.redirect('/mock-api');
  } catch (error) {
    console.error('Error updating API:', error);
    return c.text(`Error updating API: ${(error as Error).message || "Unknown error"}`, { status: 500 });
  }
});

// Delete API handler
mockApi.post('/:id/delete', async (c) => {
  const repo = c.get('mockApiRepository');
  const id = c.req.param('id')!;
  try {
    console.log('Deleting API', id);
    await repo.deleteApi(id);
    // HTMX redirect support
    if (c.req.header('HX-Request') === 'true') {
      c.header('HX-Redirect', '/mock-api');
      return c.text('');
    }
    return c.redirect('/mock-api');
  } catch (error) {
    console.error('Error deleting API:', error);
    // Return structured error response
    if (c.req.header('HX-Request') === 'true') {
      return c.html(`<div class="bg-red-100 text-red-700 p-4 rounded-md">Erro ao deletar API: ${(error as Error).message}</div>`);
    }
    return c.text(`Error deleting API: ${(error as Error).message || "Unknown error"}`, { status: 500 });
  }
});

// Duplicate API handler
mockApi.post('/:id/duplicate', async (c) => {
  const repo = c.get('mockApiRepository');
  const id = c.req.param('id')!;
  
  try {
    const originalApi = await repo.getApiById(id);
    if (!originalApi) {
      return c.html(
        `<div class="bg-red-100 text-red-700 p-4 rounded-md">
          API não encontrada.
        </div>`
      );
    }
    
    const duplicatedApi = await repo.createApi({
      path: `${originalApi.path}_copy`,
      method: originalApi.method,
      description: `${originalApi.description || originalApi.path} (Cópia)`,
      statusCode: originalApi.statusCode,
      auth: originalApi.auth,
      cors: originalApi.cors,
      simulation: originalApi.simulation,
      response: originalApi.response,
      tags: originalApi.tags ? [...originalApi.tags, 'duplicated'] : ['duplicated'],
      category: originalApi.category
    });
    
    const allApis = await repo.getAllApis();
    const categories = new Map<string, MockApi[]>();
    allApis.forEach(api => {
      const category = api.category || 'Sem Categoria';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(api);
    });
    
    return c.html(
      <div id="api-results-container" hx-swap-oob="true" class="bg-green-100 text-green-800 p-4 rounded-md mb-4">
        API duplicada com sucesso! 
        <a href={`/mock-api/${duplicatedApi.id}`} class="underline hover:text-green-900">Editar a cópia</a>
        <ApiResults apis={allApis} />
      </div>
    );

  } catch (error) {
    console.error('Error duplicating API:', error);
    return c.html(
      `<div class="bg-red-100 text-red-700 p-4 rounded-md">
        Erro ao duplicar API: ${(error as Error).message}
      </div>`
    );
  }
});

// Export APIs
mockApi.route('/export')
  .get(async (c) => {
    const repo = c.get('mockApiRepository');
    try {
      const exportData = await repo.exportApis();
      
      // Use a more unique filename that includes the word "json" to help browsers identify it
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mockapi-export-${timestamp}.json`;
      
      // Force the appropriate JSON content type regardless of Accept headers
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Prevent caching
        'Cache-Control': 'no-store, max-age=0',
        // Force file download in all browsers
        'X-Content-Type-Options': 'nosniff'
      });
      
      // Create raw response to bypass Hono's content negotiation
      const jsonStr = JSON.stringify(exportData, null, 2);
      console.log(`Exporting JSON (GET): ${jsonStr.substring(0, 100)}...`);
      return new Response(jsonStr, { 
        status: 200, 
        headers 
      });
    } catch (error) {
      console.error('Error exporting APIs:', error);
      c.header('HX-Redirect', '/mock-api?error=export-failed');
      return c.text('');
    }
  })
  .post(async (c) => {
    const repo = c.get('mockApiRepository');
    try {
      const formData = await c.req.formData();
      const selectedIdsRaw = formData.get('selectedIds');
      let selectedIds: string[] = [];
      if (selectedIdsRaw) {
        try {
          selectedIds = JSON.parse(selectedIdsRaw as string);
        } catch (e) {
          selectedIds = [];
        }
      }
      let apis;
      if (selectedIds.length > 0) {
        const all = await repo.getAllApis();
        apis = all.filter(api => selectedIds.includes(api.id));
      } else {
        apis = await repo.getAllApis();
      }
      const exportData = {
        apis,
        timestamp: new Date().toISOString(),
        version: "1.0"
      };
      
      // Use a more unique filename that includes the word "json" to help browsers identify it
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `mockapi-export-${timestamp}.json`;
      
      // Force the appropriate JSON content type regardless of Accept headers
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Prevent caching
        'Cache-Control': 'no-store, max-age=0',
        // Force file download in all browsers
        'X-Content-Type-Options': 'nosniff'
      });
      
      // Create raw response to bypass Hono's content negotiation
      const jsonStr = JSON.stringify(exportData, null, 2);
      console.log(`Exporting JSON: ${jsonStr.substring(0, 100)}...`);
      return new Response(jsonStr, { 
        status: 200, 
        headers 
      });
    } catch (error) {
      console.error('Error exporting APIs:', error);
      c.header('HX-Redirect', '/mock-api?error=export-failed');
      return c.text('');
    }
  });

// Import APIs via HTMX OOB updates
mockApi.post('/import', async (c) => {
  const repo = c.get('mockApiRepository');
  try {
    const formData = await c.req.formData();
    const file = formData.get('apiFile') as File;
    if (!file) {
      return c.html(
        <div id="notification" hx-swap-oob="true" class="bg-red-100 text-red-700 p-4 rounded-md">
          Selecione um arquivo JSON para importar.
        </div>
      );
    }
    const fileContent = await file.text();
    let importData;
    try {
      importData = JSON.parse(fileContent);
    } catch (_e) {
      return c.html(
        <div id="notification" hx-swap-oob="true" class="bg-red-100 text-red-700 p-4 rounded-md">
          Arquivo inválido: não contém JSON válido.
        </div>
      );
    }
    const result = await repo.importApis(importData);
    const all = await repo.getAllApis();
    return c.html(
      <>
        <div id="notification" hx-swap-oob="true" class="bg-green-100 text-green-800 p-4 rounded-md mb-4">
          {result.imported} APIs importadas, {result.skipped} ignoradas, {result.failed} falharam.
        </div>
        <div id="api-results" hx-swap-oob="true">
          <ApiResults apis={all} />
        </div>
      </>
    );
  } catch (e) {
    return c.html(
      <div id="notification" hx-swap-oob="true" class="bg-red-100 text-red-700 p-4 rounded-md">
        Erro ao importar: {(e as Error).message}
      </div>
    );
  }
});

export default mockApi; 