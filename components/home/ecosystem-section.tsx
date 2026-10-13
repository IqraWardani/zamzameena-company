import Image from "next/image";
import { homePageContent } from "@/data/home-page";

export function EcosystemSection() {
  const { ecosystem } = homePageContent;
  const [mainImage, upperImage, lowerImage] = ecosystem.images;

  return (
    <section className="home-design-ecosystem">
      <header className="home-design-section-heading">
        <h2>{ecosystem.title}</h2>
        <p>{ecosystem.subtitle}</p>
      </header>
      <div className="home-design-ecosystem-content">
        <p className="home-design-body-copy">{ecosystem.description}</p>
        <div className="home-design-architecture-grid" aria-label="Business architecture imagery">
          <div className="home-design-architecture-main">
            <Image src={mainImage.src} alt={mainImage.alt} fill sizes="(max-width: 700px) 100vw, 26vw" />
          </div>
          <div className="home-design-architecture-stack">
            <div>
              <Image src={upperImage.src} alt={upperImage.alt} fill sizes="(max-width: 700px) 45vw, 20vw" />
            </div>
            <div>
              <Image src={lowerImage.src} alt={lowerImage.alt} fill sizes="(max-width: 700px) 45vw, 20vw" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
