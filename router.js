/* Pages: each <section class="view" id="..."> in index.html is a page. The URL hash (#research) picks the page,
   so the 3D background and the music keep running between pages. */
(function(){
  const NAME='Amirhossein Nazari';
  const views=[...document.querySelectorAll('.view')],navLinks=[...document.querySelectorAll('nav a')];
  function route(){
    const v=views.find(x=>x.id===(location.hash||'#about').slice(1))||views[0];
    views.forEach(x=>x.classList.toggle('active',x===v));
    navLinks.forEach(a=>a.hash==='#'+v.id?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    document.body.dataset.view=v.id;
    document.title=(v.id==='about'?'':v.querySelector('h2').textContent+' · ')+NAME;
  }
  addEventListener('hashchange',route);route();
})();
