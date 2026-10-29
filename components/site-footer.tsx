import Image from "next/image";
import Link from "next/link";
import { companyContent, footerContent } from "@/data/site-content";

function SocialIcon({ label }: { label: string }) {
  if (label === "LinkedIn") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 8.8H2.4V21h2.8V8.8ZM3.8 7.1a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM21.6 14c0-3.7-2-5.4-4.7-5.4-2.2 0-3.2 1.2-3.7 2V8.8h-2.8V21h2.8v-6c0-1.6.3-3.2 2.4-3.2s2.1 1.9 2.1 3.3V21h2.9l1-7Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.7" r="1" className="zas-icon-fill" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="zas-footer" id="connect">
      <div className="zas-footer-main">
        <div className="zas-footer-brand-block">
          <Link className="zas-brand zas-footer-brand" href="/" aria-label={`${companyContent.name} home`}>
            <Image className="zas-brand-logo" src="/assets/logo.png" alt="" width={42} height={42} />
            <span>Zamzameena</span>
          </Link>
          <p>{companyContent.description}</p>
        </div>

        <div className="zas-footer-column">
          <h2>Quick Links</h2>
          <ul>
            {footerContent.quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="zas-footer-column zas-footer-connect">
          <h2>{footerContent.connectLabel}</h2>
          <p className="zas-footer-pending">{footerContent.email}</p>
          <div className="zas-social-links" aria-label="Social media">
            {footerContent.socialLinks.map((social) => (
              <span
                key={social.label}
                role="img"
                aria-label={`${social.label} profile URL to be added`}
                title={social.label}
              >
                <SocialIcon label={social.label} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="zas-footer-bottom">
        <p>© {new Date().getFullYear()} {companyContent.legalName}. All rights reserved.</p>
        <span>Built for a more connected future.</span>
      </div>
    </footer>
  );
}
