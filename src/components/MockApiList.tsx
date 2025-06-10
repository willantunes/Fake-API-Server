/** @jsxImportSource hono/jsx */
// Removed: import { jsx, Fragment } from 'hono/jsx'; // Unused
import type { MockApi } from '../types/MockApi.ts';

interface MockApiListProps {
  apis: MockApi[];
  // other props as needed
}

function getAuthBadge(auth: MockApi['auth']) {
  if (auth.type === 'none') return null;
  
  const colors: Record<string, string> = {
    'bearer': 'bg-indigo-100 text-indigo-800',
    'oauth': 'bg-purple-100 text-purple-800',
    'client_credentials': 'bg-purple-100 text-purple-800',
    'api_key': 'bg-blue-100 text-blue-800',
    'custom_header': 'bg-teal-100 text-teal-800',
    'basic': 'bg-orange-100 text-orange-800',
    'jwt': 'bg-violet-100 text-violet-800'
  };
  
  const labels: Record<string, string> = {
    'bearer': 'Bearer',
    'oauth': 'OAuth',
    'client_credentials': 'Client Creds',
    'api_key': 'API Key',
    'custom_header': 'Header',
    'basic': 'Basic',
    'jwt': 'JWT'
  };
  
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors[auth.type] || 'bg-gray-100 text-gray-800'}`}>
      {labels[auth.type] || auth.type}
    </span>
  );
}

function getStatusBadge(code: number) {
  if (code >= 200 && code < 300) {
    return <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">{code}</span>;
  } else if (code >= 300 && code < 400) {
    return <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">{code}</span>;
  } else if (code >= 400 && code < 500) {
    return <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">{code}</span>;
  } else {
    return <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800">{code}</span>;
  }
}

function getMethodBadge(method: string) {
  const colors: Record<string, string> = {
    'GET': 'bg-blue-100 text-blue-800',
    'POST': 'bg-green-100 text-green-800',
    'PUT': 'bg-yellow-100 text-yellow-800',
    'PATCH': 'bg-purple-100 text-purple-800',
    'DELETE': 'bg-red-100 text-red-800',
    '*': 'bg-gray-100 text-gray-800'
  };
  return colors[method] || colors['*'];
}

export function SearchControls({ apis }: MockApiListProps) {
  // Group APIs by category for the dropdown
  const categories = new Map<string, MockApi[]>();
  apis.forEach(api => {
    const category = api.category || 'Sem Categoria';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(api);
  });

  // Extract unique tags
  const allTags = new Set<string>();
  apis.forEach(api => {
    if (api.tags) {
      api.tags.forEach(tag => allTags.add(tag));
    }
  });

  return (
    <div class="bg-white rounded-xl shadow-md p-4 mb-6">
      <div class="flex flex-wrap gap-3 items-center">
        {/* Search Input */}
        <div class="relative flex-grow max-w-md">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <span class="material-icons text-sm">search</span>
          </div>
          <input 
            type="text" 
            id="search-apis"
            name="q"
            placeholder="Buscar APIs..." 
            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
            hx-trigger="keyup changed delay:500ms"
            hx-get="/mock-api/search"
            hx-target="#api-results"
            hx-swap="innerHTML"
            hx-include="#search-apis, [name='method-filter'], [name='category-filter']"
          />
        </div>

        {/* Method Filter */}
        <div class="relative">
          <select 
            name="method-filter" 
            class="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8"
            hx-trigger="change"
            hx-get="/mock-api/search"
            hx-target="#api-results"
            hx-swap="innerHTML"
            hx-include="#search-apis, [name='category-filter']"
          >
            <option value="">Todos os Métodos</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <span class="material-icons text-sm">expand_more</span>
          </div>
        </div>

        {/* Category Filter */}
        <div class="relative">
          <select 
            name="category-filter" 
            class="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8"
            hx-trigger="change"
            hx-get="/mock-api/search"
            hx-target="#api-results"
            hx-swap="innerHTML"
            hx-include="#search-apis, [name='method-filter']"
          >
            <option value="">Todas as Categorias</option>
            {Array.from(categories.keys()).map(category => (
              <option value={category}>{category}</option>
            ))}
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <span class="material-icons text-sm">expand_more</span>
          </div>
        </div>

        {/* New API Button */}
        <div class="ml-auto">
          <a href="/mock-api/new" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1">
            <span class="material-icons text-sm">add</span>
            Nova API
          </a>
        </div>
      </div>

      {/* Tags */}
      {allTags.size > 0 && (
        <div class="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
          {Array.from(allTags).map(tag => (
            <span 
              class="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
              hx-get={`/mock-api/search?tag=${tag}`}
              hx-target="#api-results"
              hx-swap="innerHTML"
              hx-trigger="click"
              hx-include="#search-apis, [name='method-filter'], [name='category-filter']"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApiResults({ apis }: MockApiListProps) {
  // Group APIs by category
  const categories = new Map<string, MockApi[]>();
  apis.forEach(api => {
    const category = api.category || 'Sem Categoria';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(api);
  });

  if (apis.length === 0) {
    return (
      <div class="bg-white p-8 rounded-xl shadow-md text-center">
        <h3 class="text-xl mb-2 font-medium text-gray-700">Nenhuma API encontrada</h3>
        <p class="text-gray-500 mb-4">Tente ajustar seus filtros ou criar uma nova API</p>
        <a href="/mock-api/new" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md inline-flex items-center gap-1">
          <span class="material-icons text-sm">add</span>
          Criar primeira API
        </a>
      </div>
    );
  }

  return (
    <div>
      {Array.from(categories.entries()).map(([category, categoryApis]) => (
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-lg font-medium text-gray-700">{category}</h3>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {categoryApis.length}
            </span>
          </div>
          
          <div class="bg-white rounded-xl shadow-md overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Autenticação</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {categoryApis.map((api) => (
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadge(api.method)}`}>
                        {api.method}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-col">
                        <div class="text-sm font-medium text-gray-900">{api.description || api.path}</div>
                        <div class="text-xs text-gray-500 font-mono mt-1">
                          {'/api/' + (api.path.startsWith('/') ? api.path.slice(1) : api.path)}
                        </div>
                        {api.tags && api.tags.length > 0 && (
                          <div class="flex flex-wrap gap-1 mt-1">
                            {api.tags.map(tag => (
                              <span class="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs bg-gray-100 text-gray-600">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {getAuthBadge(api.auth)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center space-x-3">
                        <a href={`/mock-api/${api.id}`} title="Editar" class="text-gray-500 hover:text-blue-600">
                          <span class="material-icons">edit</span>
                        </a>
                        <form method="post" action={`/mock-api/${api.id}/delete`} class="inline" onsubmit="return confirm('Tem certeza que deseja excluir esta API?');">
                          <button type="submit" title="Excluir" class="text-gray-500 hover:text-red-600">
                            <span class="material-icons">delete</span>
                          </button>
                        </form>
                        <button
                          type="button"
                          data-url={'/api/' + (api.path.startsWith('/') ? api.path.slice(1) : api.path)}
                          data-method={api.method}
                          data-config={JSON.stringify(api)}
                          class="test-api-btn text-gray-500 hover:text-green-600"
                          title="Testar"
                        >
                          <span class="material-icons">play_arrow</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {/* Inline Test API Modal */}
      <div id="testApiModal" class="hidden fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
        <div class="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
          {/* Modal header */}
          <div class="flex justify-between items-center p-4 border-b border-gray-200" style="background-color: #002b49; color: white;">
            <div class="flex items-center space-x-2">
              <h2 class="text-lg font-bold text-white" id="testApiEndpoint">Testar API</h2>
              <span id="testApiMethod" class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"></span>
            </div>
            <button onclick="closeTestApiModal()" class="text-white hover:text-gray-200 text-xl p-1">&times;</button>
          </div>

          {/* Status summary */}
          <div class="flex items-center px-4 py-2 bg-gray-50">
            <div id="testApiSpinner" class="mr-2 animate-spin hidden">
              <span class="material-icons" style="color: #00b6d6;">autorenew</span>
            </div>
            <div class="flex items-center space-x-3 text-sm">
              <div>
                Status: <span id="testApiStatus" class="font-mono font-medium"></span>
              </div>
              <div class="w-px h-4 bg-gray-300"></div>
              <div id="testApiTimeContainer" class="hidden">
                Time: <span id="testApiTime" class="font-mono font-medium"></span>
              </div>
              <div class="w-px h-4 bg-gray-300"></div>
              <div>
                Size: <span id="testApiSize" class="font-mono font-medium">-</span>
              </div>
            </div>
          </div>
          
          {/* Tab navigation */}
          <div class="px-4 pt-3 border-b border-gray-200">
            <div class="flex space-x-4">
              <button 
                class="px-3 py-2 font-medium text-sm border-b-2 border-b-[#00b6d6] text-[#00b6d6]"
                onclick="switchTestTab('response')"
                id="testTab-response"
              >
                Resposta
              </button>
              <button 
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('headers')"
                id="testTab-headers"
              >
                Headers
              </button>
              <button 
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('config')"
                id="testTab-config"
              >
                Configuração
              </button>
              <button 
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('raw')"
                id="testTab-raw"
              >
                Raw
              </button>
              <button
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('metadata')"
                id="testTab-metadata"
              >
                Meta
              </button>
            </div>
          </div>
          
          {/* Tab content */}
          <div class="p-4 flex-1 overflow-auto">
            {/* Response Tab */}
            <div id="testTabContent-response" class="h-full">
              <pre id="testApiBody" class="bg-gray-100 p-4 rounded text-sm overflow-auto h-full font-mono"></pre>
            </div>
            
            {/* Headers Tab */}
            <div id="testTabContent-headers" class="hidden h-full">
              <div class="overflow-auto h-full rounded">
                <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    </tr>
                  </thead>
                  <tbody id="testHeadersTable" class="bg-white divide-y divide-gray-200">
                    {/* Headers will be inserted here */}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Config Tab */}
            <div id="testTabContent-config" class="hidden h-full">
              <div class="bg-gray-50 p-4 rounded border border-gray-200 h-full overflow-auto">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Configuração da API</h4>
                <dl id="testConfigDetails" class="space-y-2 text-sm">
                  {/* Config details will be inserted here */}
                </dl>
              </div>
            </div>
            
            {/* Raw Tab */}
            <div id="testTabContent-raw" class="hidden h-full">
              <pre id="testApiRaw" class="bg-gray-100 p-4 rounded text-sm overflow-auto h-full font-mono"></pre>
            </div>
            
            {/* Metadata Tab */}
            <div id="testTabContent-metadata" class="hidden h-full">
              <div class="bg-gray-50 p-4 rounded border border-gray-200 h-full overflow-auto">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Metadata da API</h4>
                <dl id="testMetadataDetails" class="space-y-2 text-sm">
                  {/* Metadata details will be inserted here */}
                </dl>
              </div>
            </div>
          </div>
          
          {/* Footer with actions */}
          <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between">
            <div>
              <button onclick="copyResponseToClipboard()" class="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700 flex items-center">
                <span class="material-icons text-xs mr-1">content_copy</span> Copiar
              </button>
            </div>
            <button onclick="retryRequest()" class="px-3 py-1 text-xs rounded flex items-center" style="background-color: rgba(0,182,214,0.1); color: #00b6d6;">
              <span class="material-icons text-xs mr-1">refresh</span> Repetir
            </button>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        // Current request info for retry functionality
        let currentTestInfo = { url: null, method: null, config: null };
        // Request abort controller
        let currentAbortController = null;

        // Switch tabs in the test modal
        window.switchTestTab = function(tabName) {
          // Hide all tab contents
          document.querySelectorAll('[id^="testTabContent-"]').forEach(el => el.classList.add('hidden'));
          // Show the selected tab content
          document.getElementById('testTabContent-' + tabName).classList.remove('hidden');
          
          // Update tab button styles
          document.querySelectorAll('[id^="testTab-"]').forEach(el => {
            el.classList.remove('border-b-[#00b6d6]', 'text-[#00b6d6]');
            el.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700');
          });
          document.getElementById('testTab-' + tabName).classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700');
          document.getElementById('testTab-' + tabName).classList.add('border-b-[#00b6d6]', 'text-[#00b6d6]');
        };

        // Retry the last request
        window.retryRequest = function() {
          if (currentTestInfo.url) {
            testApi(currentTestInfo.url, currentTestInfo.method, currentTestInfo.config);
          }
        };

        // Copy response to clipboard
        window.copyResponseToClipboard = function() {
          const text = document.getElementById('testApiBody').textContent;
          navigator.clipboard.writeText(text).then(() => {
            alert('Copiado para a área de transferência');
          }).catch(err => {
            console.error('Erro ao copiar: ', err);
          });
        };

        // Pretty print JSON
        function formatJson(jsonString) {
          try {
            const obj = JSON.parse(jsonString);
            return JSON.stringify(obj, null, 2);
          } catch (e) {
            return jsonString;
          }
        }

        // Format file size
        function formatBytes(bytes, decimals = 2) {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const dm = decimals < 0 ? 0 : decimals;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        // Main test API function
        window.testApi = async function(path, method, apiConfig) {
          const modal = document.getElementById('testApiModal'); if (!modal) return;
          
          // Store current test info for retry
          currentTestInfo = { url: path, method: method, config: apiConfig };
          
          // Reset the UI
          switchTestTab('response');

          // Show the modal and reset UI elements
          modal.classList.remove('hidden');
          
          const spinner = document.getElementById('testApiSpinner');
          spinner.classList.remove('hidden');
          
          const methodEl = document.getElementById('testApiMethod');
          methodEl.textContent = method;
          methodEl.className = methodEl.className.replace(/bg-\\w+-\\d+ text-\\w+-\\d+/, '');
          // Generate separate class tokens to avoid space in token errors
          const classString = (
            method === 'GET' ? 'bg-blue-100 text-blue-800' :
            method === 'POST' ? 'bg-green-100 text-green-800' :
            method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
            method === 'DELETE' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          );
          const classTokens = classString.split(' ');
          methodEl.classList.add(...classTokens);
          
          document.getElementById('testApiEndpoint').textContent = path;
          
          const statusEl = document.getElementById('testApiStatus');
          const timeEl = document.getElementById('testApiTime');
          const timeContainer = document.getElementById('testApiTimeContainer');
          const sizeEl = document.getElementById('testApiSize');
          const bodyEl = document.getElementById('testApiBody');
          const headersTableEl = document.getElementById('testHeadersTable');
          const configDetailsEl = document.getElementById('testConfigDetails');
          const rawEl = document.getElementById('testApiRaw');
          
          statusEl.textContent = '...';
          timeContainer.classList.add('hidden');
          timeEl.textContent = '';
          sizeEl.textContent = '-';
          bodyEl.textContent = 'Aguardando resposta...';
          headersTableEl.innerHTML = '<tr><td colspan="2" class="px-4 py-2 text-gray-500">Carregando...</td></tr>';
          configDetailsEl.innerHTML = '<div class="text-gray-500">Carregando...</div>';
          rawEl.textContent = '';
          
          // Create a new AbortController to enable timeouts
          if (currentAbortController) {
            currentAbortController.abort();
          }
          currentAbortController = new AbortController();
          const signal = currentAbortController.signal;
          
          const start = performance.now();
          try {
            // --- Inject authentication headers based on API config ---
            // Parse API config object
            let configObj = apiConfig;
            try {
              if (typeof configObj === 'string') {
                configObj = JSON.parse(configObj);
              }
            } catch (e) {
              console.warn('Invalid API config JSON for auth:', e);
            }
            
            // Build request URL and options
            let requestUrl = path;
            const fetchOptions = { method, cache: 'no-cache', signal };
            const headers = {};
            // Handle different auth types
            if (configObj.auth && configObj.auth.type !== 'none') {
              switch (configObj.auth.type) {
                case 'bearer':
                  if (configObj.auth.token) {
                    headers['Authorization'] = 'Bearer ' + configObj.auth.token;
                  }
                  break;
                case 'basic':
                  if (configObj.auth.username) {
                    const credentials = btoa(configObj.auth.username + ':' + (configObj.auth.password || ''));
                    headers['Authorization'] = 'Basic ' + credentials;
                  }
                  break;
                case 'api_key':
                  if (configObj.auth.apiKeyInQuery) {
                    const urlObj = new URL(path, window.location.origin);
                    urlObj.searchParams.set(configObj.auth.headerName, configObj.auth.apiKey);
                    requestUrl = urlObj.pathname + urlObj.search;
                  } else {
                    headers[configObj.auth.headerName] = configObj.auth.apiKey;
                  }
                  break;
                case 'custom_header':
                  headers[configObj.auth.headerName] = configObj.auth.headerValue;
                  break;
                case 'jwt':
                  if (configObj.auth.token) {
                    headers['Authorization'] = 'Bearer ' + configObj.auth.token;
                  }
                  break;
                // other auth types can be added here
              }
              if (Object.keys(headers).length > 0) {
                fetchOptions.headers = headers;
              }
            }
            // --- End auth header injection ---

            // Add HX-Request header to bypass layout
            fetchOptions.headers = { ...(fetchOptions.headers || {}), 'HX-Request': 'true' };


            const res = await fetch(requestUrl, fetchOptions);
            
            const end = performance.now();
            const responseTime = (end - start).toFixed(0);
            
            // Update status
            statusEl.textContent = \`\${res.status} \${res.statusText}\`;
            statusEl.className = 'font-mono font-medium';
            
            if (res.ok) {
              statusEl.classList.add('text-green-600');
            } else if (res.status >= 400 && res.status < 500) {
              statusEl.classList.add('text-yellow-600');
            } else if (res.status >= 500) {
              statusEl.classList.add('text-red-600');
            } else {
              statusEl.classList.add('text-blue-600');
            }
            
            // Update time
            timeContainer.classList.remove('hidden');
            timeEl.textContent = responseTime + 'ms';
            
            let text = '';
            try {
              text = await res.text();
            } catch (textErr) {
              console.warn('Error reading response text:', textErr);
              text = '[Error reading response body]';
            }
            
            sizeEl.textContent = formatBytes(text.length);
            
            // Update response tab
            let formattedText = text;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('json')) {
              try {
                formattedText = formatJson(text);
              } catch (jsonErr) {
                console.warn('Error formatting JSON:', jsonErr);
                formattedText = text;
              }
            }
            bodyEl.textContent = formattedText;
            
            // Update headers tab
            let headersHtml = '';
            res.headers.forEach((value, name) => {
              headersHtml += \`
                <tr>
                  <td class="px-4 py-2 font-medium text-gray-700">\${name}</td>
                  <td class="px-4 py-2 text-gray-500 font-mono">\${value}</td>
                </tr>
              \`;
            });
            headersTableEl.innerHTML = headersHtml || '<tr><td colspan="2" class="px-4 py-2 text-gray-500">Nenhum header encontrado</td></tr>';
            
            // Update raw tab
            rawEl.textContent = \`\${method} \${path} HTTP/1.1\\n\`;
            res.headers.forEach((value, name) => {
              rawEl.textContent += \`\${name}: \${value}\\n\`;
            });
            rawEl.textContent += \`\\n\${text}\`;
            
            // Update config tab (we'd need to fetch this from the server ideally)
            // For now let's use a simple placeholder:
            configDetailsEl.innerHTML = \`
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1 font-medium text-gray-700">Endpoint:</div>
                <div class="col-span-2 text-gray-500 font-mono">\${path}</div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1 font-medium text-gray-700">Método:</div>
                <div class="col-span-2 text-gray-500">\${method}</div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1 font-medium text-gray-700">Status:</div>
                <div class="col-span-2 text-gray-500">\${res.status} \${res.statusText}</div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1 font-medium text-gray-700">Tempo:</div>
                <div class="col-span-2 text-gray-500">\${responseTime}ms</div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1 font-medium text-gray-700">Content-Type:</div>
                <div class="col-span-2 text-gray-500">\${contentType || 'não especificado'}</div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1 font-medium text-gray-700">Tamanho:</div>
                <div class="col-span-2 text-gray-500">\${formatBytes(text.length)}</div>
              </div>
            \`;

            // Populate Metadata tab with API config details
            let cfgTemp = apiConfig;
            if (typeof cfgTemp === 'string') {
              try { cfgTemp = JSON.parse(cfgTemp); } catch(e) { console.warn('Invalid API config JSON', e); }
            }
            const metadataEl = document.getElementById('testMetadataDetails');
            if (metadataEl) {
              metadataEl.innerHTML =
                '<div class="grid grid-cols-3 gap-4">' +
                  '<div class="col-span-1 font-medium">Descrição:</div>' +
                  '<div class="col-span-2 text-gray-500">' + (cfgTemp.description || '-') + '</div>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-4">' +
                  '<div class="col-span-1 font-medium">Categoria:</div>' +
                  '<div class="col-span-2 text-gray-500">' + (cfgTemp.category || '-') + '</div>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-4">' +
                  '<div class="col-span-1 font-medium">Tags:</div>' +
                  '<div class="col-span-2 text-gray-500">' + (Array.isArray(cfgTemp.tags) ? cfgTemp.tags.join(', ') : '-') + '</div>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-4">' +
                  '<div class="col-span-1 font-medium">Autenticação:</div>' +
                  '<div class="col-span-2 text-gray-500">' + (cfgTemp.auth && cfgTemp.auth.type ? cfgTemp.auth.type : '-') + '</div>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-4">' +
                  '<div class="col-span-1 font-medium">Delay Simulado:</div>' +
                  '<div class="col-span-2 text-gray-500">' + (typeof cfgTemp.simDelay === 'number' ? cfgTemp.simDelay + 'ms' : '-') + '</div>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-4">' +
                  '<div class="col-span-1 font-medium">Status Code:</div>' +
                  '<div class="col-span-2 text-gray-500">' + (cfgTemp.statusCode != null ? cfgTemp.statusCode : '-') + '</div>' +
                '</div>';
            }
          } catch (err) {
            const end = performance.now();
            
            // Check if this was an abort error (timeout)
            if (err.name === 'AbortError') {
              statusEl.textContent = 'Timeout';
              statusEl.className = 'font-mono font-medium text-red-600';
              bodyEl.textContent = 'Erro: A requisição excedeu o tempo limite de 5 segundos.';
            } else {
              statusEl.textContent = 'Falha na Conexão';
              statusEl.className = 'font-mono font-medium text-red-600';
              
              const errorMessage = 'Erro: ' + (err.message || err);
              bodyEl.textContent = errorMessage;
            }
            
            // Update time for errors too
            timeContainer.classList.remove('hidden');
            timeEl.textContent = (end - start).toFixed(0) + 'ms';
            
            rawEl.textContent = errorMessage;
            headersTableEl.innerHTML = '<tr><td colspan="2" class="px-4 py-2 text-red-500">Erro na requisição</td></tr>';
            configDetailsEl.innerHTML = '<div class="text-red-500">Não foi possível obter configuração (erro na requisição)</div>';
          }
          
          // Hide spinner when done
          spinner.classList.add('hidden');
        };

        window.closeTestApiModal = function() {
          const modal = document.getElementById('testApiModal'); if (modal) modal.classList.add('hidden');
          // Abort any pending request when closing the modal
          if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
          }
        };
        
        // Close modal when clicking outside
        document.addEventListener('click', function(event) {
          const modal = document.getElementById('testApiModal');
          if (modal && !modal.classList.contains('hidden') && !event.target.closest('.bg-white')) {
            closeTestApiModal();
          }
        });

        // Attach test button click handlers
        document.querySelectorAll('.test-api-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            const method = this.getAttribute('data-method');
            let config = {};
            try {
              config = JSON.parse(this.getAttribute('data-config') || '{}');
            } catch(e) {
              console.error('Failed to parse API config:', e);
            }
            testApi(url, method, config);
          });
        });
      ` }} />
    </div>
  );
}