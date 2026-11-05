import { homePageContent } from "@/data/home-page";

export function HomeHighlights() {
  return (
    <section className="home-design-highlights" aria-label="Business ecosystem highlights">
      {homePageContent.highlights.map((highlight) => (
        <article className="home-design-highlight" key={highlight.title}>
          <h2>{highlight.title}</h2>
          <p>{highlight.description}</p>
        </article>
      ))}
    </section>
  );
}
