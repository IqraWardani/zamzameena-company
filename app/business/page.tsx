import type { Metadata } from "next";
import Image from "next/image";
import { CtaBanner } from "@/components/cta-banner";
import { FeatureCard } from "@/components/feature-card";
import { SiteFrame } from "@/components/site-frame";
import { SiteSectionHeading } from "@/components/site-section-heading";
import { businessContent } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Business",
  description:
    "Explore Zamzameena's partnership network, distribution and commerce model, and connected ecosystem intelligence layer.",
  openGraph: {
    title: "Business | Zamzameena Ainsa Synergy",
    description:
      "A connected business model bringing partnerships, commerce, and ecosystem intelligence together.",
    type: "website",
  },
};

export default function BusinessPage() {
  return (
    <SiteFrame>
      <main id="main-content">
        <section className="zas-inner-hero zas-business-hero">
          <Image
            src={businessContent.hero.image}
            alt={businessContent.hero.imageAlt}
            fill
            priority
            sizes="100vw"
          />
          <div className="zas-inner-hero-shade" />
          <div className="zas-inner-hero-content">
            <p className="zas-eyebrow">{businessContent.hero.eyebrow}</p>
            <h1>{businessContent.hero.title}</h1>
            <p>{businessContent.hero.description}</p>
          </div>
          <span className="zas-inner-hero-index">02 — OUR BUSINESS</span>
        </section>

        <section className="zas-business-model-section" id="partnership" data-reveal>
          <div className="zas-business-section-header">
            <SiteSectionHeading
              eyebrow="A Connected Model"
              title="Business Model"
              description="A flexible framework that connects the right people, capabilities, and insight at every step."
            />
            <span className="zas-business-section-index">01 / 03</span>
          </div>
          <div className="zas-feature-grid">
            {businessContent.models.map((model, index) => (
              <FeatureCard
                key={model.title}
                title={model.title}
                description={model.description}
                image={model.image}
                imageAlt={model.imageAlt}
                index={index}
                variant="model"
              />
            ))}
          </div>
          <div className="zas-market-system" aria-label="A market-centered connected business ecosystem">
            <span className="zas-market-node zas-market-node-left">Supply</span>
            <span className="zas-market-node zas-market-node-top">Partnership</span>
            <span className="zas-market-node zas-market-node-right">Commerce</span>
            <span className="zas-market-node zas-market-node-bottom">Intelligence</span>
            <div className="zas-market-circle">
              <span>Shared</span>
              <strong>MARKET</strong>
              <span>understanding</span>
            </div>
          </div>
          <p className="zas-market-caption">
            Every connection starts with understanding the market.
          </p>
        </section>

        <section className="zas-intelligence-section" data-reveal>
          <div className="zas-business-section-header">
            <SiteSectionHeading
              eyebrow="Insight in Every Connection"
              title="Ecosystem Intelligence Layer"
              description="Bringing visibility and coordination to the information that moves business forward."
            />
            <span className="zas-business-section-index">02 / 03</span>
          </div>
          <div className="zas-feature-grid zas-intelligence-grid">
            {businessContent.intelligence.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                image={feature.image}
                imageAlt={feature.imageAlt}
                index={index}
                variant="intelligence"
              />
            ))}
          </div>
          <div className="zas-intelligence-note">
            <span aria-hidden="true">✳</span>
            <p>One connected view. More confident decisions. Greater shared value.</p>
          </div>
        </section>

        <CtaBanner />
      </main>
    </SiteFrame>
  );
}
