import Image from "next/image";
import { ContactCta } from "@/components/contact/contact-cta";
import { ContactForm } from "@/components/contact/contact-form";
import { contactInfo } from "@/lib/contact-info";

export const metadata = {
  title: "Contact",
  description:
    "Start a conversation with Zamzameena Ainsa Synergy about business collaboration and partnership opportunities.",
};

const socialLinks = [
  { label: "Facebook ZAS", href: contactInfo.socials.facebook, name: "facebook" },
  { label: "Instagram ZAS", href: contactInfo.socials.instagram, name: "instagram" },
  { label: "TikTok ZAS", href: contactInfo.socials.tiktok, name: "tiktok" },
  { label: "YouTube ZAS", href: contactInfo.socials.youtube, name: "youtube" },
  { label: "WhatsApp ZAS", href: contactInfo.socials.whatsapp, name: "whatsapp" },
];

function ContactIcon({ name }: { name: string }) {
  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.4 3.5 10 7.7 8.3 9.5c1.1 2.2 2.8 3.9 5 5l1.8-1.7 4.2 2.6-.8 3.1c-.2.8-1 1.3-1.8 1.2C9.6 18.5 5.5 14.4 4.3 7.3c-.1-.8.4-1.6 1.2-1.8l1.9-.5Z" />
      </svg>
    );
  }

  if (name === "email") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
        <path d="m4.5 7 7.5 6 7.5-6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.1" />
    </svg>
  );
}

function SocialIcon({ name }: { name: string }) {
  switch (name) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 20v-7h2.4l.4-2.8h-2.8V8.4c0-.8.2-1.4 1.4-1.4h1.5V4.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v1.8H7.7V13h2.5v7h3.3Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17.4" cy="6.8" r=".8" className="zas-contact-social-dot" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.2 4v10.5a3.6 3.6 0 1 1-3.1-3.6v3a.8.8 0 1 0 .2.6V4h2.9c.2 1.8 1.2 3 3.1 3.4v3a7.1 7.1 0 0 1-3.1-1.2" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 8.2a2.5 2.5 0 0 0-1.8-1.8C16.6 6 12 6 12 6s-4.6 0-6.2.4A2.5 2.5 0 0 0 4 8.2 26 26 0 0 0 3.7 12c0 1.3.1 2.6.3 3.8a2.5 2.5 0 0 0 1.8 1.8C7.4 18 12 18 12 18s4.6 0 6.2-.4a2.5 2.5 0 0 0 1.8-1.8c.2-1.2.3-2.5.3-3.8s-.1-2.6-.3-3.8Z" />
          <path d="m10 9.4 4.5 2.6-4.5 2.6V9.4Z" className="zas-contact-social-play" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.2 4.8A9.8 9.8 0 0 0 3.8 16.6L2.5 21.5l5-1.3a9.8 9.8 0 0 0 11.7-15.4Z" />
          <path d="M8.2 7.7c.3-.5.6-.5.9-.5h.5c.2 0 .4.1.5.4l.8 1.9c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.5 1 1.3 1.8 2.3 2.3.2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.7-.1l1.8.9c.3.1.4.3.4.5v.5c0 .3-.2.7-.5.9-.5.4-1.2.6-1.9.4-1.1-.2-2.5-.8-3.9-2.1-1.1-1-2-2.3-2.4-3.4-.4-1.1-.1-2 .2-2.7Z" />
        </svg>
      );
  }
}

function SocialLinks() {
  return (
    <div className="zas-contact-socials">
      {socialLinks.map((social) => (
        <a
          aria-label={social.label}
          href={social.href}
          key={social.name}
          rel="noopener noreferrer"
          target="_blank"
        >
          <SocialIcon name={social.name} />
        </a>
      ))}
    </div>
  );
}

function ContactInfoCard() {
  const encodedAddress = encodeURIComponent(contactInfo.address);
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
  const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  return (
    <aside className="zas-contact-card" aria-label="Contact information">
      <div className="zas-contact-map">
        <iframe
          loading="lazy"
          src={mapEmbedUrl}
          title={`Google Maps location for ${contactInfo.address}`}
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a href={mapLinkUrl} target="_blank" rel="noopener noreferrer">
          Open in Google Maps
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="zas-contact-details">
        <div className="zas-contact-detail">
          <span className="zas-contact-detail-icon"><ContactIcon name="phone" /></span>
          <a href={contactInfo.phoneHref}>{contactInfo.phone}</a>
        </div>
        <div className="zas-contact-detail">
          <span className="zas-contact-detail-icon"><ContactIcon name="email" /></span>
          <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
        </div>
        <div className="zas-contact-detail">
          <span className="zas-contact-detail-icon"><ContactIcon name="address" /></span>
          <span>{contactInfo.address}</span>
        </div>
      </div>

      <div className="zas-contact-card-social">
        <div>
          <p>Connect with us</p>
          <SocialLinks />
        </div>
        <svg className="zas-contact-asterisk" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 5v38M7.5 14.5l33 19M40.5 14.5l-33 19" />
        </svg>
      </div>
    </aside>
  );
}

export default function ContactPage() {
  return (
    <main id="main-content" className="zas-contact-page">
      <section className="zas-contact-hero" aria-labelledby="contact-hero-title">
        <Image
          alt=""
          className="zas-contact-hero-image"
          fill
          priority
          sizes="100vw"
          src="/images/figma/cta-footer-bg.webp"
        />
        <div className="zas-contact-hero-shade" />
        <div className="zas-contact-hero-content">
          <h1 id="contact-hero-title">
            Let&apos;s Build Opportunities
            <span>Together</span>
          </h1>
          <p>
            We believe meaningful partnerships begin with meaningful conversations.
            Whether you&apos;re exploring business collaboration, distribution
            opportunities, or strategic partnerships, we welcome the opportunity to
            connect with you.
          </p>
        </div>
      </section>

      <section className="zas-contact-main" aria-labelledby="contact-section-title">
        <div className="zas-contact-intro">
          <h2 id="contact-section-title">Let&apos;s Start a Conversation</h2>
          <p>
            Tell us a little about your business and what you have in mind. Our team
            welcomes inquiries from businesses, potential partners, and organizations
            interested in exploring opportunities with ZAS.
          </p>
        </div>

        <div className="zas-contact-columns">
          <ContactForm />
          <ContactInfoCard />
        </div>
      </section>

      <section className="zas-contact-cta" aria-labelledby="contact-cta-title">
        <Image
          alt=""
          className="zas-contact-cta-image"
          fill
          sizes="100vw"
          src="/images/figma/founder-hero.png"
        />
        <div className="zas-contact-cta-shade" />
        <div className="zas-contact-cta-content">
          <h2 id="contact-cta-title">Let&apos;s Build Opportunities Together</h2>
          <ContactCta />
        </div>
      </section>
    </main>
  );
}
