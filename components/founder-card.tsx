import Image from "next/image";

type Founder = {
  name: string;
  title: string;
  bio?: string;
  image: string;
  imageAlt: string;
};

type FounderCardProps = {
  founder: Founder;
  variant?: "card" | "profile";
  index?: number;
};

export function FounderCard({
  founder,
  variant = "card",
  index = 0,
}: FounderCardProps) {
  if (variant === "profile") {
    return (
      <article
        className={`zas-founder-profile${index % 2 === 1 ? " is-reversed" : ""}`}
        data-reveal
      >
        <div className="zas-founder-profile-image">
          <Image
            src={founder.image}
            alt={founder.imageAlt}
            fill
            loading="lazy"
            sizes="(max-width: 680px) 100vw, (max-width: 900px) 45vw, 338px"
          />
        </div>
        <div className="zas-founder-profile-copy">
          {founder.bio ? <p className="zas-founder-bio">{founder.bio}</p> : null}
          <div className="zas-founder-signature">
            <h3>{founder.name}</h3>
            <p className="zas-eyebrow">{founder.title}</p>
          </div>
        </div>
      </article>
    );
  }

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
