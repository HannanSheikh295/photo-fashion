(() => {
  "use strict";

  const hasGSAP = typeof window.gsap !== "undefined";
  const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Preloader ---------------- */
  const preloader = document.getElementById("preloader");
  window.addEventListener("load", () => {
    setTimeout(() => preloader?.classList.add("is-hidden"), 350);
  });

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

  /* ---------------- Sticky header: background + hide-on-scroll-down ---------------- */
  const siteHeader = document.getElementById("siteHeader");
  const nav = document.getElementById("nav");
  let lastY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 24);

      if (y > lastY && y > 160) {
        siteHeader.classList.add("is-hidden");
        mobileMenu.classList.remove("is-open");
        navBurger.setAttribute("aria-expanded", "false");
      } else {
        siteHeader.classList.remove("is-hidden");
      }
      lastY = y;
    },
    { passive: true }
  );

  /* ---------------- Mobile menu ---------------- */
  const navBurger = document.getElementById("navBurger");
  const mobileMenu = document.getElementById("mobileMenu");
  navBurger.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("is-open");
    navBurger.setAttribute("aria-expanded", String(isOpen));
  });
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      mobileMenu.classList.remove("is-open");
      navBurger.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------------- Ticker loop ---------------- */
  (function initTicker() {
    const track = document.getElementById("tickerTrack");
    if (!track || !hasGSAP || reduceMotion) return; // CSS keyframe handles the fallback loop
    track.classList.add("gsap-driven");
    gsap.to(track, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
  })();

  /* ---------------- Hero background slideshow (looping crossfade) ---------------- */
  (function initHeroSlideshow() {
    if (!hasGSAP || reduceMotion) return; // CSS shows the first slide statically

    function buildLoop(slotId, startDelay) {
      const slot = document.getElementById(slotId);
      if (!slot) return;
      const slides = gsap.utils.toArray(slot.querySelectorAll(".hero-slide"));
      if (slides.length < 2) return;

      gsap.set(slides, { opacity: 0 });
      gsap.set(slides[0], { opacity: 1 });

      const hold = 4.5;
      const fade = 1.4;
      const tl = gsap.timeline({ repeat: -1, delay: startDelay });

      slides.forEach((slide, i) => {
        const next = slides[(i + 1) % slides.length];
        tl.to({}, { duration: hold })
          .to(slide, { opacity: 0, duration: fade, ease: "power1.inOut" }, ">")
          .to(next, { opacity: 1, duration: fade, ease: "power1.inOut" }, "<");
      });
    }

    buildLoop("heroSlotFull", 0);
  })();

  /* ---------------- Scroll reveal (GSAP + ScrollTrigger) ---------------- */
  if (hasScrollTrigger && !reduceMotion) {
    document.querySelectorAll(".reveal-group").forEach((group) => {
      const items = group.querySelectorAll(".reveal-item");
      const targets = items.length ? items : [group];
      gsap.set(targets, { opacity: 0, y: 24 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: "top 85%", once: true },
      });
    });

    document.querySelectorAll(".reveal").forEach((el) => {
      gsap.set(el, { opacity: 0, y: 24 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });
  }
  /* If GSAP/ScrollTrigger fails to load, .reveal / .reveal-group / .reveal-item
     carry no hidden CSS state, so content just renders normally — no broken UI. */

  /* ---------------- Magnetic buttons ---------------- */
  if (hasGSAP && canHover && !reduceMotion) {
    document.querySelectorAll(".btn").forEach((btn) => {
      const strength = 0.35;
      const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3.out" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3.out" });

      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        xTo((e.clientX - rect.left - rect.width / 2) * strength);
        yTo((e.clientY - rect.top - rect.height / 2) * strength);
      });
      btn.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
      });
    });
  }

  /* ---------------- Gallery filter ---------------- */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const gItems = document.querySelectorAll(".g-item");
  const catGroups = document.querySelectorAll(".cat-group");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const filter = btn.dataset.filter;

      gItems.forEach((item) => {
        const match = filter === "all" || item.dataset.cat === filter;
        item.classList.toggle("is-hidden", !match);
      });

      catGroups.forEach((group) => {
        const match = filter === "all" || group.dataset.catGroup === filter;
        group.classList.toggle("is-hidden", !match);
      });

      if (hasScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ---------------- Lightbox ---------------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCap = document.getElementById("lightboxCap");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  let currentGroup = [];
  let currentIndex = 0;

  function visibleItems() {
    return Array.from(gItems).filter((el) => !el.classList.contains("is-hidden"));
  }

  function openLightbox(item) {
    currentGroup = visibleItems();
    currentIndex = currentGroup.indexOf(item);
    renderLightbox();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function renderLightbox() {
    const item = currentGroup[currentIndex];
    if (!item) return;
    const img = item.querySelector("img");
    const tag = item.querySelector(".g-tag")?.textContent ?? "";
    const cap = item.querySelector(".g-cap")?.textContent ?? "";
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCap.textContent = `${tag} — ${cap}`;
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function stepLightbox(dir) {
    if (!currentGroup.length) return;
    currentIndex = (currentIndex + dir + currentGroup.length) % currentGroup.length;
    renderLightbox();
  }

  gItems.forEach((item) => item.addEventListener("click", () => openLightbox(item)));
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  lightboxNext.addEventListener("click", () => stepLightbox(1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  /* ---------------- FAQ accordion (GSAP-driven, with a no-GSAP fallback) ---------------- */
  function expandAccordionPanel(trigger) {
    const item = trigger.closest(".accordion-item");
    const panel = trigger.nextElementSibling;
    const icon = trigger.querySelector(".accordion-icon");

    trigger.setAttribute("aria-expanded", "true");
    item.classList.add("is-open");

    if (hasGSAP && !reduceMotion) {
      gsap.to(panel, { height: "auto", duration: 0.55, ease: "power3.out" });
      const answer = panel.querySelector("p");
      if (answer) {
        gsap.fromTo(
          answer,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.45, delay: 0.15, ease: "power2.out" }
        );
      }
      if (icon) gsap.fromTo(icon, { rotate: 0 }, { rotate: 90, duration: 0.55, ease: "back.out(2.6)" });
    } else {
      panel.style.height = panel.scrollHeight + "px";
    }
  }

  function collapseAccordionPanel(trigger) {
    const item = trigger.closest(".accordion-item");
    const panel = trigger.nextElementSibling;
    const icon = trigger.querySelector(".accordion-icon");

    trigger.setAttribute("aria-expanded", "false");
    item.classList.remove("is-open");

    if (hasGSAP && !reduceMotion) {
      gsap.to(panel, { height: 0, duration: 0.4, ease: "power3.in" });
      if (icon) gsap.to(icon, { rotate: 0, duration: 0.35, ease: "power2.inOut" });
    } else {
      panel.style.height = "0px";
    }
  }

  document.querySelectorAll(".accordion-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".accordion-trigger").forEach((t) => {
        if (t !== trigger && t.getAttribute("aria-expanded") === "true") collapseAccordionPanel(t);
      });

      if (isOpen) collapseAccordionPanel(trigger);
      else expandAccordionPanel(trigger);
    });

    trigger.addEventListener("mouseenter", () => {
      if (!hasGSAP || !canHover || reduceMotion) return;
      const icon = trigger.querySelector(".accordion-icon");
      if (icon && trigger.getAttribute("aria-expanded") !== "true") {
        gsap.to(icon, { scale: 1.2, duration: 0.3, ease: "power2.out" });
      }
    });
    trigger.addEventListener("mouseleave", () => {
      if (!hasGSAP || !canHover || reduceMotion) return;
      const icon = trigger.querySelector(".accordion-icon");
      if (icon) gsap.to(icon, { scale: 1, duration: 0.3, ease: "power2.out" });
    });
  });

  /* ---------------- Sample modal ---------------- */
  const sampleModal = document.getElementById("sampleModal");
  const modalClose = document.getElementById("modalClose");
  const modalBody = document.getElementById("modalBody");
  const sampleForm = document.getElementById("sampleForm");
  const formSuccess = document.getElementById("formSuccess");
  const closeSuccessBtn = document.getElementById("closeSuccess");
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    sampleModal.classList.add("is-open");
    sampleModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => sampleModal.querySelector("input, select, textarea, button")?.focus(), 300);
  }

  function closeModal() {
    sampleModal.classList.remove("is-open");
    sampleModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocused?.focus();
  }

  document.querySelectorAll("[data-open-sample]").forEach((btn) => btn.addEventListener("click", openModal));
  modalClose.addEventListener("click", closeModal);
  sampleModal.addEventListener("click", (e) => {
    if (e.target === sampleModal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sampleModal.classList.contains("is-open")) closeModal();
  });

  /* ---------------- Privacy / Terms modals ---------------- */
  const policyModals = {
    privacy: document.getElementById("privacyModal"),
    terms: document.getElementById("termsModal"),
  };
  let lastFocusedPolicy = null;

  function openPolicyModal(modal) {
    lastFocusedPolicy = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => modal.querySelector(".modal-close")?.focus(), 300);
  }

  function closeAllPolicyModals() {
    Object.values(policyModals).forEach((modal) => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "";
    lastFocusedPolicy?.focus();
  }

  document.querySelectorAll("[data-open-privacy]").forEach((btn) =>
    btn.addEventListener("click", () => openPolicyModal(policyModals.privacy))
  );
  document.querySelectorAll("[data-open-terms]").forEach((btn) =>
    btn.addEventListener("click", () => openPolicyModal(policyModals.terms))
  );
  document.querySelectorAll("[data-close-policy]").forEach((btn) =>
    btn.addEventListener("click", closeAllPolicyModals)
  );
  Object.values(policyModals).forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAllPolicyModals();
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (Object.values(policyModals).some((m) => m.classList.contains("is-open"))) closeAllPolicyModals();
  });

  /* ---------------- Form validation ---------------- */
  function validateField(field) {
    const row = field.closest(".form-row");
    let valid = true;

    if (field.hasAttribute("required") && !field.value.trim()) valid = false;
    if (field.type === "email" && field.value.trim()) {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
    }

    row?.classList.toggle("has-error", !valid);
    return valid;
  }

  sampleForm.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
  });

  const submitBtn = sampleForm.querySelector('button[type="submit"]');
  const submitBtnDefaultText = submitBtn?.textContent ?? "";
  const formSubmitError = document.getElementById("formSubmitError");

  function showFormSuccess() {
    sampleForm.hidden = true;
    formSuccess.hidden = false;
    modalBody.querySelector(".eyebrow").hidden = true;
    modalBody.querySelector("h3").textContent = "Request received.";
    modalBody.querySelector(".modal-sub").hidden = true;
  }

  sampleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = sampleForm.querySelectorAll("input[required], select[required]");
    let allValid = true;
    fields.forEach((field) => {
      if (!validateField(field)) allValid = false;
    });
    if (!allValid) {
      sampleForm.querySelector(".has-error input, .has-error select")?.focus();
      return;
    }

    if (formSubmitError) formSubmitError.hidden = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }

    // Netlify Forms: submit as a standard urlencoded POST so Netlify's form
    // handler picks it up, same as a plain HTML form post, just via fetch so
    // we can keep the in-modal success state instead of a full page reload.
    const body = new URLSearchParams(new FormData(sampleForm)).toString();

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Form submission failed: ${res.status}`);
        showFormSuccess();
      })
      .catch(() => {
        if (formSubmitError) formSubmitError.hidden = false;
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtnDefaultText;
        }
      });
  });

  closeSuccessBtn.addEventListener("click", () => {
    closeModal();
    setTimeout(() => {
      sampleForm.reset();
      sampleForm.hidden = false;
      formSuccess.hidden = true;
      modalBody.querySelector(".eyebrow").hidden = false;
      modalBody.querySelector("h3").textContent = "Request My Free Sample";
      modalBody.querySelector(".modal-sub").hidden = false;
      sampleForm.querySelectorAll(".form-row").forEach((r) => r.classList.remove("has-error"));
    }, 400);
  });
})();
