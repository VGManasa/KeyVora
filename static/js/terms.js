// terms.js — KeyVora Terms & Conditions page logic

(function () {
  'use strict';

  // ══ Read-progress bar ══════════════════════════════════════
  const progressBar = document.getElementById('readProgress');

  function updateProgress() {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }

  // ══ Back-to-top button ════════════════════════════════════
  const backTop = document.getElementById('backTop');

  function updateBackTop() {
    if (!backTop) return;
    if (window.scrollY > 400) backTop.classList.add('visible');
    else                       backTop.classList.remove('visible');
  }

  if (backTop) {
    backTop.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    );
  }

  // ══ Scroll listener (throttled) ═══════════════════════════
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        updateBackTop();
        highlightToc();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Initial paint
  updateProgress();
  updateBackTop();

  // ══ Accordion sections ════════════════════════════════════
  document.querySelectorAll('.ts-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const body     = document.getElementById(targetId);
      if (!body) return;

      const isOpen = body.classList.contains('open');

      // Toggle this section
      if (isOpen) {
        body.classList.remove('open');
        header.classList.remove('open');
      } else {
        body.classList.add('open');
        header.classList.add('open');
      }
    });
  });

  // ══ TOC active-link highlighting ══════════════════════════
  const sections = Array.from(document.querySelectorAll('.terms-section[id]'));
  const tocLinks = Array.from(document.querySelectorAll('#tocList a[data-section]'));

  function highlightToc() {
    if (!sections.length || !tocLinks.length) return;

    const scrollMid = window.scrollY + window.innerHeight * 0.35;
    let active      = sections[0].id;

    for (const sec of sections) {
      if (sec.offsetTop <= scrollMid) active = sec.id;
      else break;
    }

    tocLinks.forEach(link => {
      if (link.getAttribute('data-section') === active) link.classList.add('active');
      else                                               link.classList.remove('active');
    });
  }

  // Smooth-scroll TOC links and auto-open target section
  tocLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      const section  = document.getElementById(targetId);
      if (!section) return;

      // Auto-open if closed
      const header = section.querySelector('.ts-header');
      const bodyId = header ? header.getAttribute('data-target') : null;
      const body   = bodyId ? document.getElementById(bodyId) : null;

      if (header && body && !body.classList.contains('open')) {
        body.classList.add('open');
        header.classList.add('open');
      }

      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  highlightToc();

  // ══ Terms-agreement state ══════════════════════════════════
  // When the user clicks "Accept & Register" from this page we flag
  // sessionStorage so the register page can tick the checkbox automatically.

  const btnAccept = document.getElementById('btnAccept');
  const tocCta    = document.querySelector('.toc-cta');

  function markAgreed() {
    try { sessionStorage.setItem('keyvora_terms_agreed', '1'); } catch (_) {}
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      markAgreed();
      // navigation is handled by the href="/register?accepted=1"
    });
  }

  if (tocCta) {
    tocCta.addEventListener('click', () => {
      markAgreed();
    });
  }

  // ══ Open all sections if ?expand=all in URL ═══════════════
  if (new URLSearchParams(window.location.search).get('expand') === 'all') {
    document.querySelectorAll('.ts-body').forEach(b => b.classList.add('open'));
    document.querySelectorAll('.ts-header').forEach(h => h.classList.add('open'));
  }

})();