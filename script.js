let editor; // Monaco editor instance

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: '{\n  "message": "Success"\n}',
        language: 'json',
        theme: 'vs-dark',
        minimap: { enabled: false },
        automaticLayout: true
    });
});

// Initialize Materialize components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modals
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals, {
        onOpenStart: function(modal) {
            // Reset forms when modal opens
            if (modal.id === 'importModal') {
                // Reset import form
                document.getElementById('importFile').value = '';
                document.getElementById('importPreview').style.display = 'none';
                document.getElementById('importBtn').disabled = true;
                window.apisToImport = null;
            }
        },
        onCloseEnd: function(modal) {
            if (modal.id === 'createModal') {
                resetForm();
            }
        }
    });

    // Initialize select inputs
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);

    // Initialize tabs
    const tabs = document.querySelectorAll('.tabs');
    M.Tabs.init(tabs);

    // Add event listeners
    document.getElementById('authType').addEventListener('change', updateAuthFields);
    
    // Add file input listener
    const importFileInput = document.getElementById('importFile');
    if (importFileInput) {
        importFileInput.addEventListener('change', handleFileImport);
    }

    // Enable import button if file is selected
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.disabled = false;
    }

    // Load initial API list
    loadApis();
});

// Update auth fields based on selected auth type
function updateAuthFields() {
    const authType = document.getElementById('authType').value;
    const authFields = document.getElementById('authFields');
    authFields.innerHTML = '';

    switch(authType) {
        case 'bearer':
            authFields.innerHTML = `
                <div class="input-field col s12">
                    <input id="token" type="text" required>
                    <label for="token">Token</label>
                </div>
            `;
            break;
        case 'oauth':
            authFields.innerHTML = `
                <div class="input-field col s12">
                    <div class="switch">
                        <label>
                            Regular Endpoint
                            <input type="checkbox" id="tokenEndpoint">
                            <span class="lever"></span>
                            Token Endpoint
                        </label>
                    </div>
                </div>
                <div id="oauthFields">
                    <div class="input-field col s12">
                        <input id="token" type="text" required>
                        <label for="token">Token</label>
                    </div>
                    <div class="input-field col s12">
                        <input id="requiredScopes" type="text">
                        <label for="requiredScopes">Required Scopes (space-separated)</label>
                    </div>
                </div>
                <div id="tokenEndpointFields" style="display: none;">
                    <div class="input-field col s6">
                        <input id="allowedClientId" type="text" required>
                        <label for="allowedClientId">Allowed Client ID</label>
                    </div>
                    <div class="input-field col s6">
                        <input id="allowedClientSecret" type="text" required>
                        <label for="allowedClientSecret">Allowed Client Secret</label>
                    </div>
                    <div class="input-field col s12">
                        <input id="allowedScopes" type="text">
                        <label for="allowedScopes">Allowed Scopes (space-separated)</label>
                    </div>
                </div>
            `;
            // Add toggle listener for OAuth fields
            document.getElementById('tokenEndpoint')?.addEventListener('change', function(e) {
                document.getElementById('oauthFields').style.display = e.target.checked ? 'none' : 'block';
                document.getElementById('tokenEndpointFields').style.display = e.target.checked ? 'block' : 'none';
            });
            break;
        case 'client_credentials':
            authFields.innerHTML = `
                <div class="input-field col s6">
                    <input id="clientId" type="text" required>
                    <label for="clientId">Client ID</label>
                </div>
                <div class="input-field col s6">
                    <input id="clientSecret" type="text" required>
                    <label for="clientSecret">Client Secret</label>
                </div>
            `;
            break;
        case 'api_key':
            authFields.innerHTML = `
                <div class="input-field col s12">
                    <input id="apiKey" type="text" required>
                    <label for="apiKey">API Key</label>
                </div>
            `;
            break;
        case 'custom_header':
            authFields.innerHTML = `
                <div class="input-field col s6">
                    <input id="headerName" type="text" required>
                    <label for="headerName">Header Name</label>
                </div>
                <div class="input-field col s6">
                    <input id="headerValue" type="text" required>
                    <label for="headerValue">Header Value</label>
                </div>
            `;
            break;
    }

    // Reinitialize Materialize inputs
    const inputs = authFields.querySelectorAll('input');
    inputs.forEach(input => M.updateTextFields());
}

