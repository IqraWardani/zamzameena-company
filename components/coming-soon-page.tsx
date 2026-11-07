"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";

export type ComingSoonFeature = {
  title: string;
  description: string;
  icon: "connections" | "insights" | "conversations";
};

type ComingSoonPageProps = {
  heroTitle: string;
  heroTagline: string;
  heroImage: string;
  description: string;
  features?: ComingSoonFeature[];
};

function FeatureIcon({ name }: { name: ComingSoonFeature["icon"] }) {
  if (name === "connections") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="12" r="5" />
        <circle cx="11" cy="35" r="5" />
        <circle cx="37" cy="35" r="5" />
        <path d="m21.5 16.3-7.8 14M26.5 16.3l7.8 14M16 35h16" />
      </svg>
    );
  }

  if (name === "insights") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M18 31.5a12 12 0 1 1 12 0c-2.2 1.4-3 3.2-3 5.5h-6c0-2.3-.8-4.1-3-5.5Z" />
        <path d="M21 42h6M24 3v3M5.5 13l2.6 1.5M42.5 13l-2.6 1.5M7 29h3M38 29h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M8 11.5h32v22H22l-9 7v-7H8v-22Z" />
      <path d="M16 20h16M16 26h11" />
    </svg>
  );
}

export function ComingSoonPage({
  heroTitle,
  heroTagline,
  heroImage,
  description,
  features = [],
}: ComingSoonPageProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Connect the email form to a subscription endpoint.
  };

  return (
    <main className="zas-coming-soon-page" id="main-content">
      <section className="zas-coming-soon-hero" aria-labelledby="coming-soon-hero-title">
        <Image
          className="zas-coming-soon-hero-image"
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="zas-coming-soon-hero-overlay" aria-hidden="true" />
        <div className="zas-coming-soon-hero-content">
          <h1 id="coming-soon-hero-title">{heroTitle}</h1>
          <p>{heroTagline}</p>
        </div>
      </section>

      <section className="zas-coming-soon-intro" aria-labelledby="coming-soon-title">
        <div className="zas-coming-soon-intro-content">
          <p className="zas-coming-soon-badge">
            <span aria-hidden="true" />
            Under Construction
          </p>
          <h2 id="coming-soon-title">Coming Soon</h2>
          <p className="zas-coming-soon-description">{description}</p>

          <form className="zas-coming-soon-form" onSubmit={handleSubmit}>
            <label htmlFor="coming-soon-email">Email address</label>
            <div className="zas-coming-soon-form-controls">
              <input
                autoComplete="email"
                id="coming-soon-email"
                name="email"
                placeholder="Enter your email address"
                required
                type="email"
              />
              <button type="submit">Notify Me</button>
            </div>
          </form>

          {features.length > 0 && (
            <ul className="zas-coming-soon-features">
              {features.map((feature) => (
                <li className="zas-coming-soon-feature" key={feature.title}>
                  <FeatureIcon name={feature.icon} />
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="zas-coming-soon-cta" aria-labelledby="coming-soon-cta-title">
        <Image
          className="zas-coming-soon-cta-image"
          src="/images/figma/home-hero.webp"
          alt=""
          fill
          sizes="100vw"
        />
        <div className="zas-coming-soon-cta-overlay" aria-hidden="true" />
        <div className="zas-coming-soon-cta-content">
          <h2 id="coming-soon-cta-title">Let&apos;s Build Opportunities Together</h2>
          <Link href="/contact">Get in Touch</Link>
        </div>
      </section>
    </main>
  );
}
