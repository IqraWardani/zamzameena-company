import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFrame } from "@/components/site-frame";
import { SiteSectionHeading } from "@/components/site-section-heading";
import { productCategories } from "@/data/company";

export function TechnologyPageContent() {
  return (
    <SiteFrame>
      <main id="main-content">
        <section className="zas-content-page-hero" aria-labelledby="technology-page-title">
          <div className="zas-content-page-hero-content">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "About", href: "/about/company-profile" },
                { label: "Technology" },
              ]}
            />
            <p className="zas-eyebrow">Technology</p>
            <h1 id="technology-page-title">Technology</h1>
            <p className="zas-content-page-hero-description">
              Product knowledge and ecosystem understanding for Zamzameena&apos;s business
              architecture and commercial positioning.
            </p>
          </div>
        </section>

        <section className="zas-technology-section" aria-labelledby="technology-products-title">
          <div className="zas-technology-section-inner">
            <SiteSectionHeading
              eyebrow="Technology"
              title="Understanding the products inside the ecosystem"
              description="This section holds product context, positioning, and category understanding so the ecosystem can be communicated with greater clarity and consistency."
              titleId="technology-products-title"
            />
            <div className="zas-technology-card-grid">
              {productCategories.map((product) => (
                <article className="zas-technology-card" key={product.name}>
                  <div
                    className="zas-technology-card-image"
                    role="img"
                    aria-label={`${product.category} ${product.name}`}
                    style={{ backgroundImage: `url(${product.image})` }}
                  />
                  <div className="zas-technology-card-copy">
                    <p>{product.category}</p>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="zas-technology-discipline" aria-labelledby="technology-discipline-title">
          <div className="zas-technology-section-inner">
            <SiteSectionHeading
              eyebrow="Knowledge discipline"
              title="Product understanding should support the wider business logic"
              description="Each product line becomes clearer when paired with commercial positioning, partner readiness, and value-chain alignment."
              titleId="technology-discipline-title"
            />
            <div className="zas-technology-principles">
              {[
                [
                  "Category clarity",
                  "Reliable positioning reduces confusion across supply, market, and demand activities.",
                ],
                [
                  "Commercial relevance",
                  "Each product must be understood in the context of customer need and market fit.",
                ],
                [
                  "Ecosystem fit",
                  "Product knowledge should align with operations, distribution, and partner capability.",
                ],
              ].map(([title, description]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
