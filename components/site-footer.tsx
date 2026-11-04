import Image from "next/image";
import Link from "next/link";
import { homePageContent } from "@/data/home-page";

export function SiteFooter() {
  const { footer } = homePageContent;

  return (
    <footer className="home-design-footer">
      <div className="home-design-footer-main">
        <div className="home-design-footer-brand">
          <Link href="/" aria-label="Zamzameena Ainsa Synergy home">
            <Image
              src="/images/figma/footer-logo.webp"
              alt="Zamzameena Holding Division logo"
              width={100}
              height={67}
            />
          </Link>
          <p>{footer.description}</p>
          <a className="home-design-footer-email" href={`mailto:${footer.email}`}>
            {footer.email}
          </a>
          <div className="home-design-social-icons" aria-label="Social media">
            {footer.socialIcons.map((social) => (
              <Image
                key={social.name}
                src={social.src}
                alt={social.name}
                width={20}
                height={20}
              />
            ))}
          </div>
        </div>

        <nav className="home-design-footer-column" aria-label="Quick links">
          <h2>Quick Links</h2>
          <ul>
            {footer.quickLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="home-design-footer-column">
          <h2>Connect</h2>
          <ul>
            {footer.connectLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="home-design-copyright">
        © {new Date().getFullYear()} Zamzameena Ainsa Synergy. All rights reserved.
      </p>
    </footer>
  );
}
