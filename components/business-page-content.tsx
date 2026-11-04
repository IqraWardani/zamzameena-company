import Image from "next/image";
import { Fragment } from "react";
import { CtaBanner } from "@/components/cta-banner";
import { SiteSectionHeading } from "@/components/site-section-heading";

const businessModels = [
  {
    title: "PRODUCT & SUPPLY",
    description:
      "Connecting product sources with market demand through structured supply coordination.",
    image: "/images/business/product-supply.jpg",
    imageAlt: "Business partners reviewing product and supply information",
  },
  {
    title: "PARTNERSHIP NETWORK",
    description:
      "Building a collaborative network of business partners to expand market reach.",
    image: "/images/business/partnership-network.jpg",
    imageAlt: "Digital business intelligence dashboard used by partners",
  },
  {
    title: "DISTRIBUTION & COMMERCE",
    description:
      "Integrating sales activities, order fulfillment, and distribution.",
    image: "/images/business/distribution-commerce.jpg",
    imageAlt: "Business partners shaking hands over distribution documents",
  },
];

const businessModelArrowWidths = [41, 40, 42] as const;

const businessPrinciples = [
  {
    title: "One Data Center",
    description:
      "Pusat komando digital (single-window integrated system) berbasis Platform-Centric. Mengandalkan Hyper-Intelligence untuk analitik prediktif dan Decentralized Autonomous Decision Making demi efisiensi operasional hulu ke hilir.",
  },
  {
    title: "Strategic Trading",
    description:
      "Perdagangan komoditas dan produk dengan kurasi akademis/teknis. Kriteria utamanya meliputi elastisitas permintaan pasar (Market Demand Elasticity), jaminan mutu di seluruh titik rantai pasok, dan margin bisnis yang sehat.",
  },
  {
    title: "Arsitektur Distribusi Terintegrasi",
    description:
      "Menghubungkan rantai pasok secara efisien, transparan, dan terukur. Hierarki aliran: Manufaktur/Produsen → ZAS → Distributor/Retail → End-User, memanfaatkan ekuitas merek dan jangkauan digital.",
  },
  {
    title: "Strategi OEM/ODM (Private Label)",
    description:
      "Adopsi skema Original Equipment Manufacturer dan Original Design Manufacturer untuk memaksimalkan kendali kualitas serta meningkatkan keunggulan kompetitif tanpa perlu membangun pabrik fisik mandiri.",
  },
];

const trianglePrinciples = [
  {
    title: "Interdependence",
    translation: "(Saling Ketergantungan)",
    concept:
      "Membangun ekosistem keterhubungan yang sinergis antar-entitas usaha (produsen, mitra, konsumen).",
    perspective:
      "Mengadopsi Business Ecosystem Theory. Keberlanjutan bertumpu pada hubungan simbiotik, menciptakan ketahanan rantai pasok (supply chain resilience).",
  },
  {
    title: "Platform-Centric",
    translation: "(Berpusat pada Platform)",
    concept:
      "Sentralisasi seluruh operasional dan transaksi komersial berbasis infrastruktur platform digital terintegrasi.",
    perspective:
      "Mengkombinasikan HyperIntelligence (BI/AI), CyberPhysical-Human Space Integration, dan pengambilan keputusan yang otonom (Decentralized).",
  },
  {
    title: "Co-Creation of Value",
    translation: "(Penciptaan Nilai Bersama)",
    concept:
      "Kolaborasi komprehensif dalam penciptaan nilai tambah (value-add) secara bersama-sama dalam ekosistem.",
    perspective:
      "Paradigma Service-Dominant Logic (S-D Logic). Konsumen/mitra bukan objek pasif, melainkan kontributor aktif dalam arsitektur distribusi yang terukur.",
  },
];

