(function () {
  var root = document.documentElement;
  function current() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('docs-theme', next); } catch (e) {}
    });
  }
  var menu = document.querySelector('.menu-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (menu && sidebar) {
    menu.addEventListener('click', function () { sidebar.classList.toggle('open'); });
    document.querySelectorAll('.nav__link').forEach(function (a) {
      a.addEventListener('click', function () { sidebar.classList.remove('open'); });
    });
  }
})();
