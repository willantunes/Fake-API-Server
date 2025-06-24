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

  // Add state for selected APIs using a global variable for SSR/HTMX compatibility
  // We'll use a hidden input and a form for export

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

        {/* Import/Export Buttons */}
        <form id="exportSelectedForm" method="post" action="/mock-api/export" class="flex gap-2 items-center">
          <button 
            type="button" 
            class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
            onclick="document.getElementById('importApiModal').classList.remove('hidden')"
          >
            <span class="material-icons text-sm">upload</span>
            Importar
          </button>
          <input type="hidden" name="selectedIds" id="selectedIdsInput" value="[]" />
          <button
            type="submit"
            class="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1 opacity-50 cursor-not-allowed"
            id="exportSelectedBtn"
            disabled
          >
            <span class="material-icons text-sm">download</span>
            Exportar Selecionados
          </button>
        </form>

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

      {/* Import API Modal */}
      <div id="importApiModal" class="hidden fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
        <div class="bg-white rounded-lg w-11/12 max-w-md max-h-[90vh] flex flex-col shadow-xl">
          {/* Modal header */}
          <div class="flex justify-between items-center p-4 border-b border-gray-200" style="background-color: #002b49; color: white;">
            <div class="flex items-center space-x-2">
              <h2 class="text-lg font-bold text-white">Importar APIs</h2>
            </div>
            <button type="button" onclick="document.getElementById('importApiModal').classList.add('hidden')" class="text-white hover:text-gray-200 text-xl p-1">&times;</button>
          </div>

          <form id="importApiForm" hx-post="/mock-api/import" hx-encoding="multipart/form-data" hx-swap="none" enctype="multipart/form-data" class="p-6 space-y-4">
            <div>
              <label for="apiFile" class="block text-sm font-medium text-gray-700 mb-2">
                Selecione o arquivo JSON com as definições de API
              </label>
              <input
                type="file"
                id="apiFile"
                name="apiFile"
                accept=".json,application/json"
                class="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                required
              />
            </div>
            
            <div class="bg-blue-50 p-4 rounded-md text-sm text-blue-700">
              <p class="flex items-start">
                <span class="material-icons text-blue-700 mr-2">info</span>
                <span>
                  O arquivo deve conter definições de API no formato JSON exportado pelo sistema.
                  As APIs com caminhos e métodos já existentes serão ignoradas.
                </span>
              </p>
            </div>
            
            <div class="pt-4 flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                onclick="document.getElementById('importApiModal').classList.add('hidden')"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Importar
              </button>
            </div>
          </form>
        </div>
      </div>
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

  // Add state for selected APIs
  // Selection state will be handled by DOM/JS, not React state

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
      {/* Remove global select all checkbox */}
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
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input type="checkbox" class="api-select-all" />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Autenticação</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {categoryApis.map((api) => (
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        class="api-select-checkbox"
                        value={api.id}
                      />
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
                        <a
                          href={`/mock-api/${api.id}/postman-collection`}
                          download={`postman-${api.method}-${api.path.replace(/\//g, '_')}.json`}
                          title="Exportar para Postman"
                          class="text-gray-500 hover:text-orange-600"
                          style={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                          <span class="material-icons" style={{ fontSize: '18px' }}>download</span>
                        </a>
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
            <button type="button" onclick="closeTestApiModal()" class="text-white hover:text-gray-200 text-xl p-1">&times;</button>
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
                type="button"
                class="px-3 py-2 font-medium text-sm border-b-2 border-b-[#00b6d6] text-[#00b6d6]"
                onclick="switchTestTab('response')"
                id="testTab-response"
              >
                Resposta
              </button>
              <button 
                type="button"
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('headers')"
                id="testTab-headers"
              >
                Headers
              </button>
              <button 
                type="button"
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('config')"
                id="testTab-config"
              >
                Configuração
              </button>
              <button 
                type="button"
                class="px-3 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700"
                onclick="switchTestTab('raw')"
                id="testTab-raw"
              >
                Raw
              </button>
              <button
                type="button"
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
              <button type="button" onclick="copyResponseToClipboard()" class="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700 flex items-center">
                <span class="material-icons text-xs mr-1">content_copy</span> Copiar
              </button>
            </div>
            <button type="button" onclick="retryRequest()" class="px-3 py-1 text-xs rounded flex items-center" style="background-color: rgba(0,182,214,0.1); color: #00b6d6;">
              <span class="material-icons text-xs mr-1">refresh</span> Repetir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockApiListPage({ apis }: MockApiListProps) {
  return (
    <>
      <SearchControls apis={apis} />
      <ApiResults apis={apis} />
      <script>{`
window.selectedApiIds = [];

function updateExportSelectedState() {
  // Find all checkboxes that are currently in the DOM
  const checkboxes = document.querySelectorAll('.api-select-checkbox');

  // Update selected IDs array
  window.selectedApiIds = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  // Update hidden input for the form
  const input = document.getElementById('selectedIdsInput');
  if (input) {
    input.value = JSON.stringify(window.selectedApiIds);
  }
  
  // Update button state
  const btn = document.getElementById('exportSelectedBtn');
  if (btn) {
    if (window.selectedApiIds.length > 0) {
      btn.removeAttribute('disabled');
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
                  } else {
      btn.setAttribute('disabled', 'disabled');
      btn.classList.add('opacity-50', 'cursor-not-allowed');
                  }
  }

  // Update per-category select all checkboxes
  document.querySelectorAll('.api-select-all').forEach(master => {
    const table = master.closest('table');
    if (table) {
      const catCheckboxes = table.querySelectorAll('.api-select-checkbox');
      const allCatChecked = catCheckboxes.length > 0 && Array.from(catCheckboxes).every(cb => cb.checked);
      master.checked = allCatChecked;
            }
  });

  // No global select all logic
  console.log('Updated selection state:', window.selectedApiIds.length, 'items selected');
}

// Modified to handle the specific category's checkboxes
function toggleAllApiCheckboxes(master) {
  // Find the closest table to the master checkbox
  const table = master.closest('table');
  if (table) {
    // Only toggle checkboxes within this table
    const checkboxes = table.querySelectorAll('.api-select-checkbox');
    checkboxes.forEach(cb => { 
      cb.checked = master.checked;
    });
  }
  updateExportSelectedState();
}

function attachCheckboxHandlers() {
  // Attach handlers to all checkboxes
  document.querySelectorAll('.api-select-checkbox').forEach(cb => {
    // Remove existing handlers first to prevent duplicates
    cb.removeEventListener('change', updateExportSelectedState);
    cb.addEventListener('change', updateExportSelectedState);
  });
  
  // Handle master checkboxes (now with class selector)
  document.querySelectorAll('.api-select-all').forEach(master => {
    // Use a closure to capture the right master checkbox
    const handleChange = function() { toggleAllApiCheckboxes(this); };
    master.removeEventListener('change', handleChange);
    master.addEventListener('change', handleChange);
  });
}

window.submitExportSelected = function(event) {
  if (window.selectedApiIds.length === 0) {
    event.preventDefault();
    return false;
  }
  return true;
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  attachCheckboxHandlers();
  updateExportSelectedState();
});

// Also listen for htmx events to reattach handlers after content is loaded
document.body.addEventListener('htmx:afterSettle', () => {
  attachCheckboxHandlers();
  updateExportSelectedState();
});

// Additionally listen for htmx:afterSwap to catch all cases
document.body.addEventListener('htmx:afterSwap', () => {
  attachCheckboxHandlers();
  updateExportSelectedState();
});

// Add mutation observer as a fallback to ensure we catch all DOM changes
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      attachCheckboxHandlers();
      updateExportSelectedState();
      break;
          }
  }
});
        
// Start observing once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const apiResults = document.getElementById('api-results');
  if (apiResults) {
    observer.observe(apiResults, { childList: true, subtree: true });
  }
        });
      `}</script>
    </>
  );
}