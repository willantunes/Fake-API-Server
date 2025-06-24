document.addEventListener('DOMContentLoaded', function() {
  // Toggle user dropdown menu
  const menuButton = document.getElementById('user-menu-button');
  if (menuButton) {
    menuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', function() {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  });
}); 