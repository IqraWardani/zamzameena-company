import type { Metadata } from "next";
import Image from "next/image";
import { CtaBanner } from "@/components/cta-banner";
import { FounderProfile } from "@/components/founder-profile";
import { SiteFrame } from "@/components/site-frame";
import { SiteSectionHeading } from "@/components/site-section-heading";
import { aboutContent, founders } from "@/data/site-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Zamzameena Ainsa Synergy's vision, mission, philosophy, and founding team.",
  openGraph: {
    title: "About Zamzameena Ainsa Synergy",
    description:
      "Meet the people and principles shaping a connected intelligence business ecosystem.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <SiteFrame>
      <main id="main-content">
        <section className="zas-inner-hero">
          <Image
            src={aboutContent.hero.image}
            alt={aboutContent.hero.imageAlt}
            fill
            priority
            sizes="100vw"
          />
          <div className="zas-inner-hero-shade" />
          <div className="zas-inner-hero-content">
            <p className="zas-eyebrow">{aboutContent.hero.eyebrow}</p>
            <h1>{aboutContent.hero.title}</h1>
            <p>{aboutContent.hero.description}</p>
          </div>
          <span className="zas-inner-hero-index">01 — OUR STORY</span>
        </section>

        <section className="zas-purpose-section" aria-label="Our vision and mission" data-reveal>
          <div className="zas-purpose-intro">
            <SiteSectionHeading
              eyebrow="Purpose & Direction"
              title="Built with a clear sense of purpose."
            />
            <p>
              We connect ambition with the people, insight, and capabilities
              needed to move businesses forward.
            </p>
          </div>
          <div className="zas-purpose-grid">
            <article className="zas-purpose-card">
              <span>01</span>
              <p className="zas-eyebrow">Our Vision</p>
              <h2>A trusted ecosystem creating value that lasts.</h2>
              <p>{aboutContent.vision}</p>
            </article>
            <article className="zas-purpose-card">
              <span>02</span>
              <p className="zas-eyebrow">Our Mission</p>
              <h2>Make meaningful participation possible.</h2>
              <p>{aboutContent.mission}</p>
            </article>
          </div>
        </section>

        <section className="zas-philosophy-section" data-reveal>
          <div className="zas-philosophy-header">
            <SiteSectionHeading
              eyebrow="What Guides Us"
              title="Our Philosophy"
              description="The principles that shape how we work, partner, and create value across the ecosystem."
            />
          </div>
          <div className="zas-philosophy-grid">
            {aboutContent.philosophy.map((principle, index) => (
              <article className="zas-philosophy-card" key={principle.title}>
                <span>0{index + 1}</span>
                <div className="zas-philosophy-mark" aria-hidden="true">
                  {index === 0 ? "↗" : index === 1 ? "◌" : "∞"}
                </div>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="zas-founder-profiles-section" id="founders" data-reveal>
          <div className="zas-founder-profiles-intro">
            <SiteSectionHeading
              eyebrow="The People Behind the Vision"
              title="Meet Our Founders"
              description="The people bringing the Zamzameena vision to life. Individual biographies and roles will be updated with approved information."
            />
          </div>
          <div className="zas-founder-profiles-list">
            {founders.map((founder, index) => (
              <FounderProfile founder={founder} index={index} key={founder.name} />
            ))}
          </div>
        </section>

        <CtaBanner />
      </main>
    </SiteFrame>
  );
}
