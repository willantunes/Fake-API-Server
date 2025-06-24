/// <reference lib="dom" />
/** @jsxImportSource hono/jsx */
import type { MockApi } from "../types/MockApi.ts";

interface MockApiFormProps {
  api?: MockApi;
  action: string;
  baseUrl?: string;
}

// Utility function to safely get input elements with null checks
function getInputElement(id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const element = document.getElementById(id);
  return element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
}

// FIRST_EDIT: Declare global window functions for TS
declare global {
  interface Window {
    addHeaderRow: () => void;
    handleTestRequest: () => void;
    validateForm: () => boolean;
    validateField: (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => boolean;
    showValidationError: (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, message: string) => void;
    clearValidationError: (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => void;
  }
}

export function MockApiForm({ api, action, baseUrl = "" }: MockApiFormProps) {
  const isEdit = Boolean(api);
  const defaultJsonResponse = '{\n  "message": "Success",\n  "data": {}\n}';
  
  // Format the currentResponse for display
  const responseValue = isEdit
    ? api?.response.type === 'json'
      ? typeof api?.response.data === 'string'
        ? api.response.data
        : JSON.stringify(api?.response.data, null, 2)
      : String(api?.response.data || '')
    : defaultJsonResponse;

  // Use the URL's origin as the base URL for API requests
  const apiBaseUrl = `${baseUrl}/api`;

  // Format JSON helper function
  const formatJsonBody = () => {
    const textarea = getInputElement('body');
    if (!textarea) return;
    try {
      const json = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(json, null, 2);
    } catch (e) {
      alert('JSON inválido. Não foi possível formatar.');
    }
  };

  // Insert mock data helper function
  const insertMockData = () => {
    const textarea = getInputElement('body');
    const responseTypeEl = getInputElement('responseType');
    
    if (!textarea || !responseTypeEl) return;
    
    const responseType = responseTypeEl.value;
    
    if (responseType === 'json') {
      textarea.value = JSON.stringify({
        success: true,
        data: {
          id: "{{uuid}}",
          name: "Example Item",
          createdAt: "{{date}}",
          attributes: ["feature1", "feature2"],
          metadata: {
            version: "1.0",
            api: "{{req.path}}"
          }
        },
        pagination: {
          page: 1,
          totalPages: 5,
          totalItems: 100,
          itemsPerPage: 20
        }
      }, null, 2);
    } else if (responseType === 'text') {
      textarea.value = "Success! Request processed at {{date}}";
    } else if (responseType === 'html') {
      textarea.value = "<html><body><h1>Example Response</h1><p>This is a sample HTML response.</p></body></html>";
    } else if (responseType === 'xml') {
      textarea.value = '<?xml version="1.0" encoding="UTF-8"?>\n<response>\n  <status>success</status>\n  <data>\n    <item id="1">Example</item>\n  </data>\n</response>';
    }
  };

  return (
    <div className="form-container max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEdit ? "Editar API" : "Criar Nova API"}
            </h2>
            <p className="text-gray-600 mt-1">Configure sua API mock com facilidade</p>
          </div>
          <div className="flex space-x-2">
            <button 
              type="button" 
              data-tab="config" 
              className="tab-button tab-active button button-primary"
            >
              Configuração
            </button>
            <button 
              type="button" 
              data-tab="templates" 
              className="tab-button button button-neutral"
            >
              Templates
            </button>
          </div>
        </div>

        <div id="tab-content" className="p-6 bg-white">
          <div id="config-tab" style={{display: 'block'}}>
            <form id="apiForm" method="post" action={action} className="space-y-6" onsubmit="return window.validateForm()">
              {/* Hidden fields to store existing API values for dynamic fields */}
              {isEdit && api?.auth && (
                <>
                  {api.auth.type === 'bearer' && (
                    <input type="hidden" name="token" value={api.auth.token || ''} disabled />
                  )}
                  {api.auth.type === 'api_key' && (
                    <>
                      <input type="hidden" name="apiKey" value={api.auth.apiKey || ''} disabled />
                      <input type="hidden" name="headerName" value={api.auth.headerName || ''} disabled />
                      <input type="hidden" name="apiKeyInQuery" value={api.auth.apiKeyInQuery ? 'true' : 'false'} disabled />
                    </>
                  )}
                  {api.auth.type === 'custom_header' && (
                    <>
                      <input type="hidden" name="headerName" value={api.auth.headerName || ''} disabled />
                      <input type="hidden" name="headerValue" value={api.auth.headerValue || ''} disabled />
                    </>
                  )}
                  {api.auth.type === 'basic' && (
                    <>
                      <input type="hidden" name="username" value={api.auth.username || ''} disabled />
                      <input type="hidden" name="password" value={api.auth.password || ''} disabled />
                    </>
                  )}
                  {(api.auth.type === 'oauth' || api.auth.type === 'client_credentials') && (
                    <>
                      <input type="hidden" name="clientId" value={api.auth.clientId || ''} disabled />
                      <input type="hidden" name="clientSecret" value={api.auth.clientSecret || ''} disabled />
                      <input type="hidden" name="allowedScopes" value={Array.isArray(api.auth.allowedScopes) ? api.auth.allowedScopes.join(' ') : ''} disabled />
                    </>
                  )}
                  {api.auth.type === 'jwt' && (
                    <>
                      <input type="hidden" name="token" value={api.auth.token || ''} disabled />
                      <input type="hidden" name="requiredScopes" value={api.auth.requiredScopes ? JSON.stringify(api.auth.requiredScopes) : '{}'} disabled />
                    </>
                  )}
                </>
              )}
              
              {/* Hidden fields for CORS settings */}
              {isEdit && api?.cors?.enabled && (
                <>
                  <input type="hidden" name="corsOrigins" value={Array.isArray(api.cors.origins) ? api.cors.origins.join(',') : '*'} disabled />
                  <input type="hidden" name="corsHeaders" value={Array.isArray(api.cors.allowedHeaders) ? api.cors.allowedHeaders.join(',') : ''} disabled />
                  <input type="hidden" name="corsMethods" value={Array.isArray(api.cors.allowedMethods) ? api.cors.allowedMethods.join(',') : ''} disabled />
                  <input type="hidden" name="corsCredentials" value={api.cors.allowCredentials ? 'true' : 'false'} disabled />
                </>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column - Main configuration */}
                <div className="space-y-6">
                  {/* Configuração Básica Accordion */}
                  <details className="form-section" open={!isEdit}>
                    <summary className="form-section-header">
                      <div className="form-section-title">
                        <span className="form-section-icon bg-indigo-100">
                          <span className="material-icons text-indigo-600">settings</span>
                        </span>
                        Configuração Básica
                      </div>
                      <span className="material-icons text-gray-500">expand_more</span>
                    </summary>
                    <div className="form-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Path */}
                        <div>
                          <label htmlFor="path" className="form-label">
                            Caminho <span className="text-red-500 ml-1">*</span>
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="O caminho da URL após /api. Por exemplo: /users, /products, etc.">help_outline</span>
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">/api</span>
                            <input 
                              type="text" 
                              id="path" 
                              name="path" 
                              value={api?.path || ''} 
                              required 
                              placeholder="/users" 
                              className="form-input" 
                              onblur="window.validateField(this)"
                              hx-get="/mock-api/check-duplicate"
                              hx-trigger="keyup changed delay:800ms, change"
                              hx-include="#method"
                              hx-target="#path-duplicate-warning"
                              hx-params={`id:${api?.id || ''}`}
                            />
                          </div>
                          <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
                          <div id="path-duplicate-warning"></div>
                        </div>
                        
                        {/* Method */}
                        <div>
                          <label htmlFor="method" className="form-label">
                            Método HTTP <span className="text-red-500 ml-1">*</span>
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="O método HTTP que a API aceita. Use * para aceitar qualquer método.">help_outline</span>
                          </label>
                          <select 
                            id="method" 
                            name="method" 
                            value={api?.method || 'GET'} 
                            className="form-select"
                            onblur="window.validateField(this)"
                            hx-get="/mock-api/check-duplicate"
                            hx-trigger="change"
                            hx-include="#path"
                            hx-target="#path-duplicate-warning"
                            hx-params={`id:${api?.id || ''}`}
                          >
                            <option>GET</option><option>POST</option><option>PUT</option>
                            <option>PATCH</option><option>DELETE</option><option>HEAD</option>
                            <option>OPTIONS</option><option>*</option>
                          </select>
                          <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mt-6">
                        <label htmlFor="description" className="form-label">
                          Descrição
                          <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Uma descrição para identificar facilmente esta API na lista.">help_outline</span>
                        </label>
                        <input 
                          type="text" 
                          id="description" 
                          name="description" 
                          value={api?.description || ''} 
                          placeholder="Descrição para ajudar a identificar esta API" 
                          className="form-input" 
                        />
                      </div>

                      {/* Active Toggle */}
                      <div className="mt-6 flex items-center">
                        <input
                          type="checkbox"
                          id="active"
                          name="active"
                          value="true"
                          checked={api?.active !== false}
                          className="form-checkbox"
                        />
                        <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                          Expor API
                          <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Se desmarcado, a API não será exposta.">help_outline</span>
                        </label>
                      </div>
                    </div>
                  </details>

                  {/* Segurança e Autenticação Accordion */}
                  <details className="form-section">
                    <summary className="form-section-header">
                      <div className="form-section-title">
                        <span className="form-section-icon bg-blue-100">
                          <span className="material-icons text-blue-600">security</span>
                        </span>
                        Segurança e Autenticação
                      </div>
                      <span className="material-icons text-gray-500">expand_more</span>
                    </summary>
                    <div className="form-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="authType" className="form-label">
                            Tipo de Autenticação
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Método de autenticação que a API requer. A aplicação simulará esse tipo de autenticação.">help_outline</span>
                          </label>
                          <select 
                            id="authType" 
                            name="authType" 
                            className="form-select"
                            hx-get="/mock-api/auth-fields"
                            hx-trigger="load, change"
                            hx-target="#auth-fields"
                            hx-include="[name='authType'], [name='token'], [name='apiKey'], [name='headerName'], [name='headerValue'], [name='username'], [name='password'], [name='clientId'], [name='clientSecret'], [name='allowedScopes'], [name='requiredScopes'], [name='apiKeyInQuery']"
                            hx-vals={JSON.stringify({ token: api?.auth?.token ?? '', apiKey: api?.auth?.apiKey ?? '', headerName: api?.auth?.headerName ?? '', headerValue: api?.auth?.headerValue ?? '', username: api?.auth?.username ?? '', password: api?.auth?.password ?? '', clientId: api?.auth?.clientId ?? '', clientSecret: api?.auth?.clientSecret ?? '', allowedScopes: Array.isArray(api?.auth?.allowedScopes) ? api.auth.allowedScopes.join(' ') : '', requiredScopes: typeof api?.auth?.requiredScopes === 'string' ? api.auth.requiredScopes : (api?.auth?.requiredScopes ? JSON.stringify(api.auth.requiredScopes) : ''), apiKeyInQuery: api?.auth?.apiKeyInQuery ? 'true' : 'false' })}
                            hx-swap="innerHTML"
                          >
                            <option value="none" selected={api?.auth?.type === 'none'}>Sem Autenticação</option>
                            <option value="bearer" selected={api?.auth?.type === 'bearer'}>Bearer Token</option>
                            <option value="oauth" selected={api?.auth?.type === 'oauth'}>OAuth 2.0</option>
                            <option value="client_credentials" selected={api?.auth?.type === 'client_credentials'}>Client Credentials</option>
                            <option value="api_key" selected={api?.auth?.type === 'api_key'}>API Key</option>
                            <option value="custom_header" selected={api?.auth?.type === 'custom_header'}>Custom Header</option>
                            <option value="basic" selected={api?.auth?.type === 'basic'}>Basic Auth</option>
                            <option value="jwt" selected={api?.auth?.type === 'jwt'}>JWT</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="corsEnabled" className="form-label">
                            CORS
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Habilita ou desabilita o suporte a CORS (Cross-Origin Resource Sharing) nesta API.">help_outline</span>
                          </label>
                          <select 
                            id="corsEnabled" 
                            name="corsEnabled" 
                            className="form-select"
                            hx-get="/mock-api/cors-fields"
                            hx-trigger="load, change"
                            hx-target="#cors-fields"
                            hx-include="[name='corsEnabled'], [name='corsOrigins'], [name='corsHeaders'], [name='corsMethods'], [name='corsCredentials']"
                            hx-vals={JSON.stringify({ corsOrigins: Array.isArray(api?.cors?.origins) ? api.cors.origins.join(',') : '', corsHeaders: Array.isArray(api?.cors?.allowedHeaders) ? api.cors.allowedHeaders.join(',') : '', corsMethods: Array.isArray(api?.cors?.allowedMethods) ? api.cors.allowedMethods.join(',') : '', corsCredentials: api?.cors?.allowCredentials ? 'true' : 'false' })}
                            hx-swap="innerHTML"
                          >
                            <option value="false" selected={!api?.cors?.enabled}>Desabilitado</option>
                            <option value="true" selected={api?.cors?.enabled}>Habilitado</option>
                          </select>
                        </div>
                        
                        <div id="auth-fields" className="col-span-2 mt-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                          {/* Auth fields will be loaded dynamically */}
                          <div className="text-sm text-gray-500 italic">
                            Sem configurações adicionais necessárias para este tipo de autenticação.
                          </div>
                        </div>
                        
                        <div id="cors-fields" className="col-span-2 mt-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                          {/* CORS fields will be loaded dynamically */}
                          <div className="text-sm text-gray-500 italic">
                            CORS desabilitado para esta API.
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Metadata Accordion */}
                  <details className="form-section">
                    <summary className="form-section-header">
                      <div className="form-section-title">
                        <span className="form-section-icon bg-amber-100">
                          <span className="material-icons text-amber-600">label</span>
                        </span>
                        Metadados
                      </div>
                      <span className="material-icons text-gray-500">expand_more</span>
                    </summary>
                    <div className="form-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="category" className="form-label">
                            Categoria
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Categoria para organizar esta API no painel. As APIs sem categoria são listadas como 'Uncategorized'.">help_outline</span>
                          </label>
                          <input 
                            type="text" 
                            id="category" 
                            name="category" 
                            value={api?.category || ''} 
                            placeholder="ex: Usuários, Produtos, etc" 
                            className="form-input" 
                          />
                        </div>
                        <div>
                          <label htmlFor="tags" className="form-label">
                            Tags
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Lista de tags separadas por vírgula para facilitar a filtragem e busca.">help_outline</span>
                          </label>
                          <input 
                            type="text" 
                            id="tags" 
                            name="tags" 
                            value={api?.tags?.join(',') || ''} 
                            placeholder="ex: auth, crud, webhook" 
                            className="form-input" 
                          />
                          <p className="text-xs text-gray-500 mt-1">Separados por vírgula</p>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
                
                {/* Right column - Response and Behavior */}
                <div className="space-y-6">
                  {/* Resposta Accordion */}
                  <details className="form-section">
                    <summary className="form-section-header">
                      <div className="form-section-title">
                        <span className="form-section-icon bg-teal-100">
                          <span className="material-icons text-teal-600">code</span>
                        </span>
                        Resposta
                      </div>
                      <span className="material-icons text-gray-500">expand_more</span>
                    </summary>
                    <div className="form-section-content">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label htmlFor="responseType" className="form-label">
                            Tipo de Resposta
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="O formato do corpo da resposta que a API retornará.">help_outline</span>
                          </label>
                          <select 
                            id="responseType" 
                            name="responseType" 
                            className="form-select"
                            hx-get="/mock-api/response-fields"
                            hx-trigger="load, change"
                            hx-target="#response-fields"
                            hx-include="[name='responseType'], [name='body']"
                            hx-swap="innerHTML"
                          >
                            <option value="json" selected={api?.response.type === 'json'}>JSON</option>
                            <option value="text" selected={api?.response.type === 'text'}>Texto Puro</option>
                            <option value="html" selected={api?.response.type === 'html'}>HTML</option>
                            <option value="xml" selected={api?.response.type === 'xml'}>XML</option>
                            <option value="csv" selected={api?.response.type === 'csv'}>CSV</option>
                            <option value="binary" selected={api?.response.type === 'binary'}>Binário</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="contentType" className="form-label">
                            Content-Type
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="O cabeçalho Content-Type a ser enviado com a resposta. Se deixado em branco, será inferido do tipo de resposta.">help_outline</span>
                          </label>
                          <input 
                            type="text" 
                            id="contentType" 
                            name="contentType" 
                            value={api?.response.contentType || ''} 
                            placeholder="Automático baseado no tipo" 
                            className="form-input" 
                          />
                        </div>
                        <div>
                          <label htmlFor="dynamicResponse" className="form-label">
                            Resposta Dinâmica
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Permite usar variáveis como {{date}}, {{uuid}}, etc. nas respostas.">help_outline</span>
                          </label>
                          <select 
                            id="dynamicResponse" 
                            name="dynamicResponse" 
                            value={api?.response.dynamic ? "true" : "false"} 
                            className="form-select"
                          >
                            <option value="false">Estática</option>
                            <option value="true">Dinâmica</option>
                          </select>
                        </div>
                      </div>

                      <div id="response-fields" className="mt-6">
                        <label htmlFor="body" className="form-label">
                          Corpo da Resposta
                          <span class="material-icons tooltip-trigger ml-1" data-tippy-content="O conteúdo que será retornado na resposta da API.">help_outline</span>
                        </label>
                        <div class="relative mt-1">
                          <textarea 
                            id="body" 
                            name="body" 
                            rows={10} 
                            spellCheck={false} 
                            className="form-textarea bg-gray-50"
                            onblur="window.validateField(this)"
                          >
                            {responseValue}
                          </textarea>
                          <div class="absolute top-2 right-2 flex space-x-2">
                            <button 
                              type="button" 
                              class="p-1.5 bg-white hover:bg-gray-100 transition-colors shadow-sm rounded text-xs text-gray-700 border border-gray-200 flex items-center"
                              onClick={() => formatJsonBody()}
                            >
                              <span class="material-icons text-sm mr-1">code</span>
                              Format JSON
                            </button>
                            <button 
                              type="button" 
                              class="p-1.5 bg-white hover:bg-gray-100 transition-colors shadow-sm rounded text-xs text-gray-700 border border-gray-200 flex items-center"
                              onClick={() => insertMockData()}
                            >
                              <span class="material-icons text-sm mr-1">data_object</span>
                              Mock Data
                            </button>
                          </div>
                        </div>
                        <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
                        <div className="info-card mt-2">
                          <span className="material-icons info-card-icon">info</span>
                          <p className="info-card-text">
                            Suporte para variáveis: <code className="code">{'{{req.path}}'}</code>, 
                            <code className="code">{'{{req.method}}'}</code>, 
                            <code className="code">{'{{date}}'}</code>, etc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Comportamento e Simulação Accordion */}
                  <details className="form-section">
                    <summary className="form-section-header">
                      <div className="form-section-title">
                        <span className="form-section-icon bg-purple-100">
                          <span className="material-icons text-purple-600">tune</span>
                        </span>
                        Comportamento e Simulação
                      </div>
                      <span className="material-icons text-gray-500">expand_more</span>
                    </summary>
                    <div className="form-section-content">
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="statusCode" className="form-label">
                            Código de Status <span className="text-red-500 ml-1">*</span>
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="O código de status HTTP que a API retornará.">help_outline</span>
                          </label>
                          <select 
                            id="statusCode" 
                            name="statusCode" 
                            value={String(api?.statusCode || 200)} 
                            className="form-select"
                            onblur="window.validateField(this)"
                          >
                            <optgroup label="Success">
                              <option value="200">200 - OK</option>
                              <option value="201">201 - Created</option>
                              <option value="202">202 - Accepted</option>
                              <option value="204">204 - No Content</option>
                            </optgroup>
                            <optgroup label="Redirection">
                              <option value="301">301 - Moved Permanently</option>
                              <option value="302">302 - Found</option>
                              <option value="304">304 - Not Modified</option>
                            </optgroup>
                            <optgroup label="Client Error">
                              <option value="400">400 - Bad Request</option>
                              <option value="401">401 - Unauthorized</option>
                              <option value="403">403 - Forbidden</option>
                              <option value="404">404 - Not Found</option>
                              <option value="409">409 - Conflict</option>
                              <option value="422">422 - Unprocessable Entity</option>
                              <option value="429">429 - Too Many Requests</option>
                            </optgroup>
                            <optgroup label="Server Error">
                              <option value="500">500 - Internal Server Error</option>
                              <option value="502">502 - Bad Gateway</option>
                              <option value="503">503 - Service Unavailable</option>
                              <option value="504">504 - Gateway Timeout</option>
                            </optgroup>
                          </select>
                          <div class="validation-error text-sm text-red-600 mt-1 hidden"></div>
                        </div>
                        <div>
                          <label htmlFor="simDelay" className="form-label">
                            Atraso de Resposta
                            <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Tempo em milissegundos que a API levará para responder. Útil para simular requisições lentas.">help_outline</span>
                          </label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <input 
                                type="range" 
                                id="simDelayRange" 
                                name="simDelayRange" 
                                min="0" 
                                max="10000" 
                                step="100" 
                                value={String(api?.simulation?.delay || 0)} 
                                className="form-range flex-1" 
                              />
                              <input 
                                type="number" 
                                id="simDelay" 
                                name="simDelay" 
                                value={String(api?.simulation?.delay || 0)} 
                                min={0} 
                                className="form-input w-24 text-center" 
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                              <span>0ms</span><span>5s</span><span>10s</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-center mb-4">
                            <input 
                              type="checkbox" 
                              id="simulateNetworkErrors" 
                              name="simulateNetworkErrors" 
                              checked={api?.simulation?.networkErrors || false} 
                              className="form-checkbox" 
                            />
                            <label htmlFor="simulateNetworkErrors" className="flex items-center ml-2 text-sm text-gray-700">
                              Simular erros de rede aleatórios
                              <span className="material-icons tooltip-trigger ml-1" data-tippy-content="Ocasionalmente a API retornará um erro de rede simulado em vez da resposta normal.">help_outline</span>
                            </label>
                          </div>

                          <div>
                            <label htmlFor="errorChance" className="form-label">
                              Chance de erro
                              <span class="material-icons tooltip-trigger ml-1" data-tippy-content="Porcentagem de chance de que a API retorne um erro de rede simulado.">help_outline</span>
                            </label>
                            <input 
                              type="range" 
                              id="errorChance" 
                              name="errorChance" 
                              min="0" 
                              max="100" 
                              step="5" 
                              value={String(api?.simulation?.errorChance || 10)} 
                              className="form-range" 
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                              <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                          </div>

                          {/* New Error Codes Configuration Section */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <label className="form-label">
                              Códigos de erro a simular
                              <span className="material-icons tooltip-trigger ml-1" data-tippy-content="Selecione quais códigos de erro HTTP poderão ser simulados aleatoriamente.">help_outline</span>
                            </label>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                              {[400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504].map(code => {
                                const isChecked = api?.simulation?.errorStatuses?.includes(code) ?? true;
                                return (
                                  <div className="flex items-center" key={code}>
                                    <input
                                      type="checkbox"
                                      id={`errorStatus_${code}`}
                                      name="errorStatuses"
                                      value={code}
                                      checked={isChecked}
                                      className="form-checkbox"
                                    />
                                    <label htmlFor={`errorStatus_${code}`} className="ml-2 text-sm text-gray-700">
                                      {code}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                            
                            <details className="mt-4 border border-gray-200 rounded">
                              <summary className="p-3 bg-gray-50 text-sm font-medium cursor-pointer">
                                Configuração avançada de erros
                              </summary>
                              <div className="p-3 space-y-4">
                                <p className="text-xs text-gray-600 italic">
                                  Configure respostas personalizadas para cada código de erro simulado. Deixe em branco para usar o padrão.
                                </p>
                                
                                {/* Hidden field to store serialized error responses */}
                                <input 
                                  type="hidden" 
                                  id="errorResponsesJSON" 
                                  name="errorResponsesJSON" 
                                  value={api?.simulation?.errorResponses ? JSON.stringify(api.simulation.errorResponses) : '{}'} 
                                />
                                
                                <div className="flex space-x-4">
                                  <div className="w-1/3">
                                    <label htmlFor="customErrorCode" className="block text-sm font-medium text-gray-700 mb-1">
                                      Código HTTP
                                    </label>
                                    <select 
                                      id="customErrorCode" 
                                      className="form-select" 
                                      data-editor-target="customErrorEditor"
                                    >
                                      <option value="">Selecione um código</option>
                                      {[400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504].map(code => (
                                        <option key={code} value={code}>{code}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                
                                <div>
                                  <label htmlFor="customErrorBody" className="block text-sm font-medium text-gray-700 mb-1">
                                    Corpo da resposta (JSON)
                                  </label>
                                  <div className="border border-gray-300 rounded overflow-hidden" style={{ height: '120px' }}>
                                    <textarea 
                                      id="customErrorBody" 
                                      className="w-full h-full p-2 font-mono text-sm"
                                      placeholder='{ "error": "Custom error message", "code": "CUSTOM_ERROR" }'
                                    ></textarea>
                                  </div>
                                </div>
                                
                                <div>
                                  <label htmlFor="customErrorHeaders" className="block text-sm font-medium text-gray-700 mb-1">
                                    Cabeçalhos customizados (JSON)
                                  </label>
                                  <div className="border border-gray-300 rounded overflow-hidden" style={{ height: '80px' }}>
                                    <textarea 
                                      id="customErrorHeaders" 
                                      className="w-full h-full p-2 font-mono text-sm"
                                      placeholder='{ "X-Error-Code": "CUSTOM_ERROR", "X-Error-Source": "MockAPI" }'
                                    ></textarea>
                                  </div>
                                </div>
                                
                                <div className="flex justify-end">
                                  <button 
                                    type="button" 
                                    id="saveCustomError" 
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                    onclick="saveCustomError()"
                                  >
                                    Salvar configuração
                                  </button>
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>
                        
                        {/* Tips card */}
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <h4 className="font-medium text-gray-800 flex items-center">
                            <span className="material-icons text-purple-500 mr-2">lightbulb</span>
                            Dicas de Simulação
                          </h4>
                          <ul className="mt-2 text-sm text-gray-600 space-y-2">
                            <li className="flex items-start">
                              <span className="material-icons text-xs text-purple-500 mr-1 mt-1">check_circle</span>
                              Use delay para simular APIs lentas e testar timeouts
                            </li>
                            <li className="flex items-start">
                              <span className="material-icons text-xs text-purple-500 mr-1 mt-1">check_circle</span>
                              Simule erros de rede para testar a resiliência do seu app
                            </li>
                            <li className="flex items-start">
                              <span className="material-icons text-xs text-purple-500 mr-1 mt-1">check_circle</span>
                              Combine com códigos de status diferentes para simular cenários reais
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                {isEdit && (
                  <button 
                    type="submit" 
                    form="deleteForm" 
                    className="button button-danger"
                  >
                    <span className="material-icons button-icon">delete</span>
                    Excluir
                  </button>
                )}
                <a 
                  href="/mock-api" 
                  className="button button-neutral"
                >
                  <span className="material-icons button-icon">close</span>
                  Cancelar
                </a>
                <button 
                  type="submit" 
                  className="button button-secondary"
                >
                  <span className="material-icons button-icon">save</span>
                  {isEdit ? 'Salvar Alterações' : 'Criar API'}
                </button>
              </div>
            </form>
            
            {isEdit && (
              <form id="deleteForm" method="post" action={`/mock-api/${api?.id}/delete`} className="hidden"></form>
            )}
          </div>
          
          {/* Templates Tab Content */}
          <div id="templates-tab" style={{display: 'none'}}>
            <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Templates de API</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                <div 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => {
                    const pathInput = getInputElement('path');
                    const methodInput = getInputElement('method');
                    const descriptionInput = getInputElement('description');
                    const statusCodeInput = getInputElement('statusCode');
                    const responseTypeInput = getInputElement('responseType');
                    const bodyInput = getInputElement('body');
                    
                    if (pathInput && methodInput && descriptionInput && 
                        statusCodeInput && responseTypeInput && bodyInput) {
                      pathInput.value = '/users';
                      methodInput.value = 'GET';
                      descriptionInput.value = 'Lista todos os usuários';
                      statusCodeInput.value = '200';
                      responseTypeInput.value = 'json';
                      bodyInput.value = JSON.stringify({
                        users: [
                          { id: 1, name: "João Silva", email: "joao@example.com", role: "admin" },
                          { id: 2, name: "Maria Souza", email: "maria@example.com", role: "user" },
                          { id: 3, name: "Carlos Pereira", email: "carlos@example.com", role: "user" }
                        ],
                        pagination: {
                          page: 1,
                          perPage: 10,
                          total: 3,
                          pages: 1
                        }
                      }, null, 2);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-indigo-700">API de Usuários</h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">CRUD</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Endpoints completos para gerenciar usuários (listar, obter, criar, atualizar, excluir)</p>
                </div>
                
                <div 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => {
                    const pathInput = getInputElement('path');
                    const methodInput = getInputElement('method');
                    const descriptionInput = getInputElement('description');
                    const statusCodeInput = getInputElement('statusCode');
                    const responseTypeInput = getInputElement('responseType');
                    const bodyInput = getInputElement('body');
                    
                    if (pathInput && methodInput && descriptionInput && 
                        statusCodeInput && responseTypeInput && bodyInput) {
                      pathInput.value = '/auth';
                      methodInput.value = 'GET';
                      descriptionInput.value = 'Login, logout, refresh token e registro de usuários';
                      statusCodeInput.value = '200';
                      responseTypeInput.value = 'json';
                      bodyInput.value = JSON.stringify({
                        success: true,
                        data: {
                          token: "{{token}}",
                          refreshToken: "{{refreshToken}}",
                          user: {
                            id: "{{userId}}",
                            name: "{{userName}}",
                            email: "{{userEmail}}",
                            role: "{{userRole}}"
                          }
                        }
                      }, null, 2);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-indigo-700">Autenticação</h4>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Auth</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Endpoints para login, logout, refresh token e registro de usuários</p>
                </div>
                
                <div 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => {
                    const pathInput = getInputElement('path');
                    const methodInput = getInputElement('method');
                    const descriptionInput = getInputElement('description');
                    const statusCodeInput = getInputElement('statusCode');
                    const responseTypeInput = getInputElement('responseType');
                    const bodyInput = getInputElement('body');
                    
                    if (pathInput && methodInput && descriptionInput && 
                        statusCodeInput && responseTypeInput && bodyInput) {
                      pathInput.value = '/products';
                      methodInput.value = 'GET';
                      descriptionInput.value = 'Listar produtos, filtrar categorias, obter detalhes e preços';
                      statusCodeInput.value = '200';
                      responseTypeInput.value = 'json';
                      bodyInput.value = JSON.stringify({
                        products: [
                          { id: 1, name: "Product 1", category: "Category A", price: 10.00 },
                          { id: 2, name: "Product 2", category: "Category B", price: 15.00 },
                          { id: 3, name: "Product 3", category: "Category A", price: 20.00 }
                        ],
                        pagination: {
                          page: 1,
                          perPage: 10,
                          total: 3,
                          pages: 1
                        }
                      }, null, 2);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-indigo-700">Produtos</h4>
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">E-commerce</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">API para listar produtos, filtrar categorias, obter detalhes e preços</p>
                </div>
              </div>
              
              {/* Templates de integrações comuns */}
              <div 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                onClick={() => {
                  const pathInput = getInputElement('path');
                  const methodInput = getInputElement('method');
                  const descriptionInput = getInputElement('description');
                  const statusCodeInput = getInputElement('statusCode');
                  const responseTypeInput = getInputElement('responseType');
                  const bodyInput = getInputElement('body');
                  if (pathInput && methodInput && descriptionInput && 
                      statusCodeInput && responseTypeInput && bodyInput) {
                    pathInput.value = '/financeiro/pagamentos';
                    methodInput.value = 'GET';
                    descriptionInput.value = 'Listar transações financeiras';
                    statusCodeInput.value = '200';
                    responseTypeInput.value = 'json';
                    bodyInput.value = JSON.stringify({
                      transacoes: [
                        { id: 1, valor: 1500.50, data: "{{date}}", status: "liquidado" },
                        { id: 2, valor: 750.00, data: "{{date}}", status: "pendente" }
                      ]
                    }, null, 2);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-indigo-700">ERP Financeiro</h4>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Financeiro</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Integração de transações, saldos e movimentações financeiras</p>
              </div>
              <div 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                onClick={() => {
                  const pathInput = getInputElement('path');
                  const methodInput = getInputElement('method');
                  const descriptionInput = getInputElement('description');
                  const statusCodeInput = getInputElement('statusCode');
                  const responseTypeInput = getInputElement('responseType');
                  const bodyInput = getInputElement('body');
                  if (pathInput && methodInput && descriptionInput && 
                      statusCodeInput && responseTypeInput && bodyInput) {
                    pathInput.value = '/estoque/itens';
                    methodInput.value = 'GET';
                    descriptionInput.value = 'Listar itens de estoque';
                    statusCodeInput.value = '200';
                    responseTypeInput.value = 'json';
                    bodyInput.value = JSON.stringify({
                      itens: [
                        { id: 1, produto: "Camiseta", quantidade: 100, localizacao: "A1" },
                        { id: 2, produto: "Calça", quantidade: 50, localizacao: "B2" }
                      ]
                    }, null, 2);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-indigo-700">ERP Estoque</h4>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Estoque</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Gerenciamento de itens, quantidades e localizações</p>
              </div>
              <div 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                onClick={() => {
                  const pathInput = getInputElement('path');
                  const methodInput = getInputElement('method');
                  const descriptionInput = getInputElement('description');
                  const statusCodeInput = getInputElement('statusCode');
                  const responseTypeInput = getInputElement('responseType');
                  const bodyInput = getInputElement('body');
                  if (pathInput && methodInput && descriptionInput && 
                      statusCodeInput && responseTypeInput && bodyInput) {
                    pathInput.value = '/crm/contatos';
                    methodInput.value = 'GET';
                    descriptionInput.value = 'Listar contatos do CRM';
                    statusCodeInput.value = '200';
                    responseTypeInput.value = 'json';
                    bodyInput.value = JSON.stringify({
                      contatos: [
                        { id: 1, nome: "Ana", email: "ana@empresa.com", empresa: "ACME" },
                        { id: 2, nome: "Bruno", email: "bruno@empresa.com", empresa: "Globex" }
                      ]
                    }, null, 2);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-indigo-700">CRM - Contatos</h4>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">CRM</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Integração de contatos e leads do CRM</p>
              </div>
              <div 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                onClick={() => {
                  const pathInput = getInputElement('path');
                  const methodInput = getInputElement('method');
                  const descriptionInput = getInputElement('description');
                  const statusCodeInput = getInputElement('statusCode');
                  const responseTypeInput = getInputElement('responseType');
                  const bodyInput = getInputElement('body');
                  if (pathInput && methodInput && descriptionInput && 
                      statusCodeInput && responseTypeInput && bodyInput) {
                    pathInput.value = '/rh/folha_ponto';
                    methodInput.value = 'GET';
                    descriptionInput.value = 'Dados de folha de ponto de funcionários';
                    statusCodeInput.value = '200';
                    responseTypeInput.value = 'json';
                    bodyInput.value = JSON.stringify({
                      registros: [
                        { funcionarioId: 1, data: "{{date}}", entrada: "08:00", saida: "17:00" },
                        { funcionarioId: 2, data: "{{date}}", entrada: "09:00", saida: "18:00" }
                      ]
                    }, null, 2);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-indigo-700">RH - Folha de Ponto</h4>
                  <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded">RH</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Integração de registros de ponto e horários</p>
              </div>
              <div 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                onClick={() => {
                  const pathInput = getInputElement('path');
                  const methodInput = getInputElement('method');
                  const descriptionInput = getInputElement('description');
                  const statusCodeInput = getInputElement('statusCode');
                  const responseTypeInput = getInputElement('responseType');
                  const bodyInput = getInputElement('body');
                  if (pathInput && methodInput && descriptionInput && 
                      statusCodeInput && responseTypeInput && bodyInput) {
                    pathInput.value = '/webhook/pagamentos';
                    methodInput.value = 'POST';
                    descriptionInput.value = 'Receber notificações de pagamentos';
                    statusCodeInput.value = '200';
                    responseTypeInput.value = 'json';
                    bodyInput.value = JSON.stringify({
                      sucesso: true,
                      evento: "pagamento_recebido",
                      transacaoId: "{{uuid}}",
                      valor: 99.90,
                      data: "{{date}}"
                    }, null, 2);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-indigo-700">Webhook de Pagamentos</h4>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Pagamentos</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Receber notificações de pagamento em tempo real</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Dica: Como usar templates</h4>
                <p className="text-sm text-gray-600">Clique em um template para preencher automaticamente os campos do formulário com exemplos predefinidos. Você pode então personalizar conforme necessário antes de criar a API.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* External script tags */}
      <script src="https://unpkg.com/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
      <script src="https://unpkg.com/tippy.js@6.3.7/dist/tippy-bundle.umd.min.js"></script>
      <script src="/static/tooltips.js"></script>
      <script src="/static/templates.js"></script>
      <link rel="stylesheet" href="/static/form-styles.css" />
      <script>{`
        // Form validation functions
        window.validateField = function(field) {
          const errorContainer = field.parentElement.nextElementSibling || field.nextElementSibling;
          
          // Skip validation if the field is not required and empty
          if (!field.hasAttribute('required') && !field.value.trim()) {
            window.clearValidationError(field);
            return true;
          }
          
          // Check if the field is required and empty
          if (field.hasAttribute('required') && !field.value.trim()) {
            window.showValidationError(field, 'Este campo é obrigatório');
            return false;
          }
          
          // Path validation
          if (field.id === 'path') {
            // Path should start with /
            if (!field.value.trim().startsWith('/')) {
              window.showValidationError(field, 'O caminho deve começar com /');
              return false;
            }
          }
          
          // JSON validation for response body if the type is JSON
          if (field.id === 'body') {
            const responseType = document.getElementById('responseType')?.value;
            if (responseType === 'json') {
              try {
                JSON.parse(field.value);
              } catch (e) {
                window.showValidationError(field, 'JSON inválido: ' + e.message);
                return false;
              }
            }
          }
          
          window.clearValidationError(field);
          return true;
        };
        
        window.showValidationError = function(field, message) {
          field.classList.add('border-red-500');
          field.classList.remove('border-gray-300');
          
          const errorContainer = field.parentElement.nextElementSibling || field.nextElementSibling;
          if (errorContainer && errorContainer.classList.contains('validation-error')) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('hidden');
          }
        };
        
        window.clearValidationError = function(field) {
          field.classList.remove('border-red-500');
          field.classList.add('border-gray-300');
          
          const errorContainer = field.parentElement.nextElementSibling || field.nextElementSibling;
          if (errorContainer && errorContainer.classList.contains('validation-error')) {
            errorContainer.classList.add('hidden');
          }
        };
        
        window.validateForm = function() {
          let isValid = true;
          
          // Validate path
          const pathField = document.getElementById('path');
          if (pathField) {
            isValid = window.validateField(pathField) && isValid;
          }
          
          // Validate response body
          const bodyField = document.getElementById('body');
          if (bodyField) {
            isValid = window.validateField(bodyField) && isValid;
          }
          
          // Validate auth fields based on auth type
          const authType = document.getElementById('authType')?.value;
          if (authType === 'bearer') {
            const tokenField = document.getElementById('token');
            if (tokenField) {
              isValid = window.validateField(tokenField) && isValid;
            }
          } else if (authType === 'api_key') {
            const apiKeyField = document.getElementById('apiKey');
            if (apiKeyField) {
              isValid = window.validateField(apiKeyField) && isValid;
            }
          } else if (authType === 'basic') {
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            if (usernameField) {
              isValid = window.validateField(usernameField) && isValid;
            }
            if (passwordField) {
              isValid = window.validateField(passwordField) && isValid;
            }
          }
          
          // Check for duplicate API warning
          const duplicateWarning = document.getElementById('path-duplicate-warning');
          if (duplicateWarning && duplicateWarning.innerHTML.trim()) {
            isValid = false;
            // Highlight the path field
            const pathField = document.getElementById('path');
            if (pathField) {
              pathField.classList.add('border-red-500');
              pathField.classList.remove('border-gray-300');
            }
          }
          
          if (!isValid) {
            // Show a toast notification
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
            toast.innerHTML = '<div class="flex items-center"><span class="material-icons mr-2">error_outline</span>Por favor, corrija os erros no formulário</div>';
            document.body.appendChild(toast);
            
            // Remove toast after 3 seconds
            setTimeout(() => {
              toast.remove();
            }, 3000);
          }
          
          return isValid;
        };
        
        // Add live validation on input
        document.querySelectorAll('input, textarea, select').forEach(field => {
          field.addEventListener('input', function() {
            if (field.classList.contains('border-red-500')) {
              window.validateField(field);
            }
          });
          
          field.addEventListener('blur', function() {
            window.validateField(field);
          });
        });
        
        // Add template feedback
        const templateCards = document.querySelectorAll('[id^="templates-tab"] [class*="cursor-pointer"]');
        templateCards.forEach(card => {
          card.addEventListener('click', function() {
            // Show a success toast when a template is applied
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
            toast.innerHTML = '<div class="flex items-center"><span class="material-icons mr-2">check_circle</span>Template aplicado com sucesso!</div>';
            document.body.appendChild(toast);
            
            // Switch to config tab
            document.querySelector('[data-tab="config"]')?.click();
            
            // Remove toast after 3 seconds
            setTimeout(() => {
              toast.remove();
            }, 3000);
          });
        });

        document.addEventListener('DOMContentLoaded', function() {
          // Initialize error responses from hidden field
          window.errorResponses = {};
          try {
            const storedResponses = document.getElementById('errorResponsesJSON').value;
            if (storedResponses) {
              window.errorResponses = JSON.parse(storedResponses);
            }
          } catch (e) {
            console.error('Error parsing stored error responses:', e);
          }
          
          // Code selection changes the editor
          document.getElementById('customErrorCode').addEventListener('change', function() {
            const code = this.value;
            if (!code) return;
            
            const savedResponse = window.errorResponses[code] || {};
            
            // Populate the editors
            document.getElementById('customErrorBody').value = 
              savedResponse.body ? JSON.stringify(savedResponse.body, null, 2) : '';
            
            document.getElementById('customErrorHeaders').value = 
              savedResponse.headers ? JSON.stringify(savedResponse.headers, null, 2) : '';
          });
          
          // Save custom error config
          window.saveCustomError = function() {
            const code = document.getElementById('customErrorCode').value;
            if (!code) {
              alert('Selecione um código de erro HTTP.');
              return;
            }
            
            try {
              const bodyText = document.getElementById('customErrorBody').value.trim();
              const headersText = document.getElementById('customErrorHeaders').value.trim();
              
              const errorConfig = {};
              
              if (bodyText) {
                errorConfig.body = JSON.parse(bodyText);
              }
              
              if (headersText) {
                errorConfig.headers = JSON.parse(headersText);
              }
              
              // Store in the global object
              window.errorResponses[code] = errorConfig;
              
              // Update the hidden field
              document.getElementById('errorResponsesJSON').value = JSON.stringify(window.errorResponses);
              
              alert('Configuração de erro salva com sucesso!');
            } catch (e) {
              alert('Erro ao salvar: ' + e.message);
            }
          };
        });
      `}</script>
    </div>
  );
} 