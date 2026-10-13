import Image from "next/image";
import type { founders } from "@/data/site-content";

type Founder = (typeof founders)[number];

export function FounderCard({ founder }: { founder: Founder }) {
  return (
    <article className="zas-founder-card" data-reveal>
      <div className="zas-founder-image">
        <Image
          src={founder.image}
          alt={founder.imageAlt}
          fill
          sizes="(max-width: 620px) 86vw, (max-width: 1000px) 42vw, 230px"
        />
        <span className="zas-founder-index" aria-hidden="true">
          {founder.name.slice(-2)}
        </span>
      </div>
      <div className="zas-founder-card-copy">
        <p>{founder.title}</p>
        <h3>{founder.name}</h3>
      </div>
    </article>
  );
}
