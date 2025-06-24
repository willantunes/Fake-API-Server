// Wait for the page to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Tippy.js tooltips
  if (typeof tippy !== 'undefined') {
    tippy('[data-tippy-content]', {
      arrow: true,
      delay: [100, 0],
      theme: 'light-border',
      maxWidth: 250,
      interactive: true,
      placement: 'top',
      allowHTML: true
    });
    console.log('Tippy.js initialized successfully');
  } else {
    console.error('Tippy.js is not loaded');
  }

  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  
  function switchTab(targetTab) {
    // Hide all tabs first
    document.querySelectorAll('#config-tab, #test-tab, #templates-tab').forEach(tab => {
      tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    tabButtons.forEach(btn => {
      btn.classList.remove('tab-active');
      btn.classList.add('button-neutral');
      btn.classList.remove('button-primary');
    });
    
    // Show the selected tab and highlight its button
    const tabToShow = document.getElementById(targetTab + '-tab');
    if (tabToShow) {
      tabToShow.style.display = 'block';
      
      // Activate the button
      const activeButton = document.querySelector(`[data-tab="${targetTab}"]`);
      if (activeButton) {
        activeButton.classList.add('tab-active');
        activeButton.classList.add('button-primary');
        activeButton.classList.remove('button-neutral');
      }
    }
  }
  
  // Add click handlers to tab buttons
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      if (tabName) {
        switchTab(tabName);
      }
    });
  });
  
  // Initialize with "config" tab active
  switchTab('config');
}); 