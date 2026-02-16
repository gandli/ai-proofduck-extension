// State
let currentLang = localStorage.getItem("preferredLang") || "en";
let translations = {};

// Initialize language
async function initLang() {
  // Use the HTML lang attribute as the primary source of truth (set by Astro server)
  const initialLang = document.documentElement.lang || localStorage.getItem("preferredLang") || "en";
  await setLang(initialLang);
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

// Initialize on load
window.addEventListener("DOMContentLoaded", () => {
  initLang();

  // Initialize slideshow
  const slides = document.getElementsByClassName("slide");
  if (slides.length > 0) {
    showSlides(slideIndex);
    startSlideTimer();
  }

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
});

// Smooth scroll to top for home link
// Initialize on page load and astro transitions
function init() {
  // We no longer call setLang() here with a hardcoded default, 
  // because initLang() already handles it via initial detection.
  
  // Re-setup slideshow and gallery triggers if they exist
  if (document.querySelector(".slideshow-container")) {
    showSlides(slideIndex);
  }

  // Handle anchors with smooth scroll
  // Removed strict scroll enforcement to allow native browser scroll restoration

}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('astro:page-load', init);

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



function switchLanguage(lang) {
  let hash = window.location.hash;
  const currentPath = window.location.pathname;
  let newPath = currentPath;

  // Simple and robust path handling
  if (lang === 'zh') {
    if (!currentPath.includes('/zh/')) {
      // Handle base path for gh-pages or root
      const isGH = currentPath.includes('/ai-proofduck-extension');
      if (isGH) {
        newPath = currentPath.replace('/ai-proofduck-extension/', '/ai-proofduck-extension/zh/');
      } else {
        newPath = '/zh' + currentPath;
      }
    }
  } else {
    if (currentPath.includes('/zh/')) {
      newPath = currentPath.replace('/zh/', '/');
    }
  }

  // Final URL construction (avoiding triple slashes)
  let finalUrl = newPath;
  if (!finalUrl.endsWith('/') && !finalUrl.includes('.')) {
    finalUrl += '/';
  }
  finalUrl = finalUrl.replace(/\/+/g, '/');
  if (!finalUrl.startsWith('/')) finalUrl = '/' + finalUrl;
  
  // Re-append hash securely
  if (hash) finalUrl += hash;

  // Detect visible section if no hash is present
  if (!hash && window.scrollY > 100) {
    const sections = document.querySelectorAll('section[id]');
    let maxVisibility = 0;
    let visibleId = '';

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      if (visibleHeight > maxVisibility) {
        maxVisibility = visibleHeight;
        visibleId = section.id;
      }
    });
    
    if (visibleId) {
      finalUrl += `#${visibleId}`;
    }
  }

  window.location.href = finalUrl;
}

window.switchLanguage = switchLanguage;
window.setLang = setLang;
