"use strict";

const WHATSAPP_NUMBER = "6281140005610";
const DEFAULT_WHATSAPP_MESSAGE = "Halo ZAS, saya ingin bertanya tentang kerja sama bisnis.";
const ORGANIZATION = [
  { name: "Divisi Smart Market", units: ["Operasional pasar", "Pengembangan produk"] },
  { name: "Divisi Data dan Sistem", units: ["Pengelolaan data", "Sistem digital"] },
  { name: "Divisi Keuangan dan Operasional", units: ["Keuangan", "Kepatuhan"] },
  { name: "Divisi Kemitraan dan Edukasi", units: ["Pembinaan mitra", "Pelatihan"] },
];

function initializeTheme() {
  const toggles = [...document.querySelectorAll(".theme-toggle")];
  toggles.forEach((button) => {
    button.addEventListener("click", () => {
      const isNightMode = document.documentElement.dataset.theme === "night";
      const root = document.documentElement;
      root.classList.add("theme-fade");
      if (isNightMode) delete root.dataset.theme;
      else root.dataset.theme = "night";

      const label = isNightMode ? "Aktifkan mode malam" : "Aktifkan mode siang";
      toggles.forEach((toggle) => {
        toggle.setAttribute("aria-label", label);
        toggle.setAttribute("title", label);
      });
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.content = isNightMode ? "#0E0F11" : "#F4F5F6";
      window.setTimeout(() => root.classList.remove("theme-fade"), 700);
    });
  });
}

function initializeWhatsAppLinks() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
  document.querySelectorAll("[data-whatsapp-default]").forEach((anchor) => {
    anchor.href = href;
  });
}

function initializeJumpLinks() {
  const links = [...document.querySelectorAll(".jump-nav a")];
  links.forEach((link) => {
    link.addEventListener("click", () => {
      links.forEach((item) => item.classList.toggle("active", item === link));
    });
  });
}

function initializeSlideshow() {
  const stage = document.querySelector(".home-stage");
  const slides = [...document.querySelectorAll(".home-stage .slide")];
  if (!stage || slides.length < 2) return;

  const indicators = [...document.querySelectorAll(".slide-indicators button")];
  const stageCopy = stage.querySelector(".stage-copy");
  const label = stage.querySelector(".stage-label");
  const title = stage.querySelector(".stage-title");
  const focus = stage.querySelector(".stage-focus");
  const description = stage.querySelector(".stage-description");
  const number = stage.querySelector(".page-number");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let timer;
  let animationTimer;

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    const slide = slides[activeIndex];
    slides.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === activeIndex));
    indicators.forEach((indicator, itemIndex) => indicator.setAttribute("aria-selected", String(itemIndex === activeIndex)));
    label.textContent = slide.dataset.label || "";
    title.textContent = slide.dataset.title || "";
    focus.textContent = slide.dataset.focus || "";
    description.textContent = slide.dataset.description || "";
    number.textContent = `0${activeIndex + 1}`;

    if (!motionPreference.matches) {
      stageCopy.classList.remove("is-changing");
      window.clearTimeout(animationTimer);
      requestAnimationFrame(() => stageCopy.classList.add("is-changing"));
      animationTimer = window.setTimeout(() => stageCopy.classList.remove("is-changing"), 500);
    }
  }

  function stopTimer() {
    window.clearInterval(timer);
  }

  function startTimer() {
    stopTimer();
    if (motionPreference.matches || stage.matches(":hover")) return;
    timer = window.setInterval(() => showSlide(activeIndex + 1), 6000);
  }

  indicators.forEach((indicator) => indicator.addEventListener("click", () => {
    showSlide(Number(indicator.dataset.slide));
    startTimer();
  }));
  stage.querySelector(".slide-prev")?.addEventListener("click", () => {
    showSlide(activeIndex - 1);
    startTimer();
  });
  stage.querySelector(".slide-next")?.addEventListener("click", () => {
    showSlide(activeIndex + 1);
    startTimer();
  });
  stage.addEventListener("keydown", (event) => {
    if (event.target.closest("a, button")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(activeIndex - 1);
      startTimer();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + 1);
      startTimer();
    }
  });
  stage.addEventListener("mouseenter", stopTimer);
  stage.addEventListener("mouseleave", startTimer);
  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches) stopTimer();
    else startTimer();
  });
  showSlide(0);
  startTimer();
}