// Load and display existing APIs
async function loadApis() {
    try {
        const response = await fetch('/apis');
        const apis = await response.json();
        
        const apiList = document.getElementById('apiList');
        apiList.innerHTML = '';
        
        apis.forEach(api => {
            apiList.innerHTML += `
                <div class="col s12 m6 l4">
                    <div class="card">
                        <div class="card-content">
                            <span class="method-badge method-${api.method.toLowerCase()}">${api.method}</span>
                            <span class="card-title truncate">${api.path}</span>
                            <p class="grey-text">Auth: ${api.auth.type}</p>
                            <div class="endpoint truncate">
                                ${window.location.origin}${api.path}
                            </div>
                        </div>
                        <div class="card-action">
                            <a href="#!" onclick="editApi('${api.id}')">Edit</a>
                            <a href="#!" onclick="deleteApi('${api.id}')" class="red-text">Delete</a>
                            <a href="#!" onclick="testApi('${api.id}')" class="right">Test</a>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        M.toast({html: 'Error loading APIs: ' + error.message, classes: 'red'});
    }
}

// Save API (Create/Update)
async function saveApi() {
    try {
        const id = document.getElementById('editApiId').value;
        const isEdit = !!id;

        const authType = document.getElementById('authType').value;
        let auth = { type: authType };

        // Add auth details based on type
        switch(authType) {
            case 'bearer':
                auth.token = document.getElementById('token').value;
                break;
            case 'oauth':
                const isTokenEndpoint = document.getElementById('tokenEndpoint')?.checked;
                if (isTokenEndpoint) {
                    auth.tokenEndpoint = true;
                    auth.allowedClientId = document.getElementById('allowedClientId').value;
                    auth.allowedClientSecret = document.getElementById('allowedClientSecret').value;
                    // Add allowed scopes
                    const allowedScopes = document.getElementById('allowedScopes').value;
                    auth.allowedScopes = allowedScopes ? allowedScopes.split(' ').filter(Boolean) : [];
                } else {
                    auth.token = document.getElementById('token').value;
                    // Add required scopes
                    const requiredScopes = document.getElementById('requiredScopes').value;
                    auth.requiredScopes = requiredScopes ? requiredScopes.split(' ').filter(Boolean) : [];
                }
                break;
            case 'client_credentials':
                auth.clientId = document.getElementById('clientId').value;
                auth.clientSecret = document.getElementById('clientSecret').value;
                break;
            case 'api_key':
                auth.apiKey = document.getElementById('apiKey').value;
                break;
            case 'custom_header':
                auth.headerName = document.getElementById('headerName').value;
                auth.headerValue = document.getElementById('headerValue').value;
                break;
        }

        const mockApi = {
            path: document.getElementById('path').value,
            method: document.getElementById('method').value,
            auth,
            statusCode: parseInt(document.getElementById('statusCode').value),
            response: JSON.parse(editor.getValue())
        };

        const url = isEdit ? `/apis/${id}` : '/apis';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockApi)
        });

        if (!response.ok) throw new Error('Failed to save API');

        M.toast({html: `API ${isEdit ? 'updated' : 'created'} successfully!`, classes: 'green'});
        loadApis();
        const modal = M.Modal.getInstance(document.getElementById('createModal'));
        modal.close();
        resetForm();
    } catch (error) {
        M.toast({html: 'Error saving API: ' + error.message, classes: 'red'});
    }
}

// Edit API
async function editApi(id) {
    try {
        const response = await fetch(`/apis/${id}`);
        const api = await response.json();

        document.getElementById('editApiId').value = api.id;
        document.getElementById('path').value = api.path;
        document.getElementById('method').value = api.method;
        document.getElementById('authType').value = api.auth.type;
        document.getElementById('statusCode').value = api.statusCode;
        editor.setValue(JSON.stringify(api.response, null, 2));

        // Update select dropdowns
        M.FormSelect.init(document.querySelectorAll('select'));
        M.updateTextFields();

        // Update auth fields
        updateAuthFields();
        
        // Fill auth fields
        switch(api.auth.type) {
            case 'bearer':
                document.getElementById('token').value = api.auth.token || '';
                break;
            case 'oauth':
                if (api.auth.tokenEndpoint) {
                    document.getElementById('tokenEndpoint').checked = true;
                    document.getElementById('allowedClientId').value = api.auth.allowedClientId || '';
                    document.getElementById('allowedClientSecret').value = api.auth.allowedClientSecret || '';
                    document.getElementById('allowedScopes').value = api.auth.allowedScopes?.join(' ') || '';
                    // Trigger change event to show/hide appropriate fields
                    document.getElementById('tokenEndpoint').dispatchEvent(new Event('change'));
                } else {
                    document.getElementById('token').value = api.auth.token || '';
                    document.getElementById('requiredScopes').value = api.auth.requiredScopes?.join(' ') || '';
                }
                break;
            case 'client_credentials':
                document.getElementById('clientId').value = api.auth.clientId || '';
                document.getElementById('clientSecret').value = api.auth.clientSecret || '';
                break;
            case 'api_key':
                document.getElementById('apiKey').value = api.auth.apiKey || '';
                break;
            case 'custom_header':
                document.getElementById('headerName').value = api.auth.headerName || '';
                document.getElementById('headerValue').value = api.auth.headerValue || '';
                break;
        }

        M.updateTextFields();
        
        // Open modal
        M.Modal.getInstance(document.getElementById('createModal')).open();
    } catch (error) {
        M.toast({html: 'Error loading API: ' + error.message, classes: 'red'});
    }
}

// Delete API
async function deleteApi(id) {
    if (!confirm('Are you sure you want to delete this API?')) return;
    
    try {
        const response = await fetch(`/apis/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete API');

        M.toast({html: 'API deleted successfully!', classes: 'green'});
        loadApis();
    } catch (error) {
        M.toast({html: 'Error deleting API: ' + error.message, classes: 'red'});
    }
}

// Copy endpoint URL
function copyEndpoint() {
    const endpoint = document.getElementById('fullEndpoint').textContent;
    navigator.clipboard.writeText(endpoint);
    M.toast({html: 'Endpoint URL copied!', classes: 'green'});
}

// Add this new function to reset the form
function resetForm() {
    document.getElementById('apiForm').reset();
    document.getElementById('editApiId').value = '';
    editor.setValue('{\n  "message": "Success"\n}');
    
    // Reset auth fields
    document.getElementById('authType').value = 'none';
    document.getElementById('authFields').innerHTML = '';
    
    // Reinitialize select inputs
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
}

// Move the file import handler to a named function
async function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) {
        document.getElementById('importBtn').disabled = true;
        return;
    }

    try {
        const text = await file.text();
        const apis = JSON.parse(text);

        if (!Array.isArray(apis)) {
            throw new Error('File must contain an array of APIs');
        }

        const previewDiv = document.getElementById('importPreview');
        const apiCount = document.getElementById('apiCount');
        const previewList = document.getElementById('apiPreviewList');
        const importBtn = document.getElementById('importBtn');

        apiCount.textContent = apis.length;
        previewList.innerHTML = apis.map(api => `
            <div class="collection-item">
                <span class="badge ${getMethodColor(api.method)}">${api.method}</span>
                <span class="title">${api.path}</span>
                <p class="grey-text">
                    Auth: ${api.auth?.type || 'none'}<br>
                    Status: ${api.statusCode || 200}
                </p>
            </div>
        `).join('');

        previewDiv.style.display = 'block';
        importBtn.disabled = false;

        // Store APIs for import
        window.apisToImport = apis;
    } catch (error) {
        M.toast({html: 'Invalid JSON file: ' + error.message, classes: 'red'});
        console.error('Import error:', error);
        document.getElementById('importBtn').disabled = true;
    }
}

