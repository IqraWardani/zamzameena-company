import Image from "next/image";

type FeatureCardProps = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  index: number;
  variant?: "model" | "intelligence";
};

export function FeatureCard({
  title,
  description,
  image,
  imageAlt,
  index,
  variant = "model",
}: FeatureCardProps) {
  return (
    <article className={`zas-feature-card is-${variant}`} data-reveal>
      <div className="zas-feature-card-image">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
        />
        <span className="zas-feature-card-index">0{index + 1}</span>
        <span className="zas-feature-card-arrow" aria-hidden="true">↗</span>
      </div>
      <div className="zas-feature-card-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}