function initializePhotoFallbacks() {
  document.querySelectorAll(".stage-media img").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      const slide = image.closest(".slide");
      if (!slide || slide.querySelector(".photo-fallback")) return;
      const fallback = document.createElement("div");
      fallback.className = "photo-fallback";
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", image.alt || "Ilustrasi ZAS");
      fallback.innerHTML = '<svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="scene" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1d3848"/><stop offset="1" stop-color="#0e1c25"/></linearGradient></defs><rect width="900" height="560" fill="url(#scene)"/><path d="M0 425h900M0 458h900" stroke="#59bce0" stroke-opacity=".35"/><path d="M110 426V164h173v262m14 0V92h195v334m26 0V205h178v221m19 0V142h85v284" fill="#182932" stroke="#6bc8e8" stroke-opacity=".65" stroke-width="3"/><path d="M142 195h110m-110 41h110m-110 41h110m-110 41h110m-110 41h110M327 130h140m-140 48h140m-140 48h140m-140 48h140m-140 48h140" stroke="#79c8e4" stroke-opacity=".45" stroke-width="4"/></svg>';
      slide.append(fallback);
    }, { once: true });
    if (image.complete && image.naturalWidth === 0) image.dispatchEvent(new Event("error"));
  });
}

function initializeOrganizationChart() {
  const chart = document.getElementById("org-chart");
  if (!chart) return;
  const director = document.createElement("div");
  director.className = "org-director";
  director.textContent = "Direktur Utama";
  chart.append(director);
  const divisions = document.createElement("div");
  divisions.className = "org-divisions";
  ORGANIZATION.forEach(({ name, units }) => {
    const section = document.createElement("section");
    section.className = "org-division";
    const heading = document.createElement("h3");
    heading.textContent = name;
    const list = document.createElement("ul");
    units.forEach((unit) => {
      const item = document.createElement("li");
      item.textContent = unit;
      list.append(item);
    });
    section.append(heading, list);
    divisions.append(section);
  });
  chart.append(divisions);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const temporary = document.createElement("textarea");
  temporary.value = text;
  temporary.setAttribute("readonly", "");
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  document.body.append(temporary);
  temporary.select();
  const copied = document.execCommand("copy");
  temporary.remove();
  if (!copied) throw new Error("Browser tidak dapat menyalin teks.");
}

function initializeCopyButtons() {
  const status = document.querySelector(".copy-status");
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await copyText(button.dataset.copy || "");
        if (status) status.textContent = "Teks berhasil disalin.";
      } catch (error) {
        if (status) status.textContent = "Teks tidak dapat disalin. Silakan salin secara manual.";
        console.error("Gagal menyalin teks:", error);
      }
    });
  });
}

function initializeWhatsAppForm() {
  const form = document.getElementById("whatsapp-form");
  if (!form) return;
  const message = form.elements.namedItem("message");
  const email = form.elements.namedItem("email");
  const error = document.getElementById("message-error");
  const status = form.querySelector(".form-status");
  const sendLink = document.getElementById("send-whatsapp");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const messageText = message.value.trim();
    if (!messageText) {
      error.textContent = "Pesan wajib diisi.";
      message.setAttribute("aria-invalid", "true");
      message.focus();
      sendLink.hidden = true;
      status.textContent = "";
      return;
    }
    if (email.value.trim() && !email.validity.valid) {
      email.setAttribute("aria-invalid", "true");
      status.textContent = "Periksa kembali format email Anda.";
      email.focus();
      sendLink.hidden = true;
      return;
    }
    error.textContent = "";
    message.removeAttribute("aria-invalid");
    email.removeAttribute("aria-invalid");
    const name = form.elements.namedItem("name").value.trim();
    const emailAddress = email.value.trim();
    const parts = ["Halo ZAS, saya ingin menghubungi Anda.", name && `Nama: ${name}`, emailAddress && `Email: ${emailAddress}`, `Pesan: ${messageText}`].filter(Boolean);
    sendLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(parts.join("\n"))}`;
    sendLink.hidden = false;
    status.textContent = "Pesan siap dikirim melalui WhatsApp.";
  });
  message.addEventListener("input", () => {
    if (message.value.trim()) {
      error.textContent = "";
      message.removeAttribute("aria-invalid");
    }
  });
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
initializeTheme();
initializeWhatsAppLinks();
initializeJumpLinks();
initializeSlideshow();
initializePhotoFallbacks();
initializeOrganizationChart();
initializeCopyButtons();
initializeWhatsAppForm();
