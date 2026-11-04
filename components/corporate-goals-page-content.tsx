import Image from "next/image";
import { CtaBanner } from "@/components/cta-banner";

const goalPhases = [
  {
    title: "Jangka Pendek",
    subtitle: "(Fase Fondasi)",
    goals: [
      {
        title: "Infrastruktur Terpusat:",
        description:
          "Menyatukan operasional ke dalam sistem One Data Center.",
      },
      {
        title: "Standardisasi Kemitraan:",
        description:
          "Membentuk standar rekrutmen dan pembinaan terpusat bagi ZMA & ZAP.",
      },
      {
        title: "Validasi Produk:",
        description:
          "Peluncuran lini produk dengan elastisitas permintaan dan margin usaha yang sehat.",
      },
    ],
  },
  {
    title: "Jangka Menengah",
    subtitle: "(Fase Skalabilitas)",
    goals: [
      {
        title: "Akselerasi Mentransformasi Private 80% Label:",
        description:
          "portofolio distribusi menjadi Brand Entity eksklusif.",
      },
      {
        title: "Otomatisasi Data:",
        description:
          "Implementasi BI & CRM penuh untuk eksekusi Data-Driven Marketing.",
      },
      {
        title: "Ekspansi Omnichannel:",
        description:
          "Memperluas penetrasi pasar via jaringan ZMA & ZAP secara efisien.",
      },
    ],
  },
  {
    title: "Jangka Panjang",
    subtitle: "(Fase Kepemimpinan Ekosistem)",
    goals: [
      {
        title: "Kepemimpinan Ekosistem:",
        description:
          "Menjadi Ecosystem Builder terdepan yang dikendalikan oleh AI Decision System.",
      },
      {
        title: "Co-Creation of Value:",
        description:
          "Mewujudkan kemandirian finansial dan kesejahteraan bagi seluruh entitas (Produsen hingga ZFR).",
      },
      {
        title: "Portofolio Nasional:",
        description:
          "Penetrasi pasar masif dengan produk komoditas strategis bernilai tinggi lintas wilayah.",
      },
    ],
  },
];

export function CorporateGoalsPageContent() {
  return (
    <main className="home-design corporate-goals-page" id="main-content">
      <section
        className="corporate-goals-hero"
        aria-labelledby="corporate-goals-title"
      >
        <div className="corporate-goals-hero-content">
          <h1 id="corporate-goals-title">CORPORATE GOALS</h1>
          <p>
            Our corporate goals define the direction of our growth, strengthen
            our commitment to sustainable value creation, and guide every step
            towards building an interconnected and resilient business ecosystem.
          </p>
        </div>
      </section>

      <section
        className="corporate-goals-content"
        aria-label="Corporate goals and business priorities"
      >
        <div className="corporate-goals-overview">
          <div className="corporate-goals-overview-copy">
            <div>
              <h2>Business Units</h2>
              <p className="corporate-goals-tagline">Keep thing on track</p>
            </div>
            <p className="corporate-goals-overview-description">
              Menjadi ekosistem bisnis terintegrasi yang menghubungkan produk,
              pelaku usaha, pasar, dan teknologi untuk menciptakan peluang
              pertumbuhan serta nilai tambah yang berkelanjutan.
            </p>
          </div>
          <Image
            className="corporate-goals-overview-image"
            src="/images/figma/corporate-goals-business-units.jpg"
            alt="Business leaders meeting around a table"
            width={1376}
            height={768}
            sizes="(max-width: 900px) calc(100vw - 44px), 579px"
            unoptimized
          />
        </div>

        <div className="corporate-goals-timeline">
          <div className="corporate-goals-phase-list">
            {goalPhases.map((phase) => (
              <section
                className="corporate-goals-phase"
                aria-label={`${phase.title} ${phase.subtitle}`}
                key={phase.title}
              >
                <h2>
                  <span>{phase.title}</span>
                  <span>{phase.subtitle}</span>
                </h2>
                <ul>
                  {phase.goals.map((goal) => (
                    <li key={goal.title}>
                      <strong>{goal.title}</strong>
                      <span>{goal.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        variant="home-design"
        image="/images/figma/corporate-goals-cta.jpg"
        imageAlt=""
      />
    </main>
  );
}
