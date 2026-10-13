import Image from "next/image";
import Link from "next/link";
import { homePageContent } from "@/data/home-page";

export function SmartMarketSection() {
  const { smartMarket } = homePageContent;
  const [warehouseImage, networkImage] = smartMarket.images;

  return (
    <section className="home-design-smart-market">
      <div className="home-design-market-images">
        <div className="home-design-market-image home-design-market-warehouse">
          <Image src={warehouseImage.src} alt={warehouseImage.alt} fill sizes="(max-width: 700px) 42vw, 13vw" />
        </div>
        <div className="home-design-market-image home-design-market-network">
          <Image src={networkImage.src} alt={networkImage.alt} fill sizes="(max-width: 700px) 62vw, 23vw" />
        </div>
      </div>
      <div className="home-design-smart-market-copy">
        <p className="home-design-eyebrow">{smartMarket.eyebrow}</p>
        <h2>{smartMarket.title}</h2>
        <p className="home-design-body-copy">{smartMarket.description}</p>
        <Link className="home-design-button home-design-button-dark" href={smartMarket.href}>
          {smartMarket.buttonLabel}
        </Link>
      </div>
    </section>
  );
}
