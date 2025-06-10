/** @jsxImportSource hono/jsx */

import type { MockApi, TrafficLog } from '../types/MockApi.ts';
import { SearchControls, ApiResults } from './MockApiList.tsx';

interface MockApiPageProps {
  apis: MockApi[];
  logs: TrafficLog[];
}

export function MockApiPage({ apis, logs }: MockApiPageProps) {
  // Metrics for dashboard tiles
  const totalApis = apis.length;
  const totalRequests = logs.length;
  const methodCounts: Record<string, number> = {};
  apis.forEach(api => {
    methodCounts[api.method] = (methodCounts[api.method] || 0) + 1;
  });
  const statusCounts: Record<number, number> = {};
  logs.forEach(log => {
    const group = Math.floor(log.response.status / 100) * 100;
    statusCounts[group] = (statusCounts[group] || 0) + 1;
  });

  return (
    <div class="api-list-container">
      {/* Dashboard Tiles */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total de APIs */}
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Total de APIs</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{totalApis}</p>
            </div>
            <div class="bg-blue-100 p-2.5 rounded-lg text-blue-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">api</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/mock-api" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
              Ver todas
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
        {/* Requisições */}
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Requisições</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{totalRequests}</p>
            </div>
            <div class="bg-green-100 p-2.5 rounded-lg text-green-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">sync</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/traffic" class="text-sm text-green-600 hover:text-green-800 inline-flex items-center">
              Ver logs
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
        {/* Métodos HTTP */}
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Métodos HTTP</p>
              <div class="flex flex-wrap gap-1 mt-2">
                {Object.entries(methodCounts).map(([method, count]) => (
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      method === 'POST' ? 'bg-green-100 text-green-800' :
                      method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}`}> 
                    {method} ({count})
                  </span>
                ))}
              </div>
            </div>
            <div class="bg-purple-100 p-2.5 rounded-lg text-purple-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">http</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/mock-api" class="text-sm text-purple-600 hover:text-purple-800 inline-flex items-center">
              Ver detalhes
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
        {/* Status HTTP */}
        <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-amber-600">
          <div class="flex items-start justify-between">
            <div class="pr-4">
              <p class="text-sm font-medium text-gray-600">Status HTTP</p>
              <div class="flex flex-wrap gap-1 mt-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${status === '200' ? 'bg-green-100 text-green-800' :
                      status === '300' ? 'bg-blue-100 text-blue-800' :
                      status === '400' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}> 
                    {status}s ({count})
                  </span>
                ))}
              </div>
            </div>
            <div class="bg-amber-100 p-2.5 rounded-lg text-amber-600 flex-shrink-0 flex items-center justify-center">
              <span class="material-icons">assistant</span>
            </div>
          </div>
          <div class="mt-2">
            <a href="/traffic" class="text-sm text-amber-600 hover:text-amber-800 inline-flex items-center">
              Ver detalhes
              <span class="material-icons text-sm ml-1">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
      <div id="search-controls">
        <SearchControls apis={apis} />
      </div>
      <div id="api-results">
        <ApiResults apis={apis} />
      </div>
    </div>
  );
} 