import Image from "next/image";
import Link from "next/link";
import { homePageContent } from "@/data/home-page";

export function FoundersSection() {
  const { founders } = homePageContent;

  return (
    <section className="home-design-founders">
      <header className="home-design-section-heading">
        <h2>{founders.title}</h2>
        <p>{founders.subtitle}</p>
      </header>
      <div className="home-design-founders-grid">
        {founders.people.map((founder, index) => (
          <article className="home-design-founder-card" key={founder.name}>
            <Image
              src={founder.image}
              alt={founder.imageAlt}
              fill
              loading={index === 0 ? "eager" : "lazy"}
              sizes="(max-width: 560px) 90vw, (max-width: 900px) 45vw, 22vw"
            />
          </article>
        ))}
      </div>
      <Link className="home-design-button home-design-button-dark" href={founders.href}>
        {founders.buttonLabel}
      </Link>
    </section>
  );
}
