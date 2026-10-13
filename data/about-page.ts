import { homePageContent } from "@/data/home-page";

const founderDetails = [
  {
    name: "M. Rafi'i Zulkarnaen Ramli",
    title: "Founder",
    bio: "“Sebagai orkestrator ekosistem bisnis cerdas, Zamzameena Ainsa Synergy mengintegrasikan arsitektur digital tingkat lanjut dengan resiliensi rantai pasok melalui pendekatan Asset-Light berbasis maha-data. Kami merevolusi paradigma distribusi konvensional menjadi ekosistem kolaboratif (co-creation of value) yang adaptif. Komitmen kami adalah mengakselerasi transformasi operasional secara end-to-end untuk menciptakan pertumbuhan berskala eksponensial dan memberikan dampak sosio-ekonomi berkelanjutan bagi seluruh pemangku kepentingan.”",
  },
  {
    name: "Teeje Taufik Janke",
    title: "Founder",
    bio: "“Transformasi operasional kami mencapai titik optimal. Perusahaan PT Zamzameena Ainsa Synergy (ZAS) yang kami dirikan. Sebagai entitas bisnis progresif, ZAS membawa kami keluar dari batasan model bisnis konvensional melalui penerapan Intelligence Business Model dan integrasi sistem digital yang tanpa celah. Perusahaan kami tidak sekadar menyediakan teknologi, melainkan membangun sebuah Intelligence Business Ecosystem yang menyatukan seluruh pilar strategis perusahaan kami. Hasilnya sangat nyata, kini ekosistem kami menikmati efisiensi operasional yang luar biasa dan memiliki fondasi ekosistem cerdas yang sangat siap untuk mencapai skalabilitas bisnis secara maksimal di masa depan.”",
  },
  {
    name: "Iqra Wardani",
    title: "Founder",
    bio: "“Dari perspektif teknologi, Zamzameena dibangun dengan gagasan bahwa sebuah ekosistem bisnis modern membutuhkan lebih dari sekadar digitalisasi proses. Kami merancang fondasi teknologi yang menghubungkan data, operasional, distribusi, dan pengambilan keputusan dalam satu ekosistem yang terintegrasi. Dengan pendekatan berbasis data, analitik, dan otomasi, teknologi ditempatkan sebagai penggerak utama untuk menciptakan proses bisnis yang lebih adaptif, efisien, dan scalable.”",
  },
  {
    name: "Unirma M. Taufik",
    title: "Direktur Operasional",
    bio: "“Sinergi ekosistem pasar terbukti menciptakan efisiensi dan pertumbuhan bisnis yang menyeluruh bagi pelaku usaha, pembeli B2B, hingga mitra strategis melalui integrasi layanan dalam satu platform transparan. Dengan terhubungnya sistem pembayaran dan rantai pasok secara otomatis, para tenant dapat memangkas kerumitan operasional harian dan fokus mendongkrak omzet, sementara pembeli korporat menikmati kemudahan akses ke pemasok tepercaya dengan harga kompetitif dan administrasi penagihan yang terpusat. Di saat yang sama, ekosistem ini memberikan kepastian volume transaksi bagi mitra logistik, yang memungkinkan mereka menekan biaya operasional secara signifikan dan mempercepat durasi pengiriman kepada konsumen akhir.”",
  },
  {
    name: "Muhammad Asyraf",
    title: "Direktur Investasi & Kewilayahan",
    bio: "“Berinvestasi dalam ekosistem pasar yang terukur mengubah pendekatan kami dari sekadar spekulasi menjadi strategi presisi berbasis data. Kami kini dapat memantau pergerakan operasional, tren transaksi, hingga pencapaian ROI secara real-time, sehingga risiko bisnis dapat dimitigasi dengan cepat sebelum menjadi kerugian. Transparansi dan kendali penuh ini memastikan setiap modal yang kami tanamkan bekerja jauh lebih cerdas, efisien, dan memberikan kepastian hasil yang optimal.”",
  },
];

const mission =
  "ZAS mengintegrasikan aktivitas bisnis, jaringan kemitraan, distribusi, dan data dalam satu ekosistem yang saling terhubung. Dengan memanfaatkan data sebagai dasar pengambilan keputusan, setiap entitas dalam jaringan dapat memahami peluang, merespons kebutuhan pasar, mengoptimalkan aktivitas bisnis, dan menciptakan nilai tambah secara lebih terukur dan berkelanjutan.";

const vision =
  "Menjadi ekosistem bisnis terintegrasi yang menghubungkan produk, pelaku usaha, pasar, dan teknologi untuk menciptakan peluang pertumbuhan serta nilai tambah yang berkelanjutan.";

export const aboutPageContent = {
  hero: {
    title: "ABOUT ZAMZAMEENA",
    subtitle: "The Principles Behind Our Business Ecosystem",
    description:
      "Zamzameena Ainsa Synergy dibangun dengan keyakinan bahwa pertumbuhan bisnis tidak hanya bergantung pada produk, tetapi juga pada kemampuan menghubungkan pasar, membangun kemitraan, dan memanfaatkan informasi untuk menciptakan peluang yang lebih besar.",
    image: "/images/figma/about-hero.webp",
    imageAlt: "Tim bisnis berdiskusi di ruang rapat dengan layar analisis perusahaan",
  },
  identity: {
    title: "A Business Ecosystem, Built on Connectivity",
    subtitle: "Our Identity",
    description: mission,
    image: "/images/figma/about-identity.webp",
    imageAlt: "Para pemimpin bisnis berdiskusi mengelilingi meja rapat",
  },
  direction: {
    title: "Building a Connected Business Future",
    subtitle: "Where We Are Heading",
    description: vision,
    image: "/images/figma/about-direction.webp",
    imageAlt: "Tangan menggunakan laptop dengan dashboard analitik bisnis",
  },
  philosophy: {
    eyebrow: "Our Business Philosophy",
    title: "Principles That Shape Our Ecosystem",
    subtitle: "What Guides Us",
    principles: [
      {
        title: "Connected Growth",
        description:
          "Pertumbuhan bisnis dibangun melalui hubungan yang saling mendukung antara perusahaan, mitra, distributor, dan pasar.",
        image: "/images/figma/about-principle-01.webp",
        imageAlt: "Tim bisnis mengamati dashboard analitik di ruang rapat",
      },
      {
        title: "Collaborative Value Creation",
        description:
          "Setiap hubungan bisnis diarahkan untuk menciptakan nilai yang bermanfaat bagi pihak-pihak yang terlibat dalam ekosistem.",
        image: "/images/figma/about-principle-02.webp",
        imageAlt: "Dua mitra bisnis berjabat tangan menandai kolaborasi",
      },
      {
        title: "Intelligence-Driven Decisions",
        description:
          "Data dan informasi digunakan untuk membantu memahami kondisi pasar, mengevaluasi peluang, dan mendukung pengambilan keputusan bisnis.",
        image: "/images/figma/about-principle-03.webp",
        imageAlt: "Peserta rapat bisnis meninjau presentasi bersama",
      },
    ],
  },
  founders: {
    title: "Founders",
    subtitle: "The Vision Behind Zamzameena",
    people: homePageContent.founders.people.map((founder, index) => ({
      ...founder,
      ...founderDetails[index],
      imageAlt: `Potret ${founderDetails[index].name}, ${founderDetails[index].title} Zamzameena Ainsa Synergy`,
    })),
  },
};
