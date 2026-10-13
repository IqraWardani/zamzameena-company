import Image from "next/image";
import type { founders } from "@/data/site-content";

type Founder = (typeof founders)[number];

export function FounderProfile({
  founder,
  index,
}: {
  founder: Founder;
  index: number;
}) {
  return (
    <article className={`zas-founder-profile${index % 2 === 1 ? " is-reversed" : ""}`} data-reveal>
      <div className="zas-founder-profile-image">
        <Image
          src={founder.image}
          alt={founder.imageAlt}
          fill
          sizes="(max-width: 760px) 100vw, 50vw"
        />
        <span>0{index + 1} / FOUNDING TEAM</span>
      </div>
      <div className="zas-founder-profile-copy">
        <p className="zas-eyebrow">{founder.title}</p>
        <h3>{founder.name}</h3>
        <p className="zas-founder-bio">{founder.bio}</p>
        <div className="zas-founder-rule" />
        <p className="zas-founder-detail">
          Leadership profile details to be confirmed.
        </p>
      </div>
    </article>
  );
}
