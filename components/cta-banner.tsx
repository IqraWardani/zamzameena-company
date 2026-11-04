import Image from "next/image";
import Link from "next/link";
import { homePageContent } from "@/data/home-page";
import { callToAction } from "@/data/site-content";

type CtaBannerProps = {
  variant?: "default" | "home-design";
  image?: string;
  imageAlt?: string;
};

export function CtaBanner({
  variant = "default",
  image,
  imageAlt,
}: CtaBannerProps) {
  if (variant === "home-design") {
    const { cta } = homePageContent;

    return (
      <section className="zas-cta-banner home-design-cta" aria-labelledby="home-design-cta-title">
        <Image
          className="home-design-cta-image"
          src={image ?? cta.image}
          alt={imageAlt ?? cta.imageAlt}
          fill
          sizes="100vw"
        />
        <div className="home-design-cta-shade" />
        <div className="home-design-cta-content">
          <h2 id="home-design-cta-title">{cta.title}</h2>
          <Link className="home-design-button" href={cta.href}>
            {cta.buttonLabel}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="zas-cta-banner" aria-labelledby="zas-cta-title">
      <div className="zas-cta-orbit zas-cta-orbit-one" aria-hidden="true" />
      <div className="zas-cta-orbit zas-cta-orbit-two" aria-hidden="true" />
      <div className="zas-cta-content">
        <p className="zas-eyebrow">{callToAction.eyebrow}</p>
        <h2 id="zas-cta-title">{callToAction.title}</h2>
        <p className="zas-cta-description">{callToAction.description}</p>
        <Link className="zas-button zas-button-light" href={callToAction.href}>
          {callToAction.buttonLabel} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