// Import APIs
async function importApis() {
    const apis = window.apisToImport;
    if (!apis) return;

    const importBtn = document.getElementById('importBtn');
    const originalText = importBtn.textContent;
    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="material-icons left">sync</i>Importing...';

    try {
        let imported = 0;
        let failed = 0;

        for (const api of apis) {
            try {
                const response = await fetch('/apis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: api.path,
                        method: api.method,
                        auth: api.auth || { type: 'none' },
                        response: api.response,
                        statusCode: api.statusCode || 200
                    })
                });

                if (!response.ok) throw new Error(`Failed to import API: ${api.path}`);
                imported++;
            } catch (error) {
                console.error('Error importing API:', error);
                failed++;
            }
        }

        if (failed > 0) {
            M.toast({
                html: `Imported ${imported} APIs, ${failed} failed`,
                classes: 'orange'
            });
        } else {
            M.toast({
                html: `Successfully imported ${imported} APIs`,
                classes: 'green'
            });
        }

        // Refresh the API list
        loadApis();

        // Close the modal
        const modal = M.Modal.getInstance(document.getElementById('importModal'));
        modal.close();

        // Reset the form
        document.getElementById('importFile').value = '';
        document.getElementById('importPreview').style.display = 'none';
        window.apisToImport = null;
    } catch (error) {
        M.toast({html: 'Import failed: ' + error.message, classes: 'red'});
    } finally {
        importBtn.disabled = false;
        importBtn.textContent = originalText;
    }
}

// Helper function for method colors
function getMethodColor(method) {
    const colors = {
        GET: 'green',
        POST: 'blue',
        PUT: 'orange',
        DELETE: 'red',
        PATCH: 'purple'
    };
    return colors[method?.toUpperCase()] || 'grey';
} 