// State
let currentLang = localStorage.getItem("preferredLang") || "en";
let translations = {};
const CHANGELOG_RAW_URL = 'https://raw.githubusercontent.com/gandli/ai-proofduck-extension/main/CHANGELOG.md';
const LANG_SWITCH_SCROLL_KEY = 'langSwitchScrollState';
const CHANGELOG_POLL_MS = 30 * 60 * 1000;
let changelogPollTimer = null;
let lastChangelogDigest = '';
let changelogTemplateHtml = '';

// Initialize language
async function initLang() {
  // Use the HTML lang attribute as the primary source of truth (set by Astro server)
  const initialLang = document.documentElement.lang || localStorage.getItem("preferredLang") || "en";
  await setLang(initialLang);
}

function parseChangelogMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const versions = [];
  let current = null;
  let section = null;

  for (const raw of lines) {
    const line = raw.trim();
    const versionMatch = line.match(/^##\s+\[(v?[^\]]+)\]\s*-\s*(.+)$/);
    if (versionMatch) {
      if (current) versions.push(current);
      current = {
        version: versionMatch[1],
        date: versionMatch[2],
        added: [],
        changed: [],
        fixed: [],
      };
      section = null;
      continue;
    }

    if (!current) continue;

    if (/^###\s+Added/i.test(line)) { section = 'added'; continue; }
    if (/^###\s+Changed/i.test(line)) { section = 'changed'; continue; }
    if (/^###\s+Fixed/i.test(line)) { section = 'fixed'; continue; }

    if (line.startsWith('- ') && section) {
      current[section].push(line.slice(2));
    }
  }
  if (current) versions.push(current);
  return versions.slice(0, 3);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderChangelog(versions) {
  const mount = document.getElementById('changelog-content');
  if (!mount || !versions?.length) return;

  const titleAdded = translations.cl_added || 'Added';
  const titleChanged = translations.cl_changed || 'Changed';
  const titleFixed = translations.cl_fixed || 'Fixed';

  const renderList = (items, accent = 'before:text-t3') => {
    if (!items.length) return '';
    return `<ul class="space-y-2.5">${items
      .map((it) => `<li class="text-t1 text-[0.95rem] leading-relaxed pl-5 relative before:content-['•'] before:absolute before:left-0 ${accent} before:font-bold">${escapeHtml(it)}</li>`)
      .join('')}</ul>`;
  };

  mount.innerHTML = versions
    .map((v) => `
      <div class="bg-bg2 border border-b1 rounded-[20px] p-8 mb-8 shadow-premium animate-fade-up">
        <div class="flex items-center gap-3 mb-6 border-b border-b1 pb-4">
          <span class="bg-ac text-white px-3 py-1 rounded-full font-bold text-[0.9rem]">${escapeHtml(v.version)}</span>
          <span class="text-t2 text-[0.9rem] font-medium">${escapeHtml(v.date)}</span>
        </div>
        <div class="space-y-6">
          ${v.added.length ? `<div><h4 class="text-base mb-3 pl-3 border-l-4 border-ac font-bold">${escapeHtml(titleAdded)}</h4>${renderList(v.added)}</div>` : ''}
          ${v.changed.length ? `<div><h4 class="text-base mb-3 pl-3 border-l-4 border-amber-500 font-bold">${escapeHtml(titleChanged)}</h4>${renderList(v.changed)}</div>` : ''}
          ${v.fixed.length ? `<div><h4 class="text-base mb-3 pl-3 border-l-4 border-emerald-500 font-bold">${escapeHtml(titleFixed)}</h4>${renderList(v.fixed)}</div>` : ''}
        </div>
      </div>
    `)
    .join('');
}

function restoreChangelogTemplate() {
  const mount = document.getElementById('changelog-content');
  if (!mount || !changelogTemplateHtml) return;
  mount.innerHTML = changelogTemplateHtml;

  // Re-apply current i18n after restoring template HTML.
  mount.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && translations[key]) {
      el.innerHTML = translations[key];
    }
  });
}

async function hydrateChangelogFromMain() {
  try {
    const res = await fetch(CHANGELOG_RAW_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const md = await res.text();

    // Skip rerender when changelog has not changed.
    if (md === lastChangelogDigest) return;
    lastChangelogDigest = md;

    const parsed = parseChangelogMarkdown(md);
    renderChangelog(parsed);
  } catch (e) {
    console.warn('Failed to hydrate changelog from main:', e);
  }
}

function startChangelogListener() {
  if (changelogPollTimer) return;
  changelogPollTimer = window.setInterval(() => {
    if (document.hidden || currentLang !== 'en') return;
    hydrateChangelogFromMain();
  }, CHANGELOG_POLL_MS);
}

// Set language function
async function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("preferredLang", lang);

  // Update active button
  document
    .querySelectorAll(".lang-btn")
    .forEach((btn) => {
      btn.classList.remove("active");
      if (btn.getAttribute("data-lang") === lang) {
        btn.classList.add("active");
      }
    });

  // Update html lang attribute
  document.documentElement.lang = lang;

  try {
    // Determine the base path (for gh-pages support)
    const baseUrl = window.location.pathname.startsWith('/ai-proofduck-extension') ? '/ai-proofduck-extension/' : '/';
    // Fetch translation file using absolute path
    const response = await fetch(`${baseUrl}locales/${lang}.json`);
    translations = await response.json();

    // Update content
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (translations[key]) {
        el.innerHTML = translations[key];
      }
    });

    // Update metadata
    if (lang === "en") {
      document.title = "AI Proofduck - Smart Writing Assistant · Privacy First";
      document.querySelector('meta[name="title"]').content =
        "AI Proofduck - Smart Writing Assistant · Privacy First";
      document.querySelector('meta[name="description"]').content =
        "In-browser AI writing assistant with summarize, correct, polish, translate, and expand modes. Fully local inference, privacy protection, ready to use.";
    } else {
      document.title = "AI 校对鸭 - 智能写作助手 · 隐私优先";
      document.querySelector('meta[name="title"]').content =
        "AI 校对鸭 - 智能写作助手 · 隐私优先";
      document.querySelector('meta[name="description"]').content =
        "浏览器内置 AI 写作助手，支持摘要、纠错、润色、翻译、扩写五大模式。完全本地推理，隐私保护，开箱即用。";
    }

    if (lang === 'zh') {
      restoreChangelogTemplate();
    } else {
      await hydrateChangelogFromMain();
    }
  } catch (error) {
    console.error("Failed to load translations:", error);
  }
}

