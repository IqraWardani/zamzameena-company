import Image from "next/image";
import { CtaBanner } from "@/components/cta-banner";
import { FounderCard } from "@/components/founder-card";
import { SiteFrame } from "@/components/site-frame";

const founders = [
  {
    name: "M. RAFI’I ZULKARNAEN RAMLI",
    title: "FOUNDER",
    bio: '"Sebagai orkestrator ekosistem bisnis cerdas, Zamzameena Ainsa Synergy mengintegrasikan arsitektur digital tingkat lanjut dengan resiliensi rantai pasok melalui pendekatan Asset-Light berbasis maha-data. Kami merevolusi paradigma distribusi konvensional menjadi ekosistem kolaboratif (co-creation of value) yang adaptif. Komitmen kami adalah mengakselerasi transformasi operasional secara end- to-end untuk menciptakan pertumbuhan berskala eksponensial dan memberikan dampak sosio-ekonomi berkelanjutan bagi seluruh pemangku kepentingan."',
    image: "/images/figma/founder-001.webp",
    imageAlt: "M. Rafi’i Zulkarnaen Ramli, founder",
  },
  // {
  //   name: "TEEJE TAUFIK JANKE",
  //   title: "FOUNDER",
  //   bio: '"Transformasi operasional kami mencapai titik optimal. Perusahaan PT Zamzameena Ainsa Synergy (ZAS) yang kami dirikan. Sebagai entitas bisnis progresif, ZAS membawa kami keluar dari batasan model bisnis konvensional melalui penerapan Intelligence Business Model dan integrasi sistem digital yang tanpa celah. Perusahaan kami tidak sekadar menyediakan teknologi, melainkan membangun sebuah Intelligence Business Ecosystem yang menyatukan seluruh pilar strategis perusahaan kami. Hasilnya sangat nyata, kini Ekosistem kami, menikmati efisiensi operasional yang luar biasa dan memiliki fondasi ekosistem cerdas yang sangat siap untuk mencapai skalabilitas bisnis secara maksimal dimasa depan."',
  //   image: "/images/figma/founder-02.webp",
  //   imageAlt: "Teeje Taufik Janke, founder",
  // },
  {
    name: "IQRA WARDANI",
    title: "FOUNDER",
    bio: "“Dari perspektif teknologi, Zamzameena dibangun dengan gagasan bahwa sebuah ekosistem bisnis modern membutuhkan lebih dari sekadar digitalisasi proses. Kami merancang fondasi teknologi yang menghubungkan data, operasional, distribusi, dan pengambilan keputusan dalam satu ekosistem yang terintegrasi. Dengan pendekatan berbasis data, analitik, dan otomasi, teknologi ditempatkan sebagai penggerak utama untuk menciptakan proses bisnis yang lebih adaptif, efisien, dan scalable.”",
    image: "/images/figma/founder-03.webp",
    imageAlt: "Iqra Wardani, founder",
  },
] as const;

export function FounderPageContent() {
  return (
    <SiteFrame variant="home-design">
      <main className="zas-founder-page" id="main-content">
        <section className="zas-founder-hero" aria-labelledby="founder-page-title">
          <Image className="zas-founder-hero-image" src="/images/figma/founder-hero.png" alt="" fill priority sizes="100vw" />
          <div className="zas-founder-hero-shade" aria-hidden="true" />
          <div className="zas-founder-hero-content">
            <h1 id="founder-page-title">FOUNDERS</h1>
            <p>Behind every meaningful ecosystem is a vision, a shared purpose, and the courage to build something greater. Meet the people shaping the future of Zamzameena Ainsa Synergy.</p>
          </div>
        </section>

        <section className="zas-founder-story-section" aria-labelledby="founder-story-title">
          <div className="zas-founder-story-inner">
            <h2 id="founder-story-title">The Vision Behind Zamzameena</h2>
            <div className="zas-founder-story-list">
              {founders.map((founder, index) => (
                <FounderCard founder={founder} index={index} key={founder.name} variant="profile" />
              ))}
            </div>
          </div>
        </section>

        <CtaBanner image="/images/figma/founder-cta.jpg" imageAlt="" variant="home-design" />
      </main>
    </SiteFrame>
  );
}