const businessStories = [
  {
    title: "Inkubator Co-Creation of Value",
    description:
      "Institut ini adalah mesin transfer pengetahuan. Mitra tidak dijadikan agen pasif, melainkan diedukasi melalui kurikulum terstruktur (termasuk standar operasional dan KPI) agar dapat berkontribusi aktif dalam menciptakan nilai tambah ekosistem.",
    image: "/images/business/co-creation-incubator.jpg",
    imageAlt: "Business partners collaborating in a co-creation incubator",
  },
  {
    title: "Sentralisasi Penjaminan Mutu",
    description:
      "Melatih mitra dan sumber daya manusia mengenai tata cara berinteraksi dengan sistem One Data Center (ERP, Inventory, CRM). Ini menjamin keseragaman standar kualitas layanan dari pusat hingga ke ujung distribusi ritel.",
    image: "/images/business/quality-assurance.jpg",
    imageAlt: "Business team monitoring quality assurance systems",
  },
  {
    title: "Penguat Ketahanan Ekosistem",
    description:
      "Kurikulum dan pendampingan mentor menyelaraskan visi bisnis dan penguasaan pengetahuan produk (product knowledge). Kesamaan visi ini menciptakan hubungan simbiotik dan ketergantungan strategis (Interdependence) yang sehat antara korporat dan mitra bisnis.",
    image: "/images/business/ecosystem-resilience.jpg",
    imageAlt: "Partners discussing ecosystem resilience and market data",
  },
];

