"use client";

export function ContactCta() {
  const scrollToForm = () => {
    document.getElementById("contact-form")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });

    window.requestAnimationFrame(() => {
      document.getElementById("contact-first-name")?.focus({ preventScroll: true });
    });
  };

  return (
    <a className="zas-contact-cta-button" href="#contact-form" onClick={scrollToForm}>
      Get in Touch
    </a>
  );
}