// Intersection Observer for fade-up animations
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);

document
  .querySelectorAll(".fade-up")
  .forEach((el) => observer.observe(el));

// Gallery functionality
const galleryImages = [
  {
    src: "images/screenshots/screenshot-en-summarize.png",
    alt: "Summarize feature screenshot",
  },
  {
    src: "images/screenshots/screenshot-zh-proofread.png",
    alt: "Proofread feature screenshot",
  },
  {
    src: "images/screenshots/screenshot-zh-settings.png",
    alt: "Settings screenshot",
  },
  {
    src: "images/screenshots/screenshot-zh-translate.png",
    alt: "Translate feature screenshot",
  },
];
let currentImageIndex = 0;

function openGallery(index) {
  currentImageIndex = index;
  const modal = document.getElementById("galleryModal");
  const img = document.getElementById("galleryImg");
  const caption = document.getElementById("galleryCaption");

  modal.classList.add("active");
  img.src = galleryImages[index].src;
  caption.textContent = galleryImages[index].alt;
  document.body.style.overflow = "hidden";
}

window.openGallery = openGallery;

function closeGallery() {
  const modal = document.getElementById("galleryModal");
  modal.classList.remove("active");
  document.body.style.overflow = "auto";
}

window.closeGallery = closeGallery;

function changeImage(direction) {
  currentImageIndex += direction;
  if (currentImageIndex >= galleryImages.length) {
    currentImageIndex = 0;
  } else if (currentImageIndex < 0) {
    currentImageIndex = galleryImages.length - 1;
  }

  const img = document.getElementById("galleryImg");
  const caption = document.getElementById("galleryCaption");
  img.src = galleryImages[currentImageIndex].src;
  caption.textContent = galleryImages[currentImageIndex].alt;
}

window.changeImage = changeImage;

// Close gallery on click outside image
const galleryModal = document.getElementById("galleryModal");
if (galleryModal) {
  galleryModal.addEventListener("click", function (e) {
    if (e.target === this) {
      closeGallery();
    }
  });
}

// Keyboard navigation
document.addEventListener("keydown", function (e) {
  const modal = document.getElementById("galleryModal");
  if (modal && modal.classList.contains("active")) {
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowLeft") changeImage(-1);
    if (e.key === "ArrowRight") changeImage(1);
  }
});

// Slideshow functionality
let slideIndex = 1;
let slideTimer;

function showSlides(n) {
  const slides = document.getElementsByClassName("slide");
  const dots = document.getElementsByClassName("dot");

  if (n > slides.length) {
    slideIndex = 1;
  }
  if (n < 1) {
    slideIndex = slides.length;
  }

  for (let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }

  if (slides[slideIndex - 1]) {
    slides[slideIndex - 1].style.display = "block";
  }
  if (dots[slideIndex - 1]) {
    dots[slideIndex - 1].className += " active";
  }
}

function changeSlide(n) {
  clearTimeout(slideTimer);
  showSlides((slideIndex += n));
  startSlideTimer();
}

window.changeSlide = changeSlide;

