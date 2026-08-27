(function(){
  "use strict";

  var root = document.documentElement;
  var themeBtn = document.querySelector('[data-theme-toggle]');
  var lblFeed = document.querySelector('.lbl-feed');
  var lblPrint = document.querySelector('.lbl-print');
  var THEME_KEY = 'dm-theme';

  function getStoredTheme(){
    try{ return localStorage.getItem(THEME_KEY); }
    catch(e){ return null; } /* storage blocked (private mode, sandboxed frame, etc) */
  }
  function storeTheme(mode){
    try{ localStorage.setItem(THEME_KEY, mode); }
    catch(e){ /* theme just won't persist this session */ }
  }

  function setTheme(mode){
    root.setAttribute('data-theme', mode);
    if(lblFeed) lblFeed.setAttribute('data-active', mode === 'dark' ? 'true' : 'false');
    if(lblPrint) lblPrint.setAttribute('data-active', mode === 'light' ? 'true' : 'false');
    if(themeBtn) themeBtn.setAttribute('aria-pressed', mode === 'light' ? 'true' : 'false');
  }
  setTheme(getStoredTheme() || 'dark');
  if(themeBtn){
    themeBtn.addEventListener('click', function(){
      var current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      setTheme(next);
      storeTheme(next);
    });
  }

  /* mobile nav */
  var navToggle = document.querySelector('[data-nav-toggle]');
  var mobilePanel = document.querySelector('[data-mobile-panel]');
  if(navToggle && mobilePanel){
    navToggle.addEventListener('click', function(){
      mobilePanel.classList.toggle('open');
    });
    mobilePanel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ mobilePanel.classList.remove('open'); });
    });
  }

  /* hero role-cycle typing effect */
  var roleEl = document.querySelector('[data-role-cycle]');
  if(roleEl){
    var roles = (roleEl.getAttribute('data-roles') || '').split('|').filter(Boolean);
    var textSpan = document.createElement('span');
    var cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    roleEl.textContent = '';
    roleEl.appendChild(textSpan);
    roleEl.appendChild(cursor);

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReduced || roles.length === 0){
      textSpan.textContent = roles[0] || '';
    } else {
      var ri = 0, ci = 0, deleting = false;
      var tick = function(){
        var word = roles[ri];
        if(!deleting){
          ci++;
          textSpan.textContent = word.slice(0, ci);
          if(ci === word.length){
            deleting = true;
            setTimeout(tick, 1400);
            return;
          }
        } else {
          ci--;
          textSpan.textContent = word.slice(0, ci);
          if(ci === 0){
            deleting = false;
            ri = (ri + 1) % roles.length;
          }
        }
        setTimeout(tick, deleting ? 35 : 65);
      };
      tick();
    }
  }

  /* scroll reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  /* current year */
  var yearEl = document.querySelector('[data-year]');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Portal page transition ------------------------------------------
     Intercepts same-site .html navigations: plays a short synthesized
     "warp" tone, expands a circular wipe from the click point to cover
     the page, then hands off to a real navigation. The arriving page
     reverses the wipe on load. No-ops entirely on the one-page site,
     since none of its links point at another .html file. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PORTAL_FLAG = 'dm-portal-arrival';

  function playPortalTone(){
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.26);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.34);
    } catch(e){ /* audio unavailable, transition still runs silently */ }
  }

  function buildOverlay(){
    var el = document.createElement('div');
    el.className = 'portal-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<svg viewBox="0 0 200 200">' +
        '<circle class="portal-ring" cx="100" cy="100" r="70"/>' +
        '<circle class="portal-ring r2" cx="100" cy="100" r="48"/>' +
        '<circle class="portal-dot" cx="100" cy="100" r="4"/>' +
      '</svg>';
    document.body.appendChild(el);
    return el;
  }

  if(!reduceMotion){
    var overlay = buildOverlay();

    /* arriving on a new page after a portal navigation: start fully
       covered, then shrink the iris to reveal the page */
    if(sessionStorage.getItem(PORTAL_FLAG) === '1'){
      sessionStorage.removeItem(PORTAL_FLAG);
      overlay.classList.add('closing');
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          overlay.classList.add('animating', 'opening');
          overlay.classList.remove('closing');
          setTimeout(function(){
            overlay.classList.remove('animating', 'opening');
          }, 420);
        });
      });
    }

    document.addEventListener('click', function(e){
      if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest('a[href*=".html"]');
      if(!link || link.target === '_blank') return;
      var dest = link.getAttribute('href');
      if(!dest || dest.indexOf(':') !== -1) return; // skip mailto:, tel:, external protocols

      e.preventDefault();
      overlay.style.setProperty('--px', e.clientX + 'px');
      overlay.style.setProperty('--py', e.clientY + 'px');
      playPortalTone();
      overlay.classList.add('animating', 'closing');
      sessionStorage.setItem(PORTAL_FLAG, '1');
      setTimeout(function(){ window.location.href = dest; }, 300);
    });
  }
})();
