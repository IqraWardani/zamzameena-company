import Image from "next/image";
import { CtaBanner } from "@/components/cta-banner";

const missionStatements = [
  "Membangun dan mengomersialkan merek lokal berkemampuan daya saing tinggi.",
  "Mengakselerasi pengembangan produk melalui sistem rebranding dan private label yang efisien.",
  "Membangun infrastruktur distribusi omnichannel yang responsif, efisien, dan scalable.",
  "Mengembangkan portofolio produk strategis unggulan secara berkesinambungan.",
  "Memberikan nilai tambah yang berkelanjutan bagi produsen, mitra area (ZAP), master afiliasi (ZMA), hingga perwakilan garis depan (ZFR).",
  "Mewujudkan tata kelola bisnis berbasis Data-Driven Decision Making dan Teknologi Integrasi Digital Tingkat Lanjut.",
];

export function VisionMissionPageContent() {
  return (
    <main className="home-design vision-mission-page" id="main-content">
      <section
        className="vision-mission-hero"
        aria-labelledby="vision-mission-title"
      >
        <Image
          src="/images/figma/vision-mission-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="vision-mission-hero-shade" aria-hidden="true" />
        <div className="vision-mission-hero-content">
          <h1 id="vision-mission-title">
            <span>VISION</span>
            <span>AND MISSION</span>
          </h1>
          <p>The Principles Behind Our Business Ecosystem</p>
        </div>
      </section>

      <section
        className="vision-mission-intro"
        aria-label="Vision and mission introduction"
      >
        <blockquote>
          <p>
            &ldquo;Di Zamzameena Ainsa Synergy, kami percaya bahwa pertumbuhan
            berkelanjutan berawal dari visi yang jelas dan tujuan yang kuat.
            Visi dan misi menjadi landasan dalam setiap langkah, strategi,
            inovasi, dan kolaborasi yang kami bangun untuk menciptakan nilai
            tambah serta mengembangkan ekosistem bisnis yang saling terhubung
            dan berkelanjutan.&rdquo;
          </p>
        </blockquote>
        <div
          className="vision-mission-intro-divider"
          aria-hidden="true"
        />
      </section>

      <section className="vision-mission-statements">
        <div className="vision-mission-statements-inner">
          <section
            className="vision-mission-row"
            aria-labelledby="our-vision-title"
          >
            <h2 id="our-vision-title">Our Vision</h2>
            <p>
              &ldquo;Menjadi korporasi pelopor pencipta ekosistem bisnis
              terintegrasi berbasis Intelligence Business Model yang
              mengoordinasikan pilar Interdependence, Platform-Centric, dan
              Co-Creation of Value secara berkelanjutan.&rdquo;
            </p>
          </section>

          <div
            className="vision-mission-section-divider"
            aria-hidden="true"
          />

          <section
            className="vision-mission-row"
            aria-labelledby="our-mission-title"
          >
            <h2 id="our-mission-title">Our Mission</h2>
            <ul>
              {missionStatements.map((statement) => (
                <li key={statement}>{statement}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <CtaBanner
        variant="home-design"
        image="/images/figma/vision-mission-cta.jpg"
        imageAlt=""
      />
    </main>
  );
}
