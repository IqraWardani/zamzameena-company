import { SiteFrame } from "@/components/site-frame";
import { SiteSectionHeading } from "@/components/site-section-heading";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { StandardPageContent } from "@/data/content-pages";

export function StandardContentPage({ page }: { page: StandardPageContent }) {
  return (
    <SiteFrame>
      <main id="main-content">
        <section className="zas-content-page-hero" aria-labelledby="standard-page-title">
          <div className="zas-content-page-hero-content">
            <Breadcrumbs items={page.breadcrumbs} />
            <p className="zas-eyebrow">{page.eyebrow}</p>
            <h1 id="standard-page-title">{page.title}</h1>
            <p className="zas-content-page-hero-description">{page.description}</p>
          </div>
        </section>
        <section className="zas-content-page-section" aria-labelledby="standard-page-section-title">
          <div className="zas-content-page-section-inner">
            <SiteSectionHeading
              eyebrow={page.eyebrow}
              title={page.sectionTitle}
              description={page.sectionDescription}
              titleId="standard-page-section-title"
            />
            <div className="zas-placeholder-panel">
              <strong>Content pending</strong>
              <p>{page.placeholder}</p>
            </div>
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