export function BusinessPageContent() {
  return (
    <main className="business-design" id="main-content">
      <section className="business-hero" aria-labelledby="business-hero-title">
        <Image
          src="/images/business/business-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="business-hero-shade" aria-hidden="true" />
        <div className="business-hero-content">
          <h1 id="business-hero-title">BUILDING A CONNECTED BUSINESS FUTURE</h1>
          <p>
            An Integrated Business Ecosystem Driven by Intelligence,
            Collaboration, and Sustainable Growth.
          </p>
        </div>
      </section>

      <section className="business-model-section" aria-labelledby="business-model-title">
        <div className="business-section-intro">
          <SiteSectionHeading
            title="Our Business Model"
            description="One Ecosystem. Connected Opportunities."
            align="center"
            titleId="business-model-title"
          />
          <p>
            ZAS mengembangkan model bisnis yang mengintegrasikan aktivitas
            komersial, jaringan kemitraan, distribusi, dan pengelolaan
            informasi. Setiap elemen berperan dalam menciptakan alur bisnis
            yang saling terhubung, mulai dari pengadaan produk hingga
            pemenuhan kebutuhan pasar.
          </p>
          <p>
            Dengan pendekatan asset-light dan jaringan kemitraan yang
            terstruktur, ZAS berupaya membangun operasi yang adaptif,
            memperluas jangkauan pasar, dan mengoptimalkan pemanfaatan sumber
            daya.
          </p>
        </div>

        <div className="business-model-flow">
          {businessModels.map((model, index) => (
            <Fragment key={model.title}>
              <article className="business-model-card">
                <h3>{model.title}</h3>
                <p>{model.description}</p>
                <div className="business-model-card-image">
                  <Image src={model.image} alt={model.imageAlt} fill sizes="(max-width: 760px) 100vw, 276px" />
                </div>
                <Image
                  className="business-model-connector"
                  src="/images/business/model-connector.svg"
                  alt=""
                  width={73}
                  height={5}
                />
              </article>
              <span className="business-model-arrow" aria-hidden="true">
                <Image
                  src={`/images/business/model-arrow-${index + 1}.svg`}
                  alt=""
                  width={businessModelArrowWidths[index]}
                  height={37}
                />
              </span>
            </Fragment>
          ))}
          <div className="business-market" aria-label="Market">
            <Image src="/images/business/market-center.png" alt="" fill sizes="196px" />
            <span>MARKET</span>
          </div>
        </div>

        <div className="business-intelligence">
          <div>
            <h3>ECOSYSTEM INTELLIGENCE LAYER</h3>
            <p>
              Transforming business activity data into insights that support
              performance evaluation and informed decisions across the
              ecosystem.
            </p>
          </div>
          <div className="business-intelligence-image">
            <Image
              src="/images/business/intelligence-layer.png"
              alt="Connected business intelligence dashboard"
              fill
              sizes="(max-width: 760px) 100vw, 393px"
            />
          </div>
        </div>
      </section>

      <section className="business-units-section" aria-labelledby="business-units-title">
        <div className="business-units-copy">
          <h2 id="business-units-title">Business Units</h2>
          <p className="business-section-subtitle">Keep thing on track</p>
          <p className="business-section-description">
            Menjadi ekosistem bisnis terintegrasi yang menghubungkan produk,
            pelaku usaha, pasar, dan teknologi untuk menciptakan peluang
            pertumbuhan serta nilai tambah yang berkelanjutan.
          </p>
        </div>
        <div className="business-units-image">
          <Image
            src="/images/business/business-units.jpg"
            alt="Business team coordinating around a meeting table"
            fill
            sizes="(max-width: 900px) 100vw, 579px"
          />
        </div>
      </section>

      <section className="business-principles-section" aria-label="Business principles">
        <div className="business-principles-grid">
          {businessPrinciples.map((principle) => (
            <article className="business-principle" key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="business-triangle-section" aria-labelledby="business-triangle-title">
        <div className="business-triangle-feature">
          <div className="business-triangle-image">
            <Image
              src="/images/business/triangle-system.jpg"
              alt="Triangular architectural structure representing the Triangle System"
              fill
              sizes="(max-width: 900px) 100vw, 579px"
            />
          </div>
          <div className="business-triangle-copy">
            <h2 id="business-triangle-title">The Triangle System</h2>
            <p className="business-section-subtitle">Kerangka Kerja Strategis</p>
            <p className="business-section-description">
              Ekosistem bisnis ZAS dibangun di atas tiga pilar utama yang
              saling mengunci (Triangle System). Kerangka ini merupakan
              landasan ilmiah dari keberlanjutan arsitektur pasar cerdas yang
              dikembangkan perusahaan.
            </p>
          </div>
        </div>

        <div className="business-triangle-principles">
          {trianglePrinciples.map((principle) => (
            <article className="business-triangle-principle" key={principle.title}>
              <h3>
                {principle.title}
                <span>{principle.translation}</span>
              </h3>
              <h4>Konsep:</h4>
              <p>{principle.concept}</p>
              <h4>Perspektif Ilmiah:</h4>
              <p>{principle.perspective}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="business-stories-section" aria-label="Business ecosystem initiatives">
        {businessStories.map((story) => (
          <article className="business-story" key={story.title}>
            <div className="business-story-image">
              <Image
                src={story.image}
                alt={story.imageAlt}
                fill
                sizes="(max-width: 900px) 100vw, 579px"
              />
            </div>
            <div className="business-story-copy">
              <h2>{story.title}</h2>
              <p>{story.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="business-value-chain-section" aria-labelledby="business-value-title">
        <div className="business-value-chain-content">
          <SiteSectionHeading
            title="Business Value Chain Cycle"
            description="One Ecosystem. Connected Opportunities."
            align="center"
            titleId="business-value-title"
          />
          <p className="business-value-chain-description">
            Proses penciptaan nilai korporat dijalankan secara sirkular dan
            berkesinambungan melalui alur sistemik yang mengeliminasi fase
            penumpukan pasif, memastikan pergerakan produk yang dinamis:
          </p>
          <div className="business-value-chain-image">
            <Image
              src="/images/business/value-chain-cycle.jpg"
              alt="Business value chain cycle from planning and procurement through delivery, finance, and data-led decisions"
              fill
              sizes="(max-width: 1100px) 100vw, 1081px"
            />
          </div>
        </div>
      </section>

      <CtaBanner
        variant="home-design"
        image="/images/business/cta-background.jpg"
        imageAlt="City skyline at sunset"
      />
    </main>
  );
}
