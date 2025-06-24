/** @jsxImportSource hono/jsx */
import { Hono } from 'hono/mod.ts';
import type { Variables } from "../main.tsx";

// Initialize the routes
const trafficLogs = new Hono<{ Variables: Variables }>();

// Traffic logs main page
trafficLogs.get('/', async (c) => {
  const mockApiRepo = c.get('mockApiRepository');
  const logs = await mockApiRepo.getTrafficLogs(10, 1);
  
  c.set('title', 'Logs de Tráfego');
  
  // Compute metrics for display
  const allLogsRes = await mockApiRepo.getTrafficLogs(logs.total, 1);
  const allLogs = allLogsRes.logs;
  const totalRequests = logs.total;
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const requestsToday = allLogs.filter(log => log.timestamp >= startOfToday).length;
  const successCount = allLogs.filter(log => log.response.status >= 200 && log.response.status < 300).length;
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0;
  const averageTime = totalRequests > 0 ? Math.round(allLogs.reduce((acc, log) => acc + log.performance.total, 0) / totalRequests) : 0;
  
  // Parse query parameters for filters
  const url = new URL(c.req.url);
  const pathFilter = url.searchParams.get('path') || '';
  const methodFilter = url.searchParams.get('method') || '';
  const statusFilter = url.searchParams.get('status') || '';
  
  // Apply filters if any are set
  let filteredLogs = logs.logs;
  if (pathFilter || methodFilter || statusFilter) {
    filteredLogs = logs.logs.filter(log => {
      // Filter by path
      if (pathFilter && !log.request.path.toLowerCase().includes(pathFilter.toLowerCase())) {
        return false;
      }
      
      // Filter by method
      if (methodFilter && log.request.method !== methodFilter) {
        return false;
      }
      
      // Filter by status code
      if (statusFilter) {
        const statusCode = String(log.response.status);
        if (!statusCode.includes(statusFilter)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  return c.render(
    <div class="w-full max-w-full">
      {/* Metrics Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-md p-4 relative overflow-hidden">
          <div class="text-sm text-gray-600 font-medium mb-2">Total de Requisições</div>
          <div class="text-2xl font-bold text-brand-dark mt-2 pr-12">{logs.total}</div>
          <div class="absolute right-4 top-4 bg-brand-light/10 p-2.5 rounded-lg text-brand-light flex items-center justify-center">
            <span class="material-icons">analytics</span>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-4 relative overflow-hidden">
          <div class="text-sm text-gray-600 font-medium mb-2">Requisições Hoje</div>
          <div class="text-2xl font-bold text-brand-dark mt-2 pr-12">{requestsToday}</div>
          <div class="absolute right-4 top-4 bg-brand-secondary/10 p-2.5 rounded-lg text-brand-secondary flex items-center justify-center">
            <span class="material-icons">today</span>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-4 relative overflow-hidden">
          <div class="text-sm text-gray-600 font-medium mb-2">Taxa de Sucesso</div>
          <div class="text-2xl font-bold text-brand-primary mt-2 pr-12">{`${successRate}%`}</div>
          <div class="absolute right-4 top-4 bg-blue-100 p-2.5 rounded-lg text-blue-600 flex items-center justify-center">
            <span class="material-icons">trending_up</span>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-md p-4 relative overflow-hidden">
          <div class="text-sm text-gray-600 font-medium mb-2">Tempo Médio</div>
          <div class="text-2xl font-bold text-brand-dark mt-2 pr-12">{`${averageTime}ms`}</div>
          <div class="absolute right-4 top-4 bg-green-100 p-2.5 rounded-lg text-green-600 flex items-center justify-center">
            <span class="material-icons">speed</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <form class="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-3 items-center" method="GET" action="/traffic">
        <div class="relative flex-grow max-w-md">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <span class="material-icons">search</span>
          </div>
          <input 
            type="text" 
            name="path"
            value={pathFilter}
            placeholder="Filtrar por caminho..." 
            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent"
          />
        </div>
        
        <div class="relative">
          <select 
            name="method"
            value={methodFilter}
            class="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent"
          >
            <option value="">Todos Métodos</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <span class="material-icons text-sm">expand_more</span>
          </div>
        </div>
        
        <div class="relative">
          <input 
            type="text" 
            name="status"
            value={statusFilter}
            placeholder="Código de status" 
            class="bg-white border border-gray-300 rounded-md px-4 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent"
          />
        </div>
        
        <button type="submit" class="bg-brand-light text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-1">
          <span class="material-icons">filter_list</span>
          Filtrar
        </button>
        
        {(pathFilter || methodFilter || statusFilter) && (
          <a 
            href="/traffic" 
            class="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <span class="material-icons">clear</span>
            Limpar Filtros
          </a>
        )}
        
        <button
          id="clear-logs-button"
          type="button"
          class="bg-red-600 hover:bg-opacity-90 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-1"
        >
          <span class="material-icons">delete</span>
          Limpar Logs
        </button>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('clear-logs-button');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    if (!confirm('Tem certeza de que deseja limpar todos os logs?')) return;
    try {
      const res = await fetch('/api/traffic/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao limpar logs');
      const data = await res.json();
      document.querySelectorAll('.log-entry').forEach(el => el.remove());
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow';
      toast.textContent = 'Logs limpos: ' + data.count;
      document.body.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 3000);
    } catch (e) {
      alert(e.message);
    }
  });
});
` }} />

      {/* Logs */}
      <div class="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        {filteredLogs.length > 0 ? (
          <div>
            {filteredLogs.map((log, index) => (
              <div class="log-entry" data-log-id={log.id}>
                <div class="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-all duration-200" 
                     onclick={`document.getElementById('log-details-${index}').classList.toggle('hidden');
                               this.querySelector('.expand-icon').classList.toggle('rotate-180');
                               this.classList.toggle('bg-gray-50');`}>
                  <div class="p-4 flex justify-between items-center">
                    <div class="flex gap-3 items-center">
                      <div class={`px-2 py-1 rounded text-xs font-semibold
                        ${log.request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                          log.request.method === 'POST' ? 'bg-green-100 text-green-800' :
                          log.request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          log.request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`
                      }>
                        {log.request.method}
                      </div>
                      <div class="font-mono text-sm truncate max-w-md text-gray-700">{log.request.path}</div>
                      <div class={`px-2 py-1 rounded text-xs font-medium
                        ${log.response.status >= 200 && log.response.status < 300 ? 'bg-green-100 text-green-800' :
                          log.response.status >= 300 && log.response.status < 400 ? 'bg-blue-100 text-blue-800' :
                          log.response.status >= 400 && log.response.status < 500 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'}`
                      }>
                        {log.response.status}
                      </div>
                    </div>
                    <div class="flex items-center gap-6">
                      <div class="text-gray-500 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div class="text-gray-500 text-sm">
                        {log.performance.total.toFixed(2)}ms
                      </div>
                      <div class="bg-gray-100 rounded-full p-1 transition-transform duration-200 expand-icon">
                        <span class="material-icons text-gray-400">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div id={`log-details-${index}`} class="hidden border-b border-gray-200">
                  <div class="bg-gray-50 px-0 pb-4 text-sm text-gray-700">
                    {/* Tabs */}
                    <div class="border-b border-gray-200 bg-white">
                      <div class="flex overflow-x-auto">
                        <button 
                          class="px-4 py-2 border-b-2 border-brand-light text-brand-light font-medium tab-btn"
                          onclick={`
                            document.querySelectorAll('#log-details-${index} .tab-content').forEach(el => el.classList.add('hidden'));
                            document.getElementById('overview-tab-${index}').classList.remove('hidden');
                            document.querySelectorAll('#log-details-${index} .tab-btn').forEach(el => {
                              el.classList.remove('border-brand-light', 'text-brand-light');
                              el.classList.add('border-transparent', 'text-gray-500');
                            });
                            this.classList.remove('border-transparent', 'text-gray-500');
                            this.classList.add('border-brand-light', 'text-brand-light');
                          `}
                          id={`overview-tab-btn-${index}`}
                          type="button"
                        >
                          <span class="flex items-center gap-1">
                            <span class="material-icons text-sm">info</span>
                            Visão Geral
                          </span>
                        </button>
                        <button 
                          class="px-4 py-2 border-b-2 border-transparent text-gray-500 font-medium tab-btn"
                          onclick={`
                            document.querySelectorAll('#log-details-${index} .tab-content').forEach(el => el.classList.add('hidden'));
                            document.getElementById('request-tab-${index}').classList.remove('hidden');
                            document.querySelectorAll('#log-details-${index} .tab-btn').forEach(el => {
                              el.classList.remove('border-brand-light', 'text-brand-light');
                              el.classList.add('border-transparent', 'text-gray-500');
                            });
                            this.classList.remove('border-transparent', 'text-gray-500');
                            this.classList.add('border-brand-light', 'text-brand-light');
                          `}
                          type="button"
                        >
                          <span class="flex items-center gap-1">
                            <span class="material-icons text-sm">arrow_upward</span>
                            Requisição
                          </span>
                        </button>
                        <button 
                          class="px-4 py-2 border-b-2 border-transparent text-gray-500 font-medium tab-btn"
                          onclick={`
                            document.querySelectorAll('#log-details-${index} .tab-content').forEach(el => el.classList.add('hidden'));
                            document.getElementById('response-tab-${index}').classList.remove('hidden');
                            document.querySelectorAll('#log-details-${index} .tab-btn').forEach(el => {
                              el.classList.remove('border-brand-light', 'text-brand-light');
                              el.classList.add('border-transparent', 'text-gray-500');
                            });
                            this.classList.remove('border-transparent', 'text-gray-500');
                            this.classList.add('border-brand-light', 'text-brand-light');
                          `}
                          type="button"
                        >
                          <span class="flex items-center gap-1">
                            <span class="material-icons text-sm">arrow_downward</span>
                            Resposta
                          </span>
                        </button>
                        {log.error && (
                          <button 
                            class="px-4 py-2 border-b-2 border-transparent text-gray-500 font-medium tab-btn"
                            onclick={`
                              document.querySelectorAll('#log-details-${index} .tab-content').forEach(el => el.classList.add('hidden'));
                              document.getElementById('error-tab-${index}').classList.remove('hidden');
                              document.querySelectorAll('#log-details-${index} .tab-btn').forEach(el => {
                                el.classList.remove('border-brand-light', 'text-brand-light');
                                el.classList.add('border-transparent', 'text-gray-500');
                              });
                              this.classList.remove('border-transparent', 'text-gray-500');
                              this.classList.add('border-brand-light', 'text-brand-light');
                            `}
                            type="button"
                          >
                            <span class="flex items-center gap-1">
                              <span class="material-icons text-sm text-red-500">error</span>
                              Erro
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Overview Tab */}
                    <div id={`overview-tab-${index}`} class="tab-content px-4 pt-4">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                          <h3 class="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
                            <span class="material-icons text-brand-light">analytics</span>
                            Informações Gerais
                          </h3>
                          <div class="space-y-2">
                            <div class="flex justify-between">
                              <span class="text-gray-600">ID:</span>
                              <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{log.id}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Timestamp:</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Método:</span>
                              <span class={`px-2 py-0.5 rounded text-xs font-semibold
                                ${log.request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                  log.request.method === 'POST' ? 'bg-green-100 text-green-800' :
                                  log.request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                  log.request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'}`
                              }>{log.request.method}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Caminho:</span>
                              <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{log.request.path}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-gray-600">Status:</span>
                              <span class={`px-2 py-0.5 rounded text-xs font-medium
                                ${log.response.status >= 200 && log.response.status < 300 ? 'bg-green-100 text-green-800' :
                                  log.response.status >= 300 && log.response.status < 400 ? 'bg-blue-100 text-blue-800' :
                                  log.response.status >= 400 && log.response.status < 500 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'}`
                              }>{log.response.status}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                          <h3 class="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
                            <span class="material-icons text-brand-light">speed</span>
                            Performance
                          </h3>
                          <div class="space-y-3">
                            <div>
                              <div class="flex justify-between mb-1">
                                <span class="text-sm text-gray-600">Total:</span>
                                <span class="text-sm font-medium">{log.performance.total.toFixed(2)}ms</span>
                              </div>
                              <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-brand-primary h-2 rounded-full" style={`width: 100%`}></div>
                              </div>
                            </div>
                            
                            <div>
                              <div class="flex justify-between mb-1">
                                <span class="text-sm text-gray-600">Autenticação:</span>
                                <span class="text-sm font-medium">{log.performance.auth.toFixed(2)}ms</span>
                              </div>
                              <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-500 h-2 rounded-full" style={`width: ${(log.performance.auth / log.performance.total) * 100}%`}></div>
                              </div>
                            </div>
                            
                            <div>
                              <div class="flex justify-between mb-1">
                                <span class="text-sm text-gray-600">Processamento:</span>
                                <span class="text-sm font-medium">{log.performance.processing.toFixed(2)}ms</span>
                              </div>
                              <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-green-500 h-2 rounded-full" style={`width: ${(log.performance.processing / log.performance.total) * 100}%`}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Request Tab */}
                    <div id={`request-tab-${index}`} class="tab-content hidden px-4 pt-4">
                      <div class="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <div class="flex justify-between items-center mb-2">
                          <h3 class="text-lg font-medium text-gray-800 flex items-center gap-2">
                            <span class="material-icons text-brand-light">swap_vert</span>
                            URL e Parâmetros
                          </h3>
                          <button class="text-brand-light hover:text-brand-dark" 
                                  onclick={`navigator.clipboard.writeText('${log.request.path}'); 
                                            this.innerHTML = '<span class="text-green-500 text-xs">Copiado!</span>'; 
                                            setTimeout(() => { this.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000)`}
                                  type="button">
                            <span class="material-icons">content_copy</span>
                          </button>
                        </div>
                        <div class="font-mono text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                          <div class="flex">
                            <span class="text-purple-600 mr-2">{log.request.method}</span>
                            <span class="text-gray-800">{log.request.path}</span>
                          </div>
                        </div>
                        
                        {Object.keys(log.request.query).length > 0 && (
                          <div class="mt-3">
                            <h4 class="text-sm font-medium text-gray-700 mb-1">Query Params</h4>
                            <div class="overflow-x-auto">
                              <table class="w-full text-sm">
                                <thead>
                                  <tr class="bg-gray-50">
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(log.request.query).map(([key, value]) => (
                                    <tr class="border-t border-gray-200">
                                      <td class="px-2 py-1 font-medium">{key}</td>
                                      <td class="px-2 py-1 font-mono">{value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div class="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <div class="flex justify-between items-center mb-2">
                          <h3 class="text-lg font-medium text-gray-800 flex items-center gap-2">
                            <span class="material-icons text-brand-light">dns</span>
                            Headers
                          </h3>
                          <button class="text-brand-light hover:text-brand-dark" 
                                  onclick={`navigator.clipboard.writeText('${JSON.stringify(log.request.headers, null, 2)}'); 
                                            this.innerHTML = '<span class="text-green-500 text-xs">Copiado!</span>'; 
                                            setTimeout(() => { this.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000)`}
                                  type="button">
                            <span class="material-icons">content_copy</span>
                          </button>
                        </div>
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="bg-gray-50">
                                <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(log.request.headers).map(([key, value]) => (
                                <tr class="border-t border-gray-200">
                                  <td class="px-2 py-1 font-medium whitespace-nowrap">{key}</td>
                                  <td class="px-2 py-1 font-mono">{value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {log.request.body && (
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                          <div class="flex justify-between items-center mb-2">
                            <h3 class="text-lg font-medium text-gray-800 flex items-center gap-2">
                              <span class="material-icons text-brand-light">code</span>
                              Body
                            </h3>
                            <button class="text-brand-light hover:text-brand-dark" 
                                    onclick={`navigator.clipboard.writeText('${typeof log.request.body === 'string' ? log.request.body : JSON.stringify(log.request.body, null, 2)}'); 
                                              this.innerHTML = '<span class="text-green-500 text-xs">Copiado!</span>'; 
                                              setTimeout(() => { this.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000)`}
                                    type="button">
                              <span class="material-icons">content_copy</span>
                            </button>
                          </div>
                          <pre class="bg-gray-100 p-3 rounded overflow-x-auto max-h-64 font-mono text-sm">{typeof log.request.body === 'string' ? log.request.body : JSON.stringify(log.request.body, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    
                    {/* Response Tab */}
                    <div id={`response-tab-${index}`} class="tab-content hidden px-4 pt-4">
                      <div class="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <div class="flex justify-between items-center mb-2">
                          <h3 class="text-lg font-medium text-gray-800 flex items-center gap-2">
                            <span class="material-icons text-brand-light">analytics</span>
                            Status
                          </h3>
                        </div>
                        <div class="font-mono text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                          <div class="flex items-center">
                            <div class={`px-2 py-0.5 rounded text-xs font-medium mr-2
                              ${log.response.status >= 200 && log.response.status < 300 ? 'bg-green-100 text-green-800' :
                                log.response.status >= 300 && log.response.status < 400 ? 'bg-blue-100 text-blue-800' :
                                log.response.status >= 400 && log.response.status < 500 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'}`
                            }>
                              {log.response.status}
                            </div>
                            <span class="text-gray-800">
                              {log.response.status >= 200 && log.response.status < 300 ? 'Success' :
                               log.response.status >= 300 && log.response.status < 400 ? 'Redirection' :
                               log.response.status >= 400 && log.response.status < 500 ? 'Client Error' :
                               'Server Error'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div class="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <div class="flex justify-between items-center mb-2">
                          <h3 class="text-lg font-medium text-gray-800 flex items-center gap-2">
                            <span class="material-icons text-brand-light">dns</span>
                            Headers
                          </h3>
                          <button class="text-brand-light hover:text-brand-dark" 
                                  onclick={`navigator.clipboard.writeText('${JSON.stringify(log.response.headers, null, 2)}'); 
                                            this.innerHTML = '<span class="text-green-500 text-xs">Copiado!</span>'; 
                                            setTimeout(() => { this.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000)`}
                                  type="button">
                            <span class="material-icons">content_copy</span>
                          </button>
                        </div>
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="bg-gray-50">
                                <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(log.response.headers).map(([key, value]) => (
                                <tr class="border-t border-gray-200">
                                  <td class="px-2 py-1 font-medium whitespace-nowrap">{key}</td>
                                  <td class="px-2 py-1 font-mono">{value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div class="bg-white p-4 rounded-lg shadow-sm">
                        <div class="flex justify-between items-center mb-2">
                          <h3 class="text-lg font-medium text-gray-800 flex items-center gap-2">
                            <span class="material-icons text-brand-light">code</span>
                            Body
                          </h3>
                          <button class="text-brand-light hover:text-brand-dark" 
                                  onclick={`navigator.clipboard.writeText('${typeof log.response.body === 'string' ? log.response.body : JSON.stringify(log.response.body, null, 2)}'); 
                                            this.innerHTML = '<span class="text-green-500 text-xs">Copiado!</span>'; 
                                            setTimeout(() => { this.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000)`}
                                  type="button">
                            <span class="material-icons">content_copy</span>
                          </button>
                        </div>
                        <pre class="bg-gray-100 p-3 rounded overflow-x-auto max-h-64 font-mono text-sm">{typeof log.response.body === 'string' ? log.response.body : JSON.stringify(log.response.body, null, 2)}</pre>
                      </div>
                    </div>
                    
                    {/* Error Tab */}
                    {log.error && (
                      <div id={`error-tab-${index}`} class="tab-content hidden px-4 pt-4">
                        <div class="bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm">
                          <h3 class="text-lg font-medium text-red-800 flex items-center gap-2 mb-2">
                            <span class="material-icons">error</span>
                            Erro
                          </h3>
                          <div class="text-red-700 mb-2">{log.error.message}</div>
                          
                          {log.error.timing && (
                            <div class="mt-4">
                              <h4 class="text-sm font-medium text-red-800 mb-2">Informações de Timing</h4>
                              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {log.error.timing.configured !== undefined && (
                                  <div class="bg-white p-2 rounded border border-red-100">
                                    <div class="text-xs text-red-600">Configurado</div>
                                    <div class="text-sm font-medium">{log.error.timing.configured}ms</div>
                                  </div>
                                )}
                                {log.error.timing.actual !== undefined && (
                                  <div class="bg-white p-2 rounded border border-red-100">
                                    <div class="text-xs text-red-600">Atual</div>
                                    <div class="text-sm font-medium">{log.error.timing.actual}ms</div>
                                  </div>
                                )}
                                {log.error.timing.total !== undefined && (
                                  <div class="bg-white p-2 rounded border border-red-100">
                                    <div class="text-xs text-red-600">Total</div>
                                    <div class="text-sm font-medium">{log.error.timing.total}ms</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {log.error.stack && (
                            <div class="mt-4">
                              <h4 class="text-sm font-medium text-red-800 mb-2">Stack Trace</h4>
                              <pre class="bg-white p-2 rounded border border-red-100 text-xs font-mono overflow-x-auto">{log.error.stack}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div class="p-8 text-center text-gray-500">
            <div class="mb-4">
              <img src="/static/chart.svg" alt="Analytics" class="w-16 h-16 mx-auto" />
            </div>
            {logs.logs.length > 0 ? (
              <>
                <h3 class="text-xl mb-2 font-medium">Nenhum log corresponde aos filtros</h3>
                <p>Ajuste os critérios de filtragem ou <a href="/traffic" class="text-brand-light hover:underline">limpe os filtros</a></p>
              </>
            ) : (
              <>
                <h3 class="text-xl mb-2 font-medium">Nenhum log encontrado</h3>
                <p>Faça algumas solicitações de API para vê-las registradas aqui</p>
              </>
            )}
          </div>
        )}
      </div>

      {logs.logs.length > 0 && logs.total > logs.logs.length && (
        <div class="flex justify-center mb-6">
          <div class="flex items-center space-x-2">
            <button type="button" disabled class="px-3 py-1 rounded-md bg-gray-200 text-gray-400">
              <span class="material-icons text-sm">chevron_left</span>
            </button>
            <span class="px-3 py-1 rounded-md bg-brand-primary text-white">1</span>
            <button type="button" class="px-3 py-1 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
              <span class="material-icons text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default trafficLogs; 