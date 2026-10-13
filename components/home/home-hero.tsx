import Image from "next/image";
import Link from "next/link";
import { homePageContent } from "@/data/home-page";

export function HomeHero() {
  const { hero } = homePageContent;

  return (
    <section className="home-design-hero" aria-labelledby="home-design-title">
      <Image
        className="home-design-hero-image"
        src={hero.image}
        alt={hero.imageAlt}
        fill
        priority
        sizes="100vw"
      />
      <div className="home-design-hero-shade" aria-hidden="true" />
      <div className="home-design-hero-content">
        <h1 id="home-design-title">{hero.title}</h1>
        <p>{hero.quote}</p>
        <Link className="home-design-button" href={hero.href}>
          {hero.buttonLabel}
        </Link>
      </div>
    </section>
  );
}
