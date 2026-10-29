import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFrame } from "@/components/site-frame";
import { SiteSectionHeading } from "@/components/site-section-heading";
import type { AboutStrategyPageContent } from "@/data/about-strategy-pages";

export function AboutStrategyPage({
  page,
}: {
  page: AboutStrategyPageContent;
}) {
  const titleId = `about-${page.slug}-title`;
  const introductionId = `about-${page.slug}-introduction`;
  const closingId = `about-${page.slug}-closing`;

  return (
    <SiteFrame>
      <main id="main-content">
        <section
          className="zas-content-page-hero"
          aria-labelledby={titleId}
        >
          <div className="zas-content-page-hero-content">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "About", href: "/about/company-profile" },
                { label: page.title },
              ]}
            />
            <p className="zas-eyebrow">About</p>
            <h1 id={titleId}>{page.title}</h1>
            <p className="zas-content-page-hero-description">
              {page.description}
            </p>
          </div>
        </section>

        <section
          className="zas-content-page-section zas-about-strategy-section"
          aria-labelledby={introductionId}
        >
          <div className="zas-content-page-section-inner">
            <SiteSectionHeading
              eyebrow="About Zamzameena"
              title={page.introductionTitle}
              description={page.introduction}
              titleId={introductionId}
            />
            <ol className="zas-about-strategy-grid">
              {page.sections.map((section, index) => (
                <li key={section.title}>
                  <article className="zas-about-strategy-card">
                    <span className="zas-about-strategy-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.label ? (
                      <p className="zas-about-strategy-label">{section.label}</p>
                    ) : null}
                    <h3>{section.title}</h3>
                    <p className="zas-about-strategy-copy">{section.content}</p>
                  </article>
                </li>
              ))}
            </ol>
            <section
              className="zas-about-strategy-closing"
              aria-labelledby={closingId}
            >
              <h2 id={closingId}>{page.closingTitle}</h2>
              <p>{page.closing}</p>
            </section>
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
