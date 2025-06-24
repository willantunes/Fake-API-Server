// selected API IDs state
window.selectedApiIds = [];

// Update export button and select-all states
function updateExportSelectedState() {
  const checkboxes = document.querySelectorAll('.api-select-checkbox');
  window.selectedApiIds = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  // Update hidden input
  const input = document.getElementById('selectedIdsInput');
  if (input) input.value = JSON.stringify(window.selectedApiIds);

  // Enable/disable export button
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

  // Update per-category select-all
  document.querySelectorAll('.api-select-all').forEach(master => {
    const table = master.closest('table');
    if (table) {
      const catCheckboxes = table.querySelectorAll('.api-select-checkbox');
      master.checked = catCheckboxes.length > 0 && Array.from(catCheckboxes).every(cb => cb.checked);
    }
  });
}

// Toggle category checkboxes
function toggleAllApiCheckboxes(master) {
  const table = master.closest('table');
  if (table) {
    table.querySelectorAll('.api-select-checkbox').forEach(cb => cb.checked = master.checked);
  }
  updateExportSelectedState();
}

// Attach event handlers
function attachCheckboxHandlers() {
  document.querySelectorAll('.api-select-checkbox').forEach(cb => {
    cb.removeEventListener('change', updateExportSelectedState);
    cb.addEventListener('change', updateExportSelectedState);
  });
  document.querySelectorAll('.api-select-all').forEach(master => {
    const handler = function() { toggleAllApiCheckboxes(this); };
    master.removeEventListener('change', handler);
    master.addEventListener('change', handler);
  });
}

// Initialize on load and after HTMX swaps
document.addEventListener('DOMContentLoaded', () => {
  attachCheckboxHandlers();
  updateExportSelectedState();
  // Prevent submitting export form with no selections using form event listener
  const exportForm = document.getElementById('exportSelectedForm');
  if (exportForm) {
    exportForm.addEventListener('submit', (e) => {
      if (window.selectedApiIds.length === 0) {
        e.preventDefault();
      }
    });
  }
});
document.body.addEventListener('htmx:afterSwap', () => {
  attachCheckboxHandlers();
  updateExportSelectedState();
});

// Prevent submitting export form with no selections
window.submitExportSelected = function(event) {
  if (window.selectedApiIds.length === 0) {
    event.preventDefault();
    return false;
  }
  return true;
};

// Hide import modal after a successful HTMX import request
document.body.addEventListener('htmx:afterRequest', (event) => {
  const elt = event.detail.elt;
  if (elt && elt.id === 'importApiForm') {
    const modal = document.getElementById('importApiModal');
    if (modal) modal.classList.add('hidden');
  }
}); 