// Global helper to add header rows
window.addHeaderRow = function() {
  const container = document.getElementById('headerRows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'flex space-x-2 mt-2';
  row.innerHTML = '<input type="text" placeholder="Nome" class="w-1/2 border border-gray-300 rounded p-2 text-sm" />'
                + '<input type="text" placeholder="Valor" class="w-1/2 border border-gray-300 rounded p-2 text-sm" />';
  container.appendChild(row);
};

// Global helper to perform inline test requests
window.handleTestRequest = async function() {
  const spinner = document.getElementById('testSpinner');
  const responseEl = document.getElementById('testResponse');
  const statusEl = document.getElementById('responseStatus');
  const timeEl = document.getElementById('responseTime');
  if (spinner) spinner.classList.remove('hidden');
  if (responseEl) responseEl.textContent = '';
  if (statusEl) statusEl.textContent = '';
  if (timeEl) timeEl.textContent = '';

  // Construct URL from the path input and base URL
  const pathInput = document.getElementById('path');
  const methodSelect = document.getElementById('method');
  const baseUrl = window.location.origin;
  const urlPath = pathInput ? pathInput.value : '';
  const url = baseUrl + '/api' + urlPath;

  // Update the endpoint preview in the Testar API tab
  const previewEl = document.getElementById('testFormEndpoint');
  if (previewEl) previewEl.textContent = url;

  const method = methodSelect && methodSelect.value ? methodSelect.value : 'GET';
  
  // Collect headers for the request
  const headers = {};
  
  document.querySelectorAll('#headerRows .flex').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value;
    const val = inputs[1].value;
    if (key) headers[key] = val;
  });
  
  // Get authentication data from the form
  const authTypeSelect = document.getElementById('authType');
  let authConfig = null;
  
  if (authTypeSelect) {
    authConfig = extractAuthConfigFromForm();
    console.log('Auth config from form:', authConfig);
  }
  
  // Add authentication headers based on the config
  if (authConfig && authConfig.type !== 'none') {
    addAuthHeadersFromConfig(headers, authConfig);
  }
  // Add HX-Request header to bypass layout
  headers['HX-Request'] = 'true';

  console.log('Final request headers:', headers);

  // Handle request body and set appropriate content type
  let body;
  const options = { 
    method, 
    headers,
    // Ensure session cookies are sent for cross-site requests
    credentials: 'include' 
  };
  
  if (['POST','PUT','PATCH','DELETE'].includes(method)) {
    const reqBodyEl = document.getElementById('requestBody');
    if (reqBodyEl && reqBodyEl.value) {
      body = reqBodyEl.value;
      
      // Try to determine if it's JSON and set content-type accordingly
      try {
        JSON.parse(body);
        headers['Content-Type'] = 'application/json';
      } catch (e) {
        // Not JSON, leave content-type unset or set based on what's in the UI
      }
      
      options.body = body;
    }
  }

  console.log(`Making ${method} request to ${url} with options:`, options);
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const end = performance.now();
    if (spinner) spinner.classList.add('hidden');
    const text = await res.text();
    
    // Try to parse as JSON for better formatting
    try {
      const json = JSON.parse(text);
      if (responseEl) responseEl.textContent = JSON.stringify(json, null, 2);
    } catch {
      if (responseEl) responseEl.textContent = text;
    }
    
    // Set status class based on response code
    if (statusEl) {
      statusEl.textContent = `Status: ${res.status} ${res.statusText}`;
      
      // Add color based on status code
      statusEl.className = '';
      if (res.status >= 200 && res.status < 300) {
        statusEl.classList.add('text-green-600');
      } else if (res.status >= 300 && res.status < 400) {
        statusEl.classList.add('text-blue-600');
      } else if (res.status >= 400 && res.status < 500) {
        statusEl.classList.add('text-yellow-600');
      } else {
        statusEl.classList.add('text-red-600');
      }
    }
    
    if (timeEl) timeEl.textContent = `(${(end - start).toFixed(0)}ms)`;
  } catch (err) {
    if (spinner) spinner.classList.add('hidden');
    if (responseEl) responseEl.textContent = 'Erro: ' + (err.message || err);
    if (statusEl) {
      statusEl.textContent = 'Erro de Conexão';
      statusEl.className = 'text-red-600';
    }
  }
};

