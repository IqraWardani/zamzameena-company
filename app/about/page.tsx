import type { Metadata } from "next";
import Image from "next/image";
import { CtaBanner } from "@/components/cta-banner";
import { FounderCard } from "@/components/founder-card";
import { SiteFrame } from "@/components/site-frame";
import { SiteSectionHeading } from "@/components/site-section-heading";
import { aboutPageContent } from "@/data/about-page";

export const metadata: Metadata = {
  title: "About Zamzameena Ainsa Synergy",
  description:
    "Learn how Zamzameena Ainsa Synergy connects products, businesses, markets, and technology to create sustainable growth.",
  openGraph: {
    title: "About Zamzameena Ainsa Synergy",
    description:
      "Discover the principles, direction, and founders behind the Zamzameena business ecosystem.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <SiteFrame variant="about-design">
      <main className="about-design" id="main-content">
        <section className="about-design-hero" aria-labelledby="about-design-title">
          <Image
            src={aboutPageContent.hero.image}
            alt={aboutPageContent.hero.imageAlt}
            fill
            priority
            sizes="100vw"
          />
          <div className="about-design-hero-shade" aria-hidden="true" />
          <div className="about-design-hero-content">
            <h1 id="about-design-title">{aboutPageContent.hero.title}</h1>
            <p className="about-design-hero-subtitle">{aboutPageContent.hero.subtitle}</p>
            <p>{aboutPageContent.hero.description}</p>
          </div>
        </section>

        <section className="about-design-identity" aria-labelledby="about-identity-title" data-reveal>
          <header className="about-design-section-header">
            <SiteSectionHeading
              title={aboutPageContent.identity.title}
              description={aboutPageContent.identity.subtitle}
              align="center"
              titleId="about-identity-title"
            />
          </header>
          <div className="about-design-identity-content">
            <p>{aboutPageContent.identity.description}</p>
            <div className="about-design-identity-image">
              <Image
                src={aboutPageContent.identity.image}
                alt={aboutPageContent.identity.imageAlt}
                fill
                sizes="(max-width: 760px) 100vw, 40vw"
              />
            </div>
          </div>
        </section>

        <section className="about-design-direction" aria-labelledby="about-direction-title" data-reveal>
          <div className="about-design-direction-image">
            <Image
              src={aboutPageContent.direction.image}
              alt={aboutPageContent.direction.imageAlt}
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
          <div className="about-design-direction-copy">
            <SiteSectionHeading
              title={aboutPageContent.direction.title}
              description={aboutPageContent.direction.subtitle}
            />
            <p>{aboutPageContent.direction.description}</p>
          </div>
        </section>

        <section className="about-design-philosophy" aria-labelledby="about-philosophy-title" data-reveal>
          <header className="about-design-philosophy-header">
            <SiteSectionHeading
              eyebrow={aboutPageContent.philosophy.eyebrow}
              title={aboutPageContent.philosophy.title}
              description={aboutPageContent.philosophy.subtitle}
              titleId="about-philosophy-title"
            />
          </header>
          <div className="about-design-principles">
            {aboutPageContent.philosophy.principles.map((principle) => (
              <article className="about-design-principle" key={principle.title}>
                <div className="about-design-principle-image">
                  <Image
                    src={principle.image}
                    alt={principle.imageAlt}
                    fill
                    sizes="(max-width: 680px) 100vw, 30vw"
                  />
                </div>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-design-founders" id="founders" aria-labelledby="about-founders-title">
          <header className="about-design-founders-header">
            <SiteSectionHeading
              title={aboutPageContent.founders.title}
              description={aboutPageContent.founders.subtitle}
              align="center"
              titleId="about-founders-title"
            />
          </header>
          <div className="about-design-founders-list">
            {aboutPageContent.founders.people.map((founder, index) => (
              <FounderCard
                founder={founder}
                index={index}
                key={founder.name}
                variant="profile"
              />
            ))}
          </div>
        </section>

        <CtaBanner variant="home-design" />
      </main>
    </SiteFrame>
  );
}