function currentSlide(n) {
  clearTimeout(slideTimer);
  showSlides((slideIndex = n));
  startSlideTimer();
}

window.currentSlide = currentSlide;

function startSlideTimer() {
  slideTimer = setTimeout(() => {
    slideIndex++;
    showSlides(slideIndex);
    startSlideTimer();
  }, 5000); // Auto advance every 5 seconds
}

let listenersBound = false;

function bindUiListeners() {
  if (listenersBound) return;
  listenersBound = true;

  // Setup language switchers
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      if (lang) switchLanguage(lang);
    });
  });

  // Setup gallery triggers
  const galleryTriggers = document.querySelectorAll(".slide img");
  if (galleryTriggers.length > 0) {
    galleryTriggers.forEach((img, index) => {
      img.addEventListener("click", () => openGallery(index));
    });
  }
}

// Initialize on load
window.addEventListener("DOMContentLoaded", () => {
  initLang();

  // Initialize slideshow
  const slides = document.getElementsByClassName("slide");
  if (slides.length > 0) {
    showSlides(slideIndex);
    startSlideTimer();
  }

  bindUiListeners();
});

// Smooth scroll to top for home link
// Initialize on page load and astro transitions
function toggleBackToTopButton() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;
  const show = window.scrollY > 380;
  btn.classList.toggle('opacity-0', !show);
  btn.classList.toggle('translate-y-3', !show);
  btn.classList.toggle('pointer-events-none', !show);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function init() {
  // Re-bind listeners safely for Astro transitions.
  bindUiListeners();

  if (!changelogTemplateHtml) {
    const mount = document.getElementById('changelog-content');
    if (mount) changelogTemplateHtml = mount.innerHTML;
  }

  if (document.querySelector(".slideshow-container")) {
    showSlides(slideIndex);
  }

  startChangelogListener();
  restoreScrollAfterLanguageSwitch();
  toggleBackToTopButton();
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('astro:page-load', init);
window.addEventListener('scroll', toggleBackToTopButton, { passive: true });
window.addEventListener('focus', () => {
  if (currentLang === 'en') hydrateChangelogFromMain();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentLang === 'en') hydrateChangelogFromMain();
});

// Smooth scrolling for specific links
document.addEventListener('click', (e) => {
  const target = e.target.closest('a');
  if (!target) return;

  const href = target.getAttribute('href');
  if (href && href.startsWith('/#')) {
    const id = href.split('#')[1];
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      element.scrollIntoView({ behavior: 'smooth' });
      history.pushState(null, null, `#${id}`);
    }
  } else if (href === '/' || href === '#') {
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      history.pushState(null, null, '/');
    }
  }
});



function restoreScrollAfterLanguageSwitch() {
  try {
    const raw = sessionStorage.getItem(LANG_SWITCH_SCROLL_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);
    const isFresh = Date.now() - (state.ts || 0) < 15000;
    if (!isFresh) {
      sessionStorage.removeItem(LANG_SWITCH_SCROLL_KEY);
      return;
    }

    const y = Math.max(0, Number(state.y) || 0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'auto' });
        sessionStorage.removeItem(LANG_SWITCH_SCROLL_KEY);
        toggleBackToTopButton();
      });
    });
  } catch (_) {
    sessionStorage.removeItem(LANG_SWITCH_SCROLL_KEY);
  }
}

function switchLanguage(lang) {
  const currentPath = window.location.pathname;
  const isGhPages = currentPath.startsWith('/ai-proofduck-extension');
  const basePrefix = isGhPages ? '/ai-proofduck-extension' : '';

  // keep exact visual position across language pages
  try {
    sessionStorage.setItem(
      LANG_SWITCH_SCROLL_KEY,
      JSON.stringify({ y: window.scrollY, ts: Date.now() })
    );
  } catch (_) {}

  const hash = window.location.hash;

  // strip base + language prefix
  let relative = currentPath;
  if (basePrefix && relative.startsWith(basePrefix)) {
    relative = relative.slice(basePrefix.length);
  }
  if (!relative.startsWith('/')) relative = '/' + relative;

  const hasZh = relative === '/zh' || relative.startsWith('/zh/');
  if (hasZh) {
    relative = relative.replace(/^\/zh(?=\/|$)/, '') || '/';
  }

  let targetRelative = relative;
  if (lang === 'zh') {
    targetRelative = relative === '/' ? '/zh/' : `/zh${relative}`;
  }

  // normalize trailing slash for route pages
  if (!targetRelative.includes('.') && !targetRelative.endsWith('/')) {
    targetRelative += '/';
  }

  const finalUrl = `${basePrefix}${targetRelative}${hash || ''}`;
  window.location.assign(finalUrl);
}

window.switchLanguage = switchLanguage;
window.setLang = setLang;
window.scrollToTop = scrollToTop;