// Extract authentication configuration from the form
function extractAuthConfigFromForm() {
  // Get the auth type from the select dropdown
  const authTypeSelect = document.getElementById('authType');
  if (!authTypeSelect) return null;
  
  const authType = authTypeSelect.value;
  console.log('Auth type:', authType);
  
  // Create basic auth config object
  const authConfig = { type: authType };
  
  // Look for specific form fields based on auth type
  switch (authType) {
    case 'bearer':
      // For Bearer auth, look for a token field
      const tokenInput = document.querySelector('input[name="token"]');
      if (tokenInput && tokenInput.value) {
        authConfig.token = tokenInput.value;
      } else {
        // Check for hidden token field in the form - used when switching tabs
        const hiddenTokens = document.querySelectorAll('input[type="hidden"][name="token"]');
        hiddenTokens.forEach(input => {
          if (input.value) authConfig.token = input.value;
        });
      }
      break;
      
    case 'basic':
      // For Basic auth, look for username and password
      const usernameInput = document.querySelector('input[name="username"]');
      const passwordInput = document.querySelector('input[name="password"]');
      
      // Also check hidden fields
      const hiddenUsername = document.querySelector('input[type="hidden"][name="username"]');
      const hiddenPassword = document.querySelector('input[type="hidden"][name="password"]');
      
      authConfig.username = usernameInput?.value || hiddenUsername?.value || '';
      authConfig.password = passwordInput?.value || hiddenPassword?.value || '';
      break;
      
    case 'api_key':
      // For API Key, look for key, header name, and "in query" flag
      const apiKeyInput = document.querySelector('input[name="apiKey"]');
      const headerNameInput = document.querySelector('input[name="headerName"]');
      const apiKeyInQueryInput = document.querySelector('input[name="apiKeyInQuery"]');
      
      // Also check hidden fields
      const hiddenApiKey = document.querySelector('input[type="hidden"][name="apiKey"]');
      const hiddenHeaderName = document.querySelector('input[type="hidden"][name="headerName"]');
      const hiddenInQuery = document.querySelector('input[type="hidden"][name="apiKeyInQuery"]');
      
      authConfig.apiKey = apiKeyInput?.value || hiddenApiKey?.value || '';
      authConfig.headerName = headerNameInput?.value || hiddenHeaderName?.value || '';
      authConfig.apiKeyInQuery = apiKeyInQueryInput?.value || hiddenInQuery?.value || 'false';
      break;
      
    case 'custom_header':
      // For Custom Header, look for header name and value
      const customHeaderNameInput = document.querySelector('input[name="headerName"]');
      const headerValueInput = document.querySelector('input[name="headerValue"]');
      
      // Also check hidden fields
      const hiddenCustomHeaderName = document.querySelector('input[type="hidden"][name="headerName"]');
      const hiddenHeaderValue = document.querySelector('input[type="hidden"][name="headerValue"]');
      
      authConfig.headerName = customHeaderNameInput?.value || hiddenCustomHeaderName?.value || '';
      authConfig.headerValue = headerValueInput?.value || hiddenHeaderValue?.value || '';
      break;
      
    case 'jwt':
      // For JWT, similar to bearer token
      const jwtTokenInput = document.querySelector('input[name="token"]');
      const hiddenJwtToken = document.querySelector('input[type="hidden"][name="token"]');
      authConfig.token = jwtTokenInput?.value || hiddenJwtToken?.value || '';
      break;
      
    case 'oauth':
    case 'client_credentials':
      // For OAuth-based auth, check for token or client creds
      const oauthTokenInput = document.querySelector('input[name="token"]');
      const hiddenOauthToken = document.querySelector('input[type="hidden"][name="token"]');
      const clientIdInput = document.querySelector('input[name="clientId"]');
      const hiddenClientId = document.querySelector('input[type="hidden"][name="clientId"]');
      
      authConfig.token = oauthTokenInput?.value || hiddenOauthToken?.value || '';
      authConfig.clientId = clientIdInput?.value || hiddenClientId?.value || '';
      break;
  }
  
  return authConfig;
}

// Add authentication headers based on the extracted config
function addAuthHeadersFromConfig(headers, config) {
  if (!config || !config.type || config.type === 'none') return;
  
  console.log('Adding auth headers for type:', config.type);
  
  switch (config.type) {
    case 'bearer':
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
        console.log('Added Bearer token header');
      } else {
        console.log('No bearer token found in config');
      }
      break;
      
    case 'basic':
      if (config.username) {
        const credentials = btoa(`${config.username}:${config.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
        console.log('Added Basic auth header');
      } else {
        console.log('No username found for Basic auth');
      }
      break;
      
    case 'api_key':
      if (config.apiKey && config.headerName) {
        const isInQuery = config.apiKeyInQuery === 'true';
        if (!isInQuery) {
          headers[config.headerName] = config.apiKey;
          console.log(`Added API key header: ${config.headerName}`);
        } else {
          // For query params, we would need to modify the URL
          console.log('API key in query not implemented in test UI');
        }
      } else {
        console.log('Missing API key or header name');
      }
      break;
      
    case 'custom_header':
      if (config.headerName && config.headerValue) {
        headers[config.headerName] = config.headerValue;
        console.log(`Added custom header: ${config.headerName}`);
      } else {
        console.log('Missing custom header name or value');
      }
      break;
      
    case 'jwt':
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
        console.log('Added JWT token as Bearer header');
      } else {
        console.log('No JWT token found in config');
      }
      break;
      
    case 'oauth':
    case 'client_credentials':
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
        console.log('Added OAuth token as Bearer header');
      } else {
        console.log('No OAuth token found in config');
      }
      break;
  }
} 