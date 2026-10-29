export type SiteNavigationItem =
  | { label: string; href: string; children?: never }
  | { label: string; href?: never; children: { label: string; href: string }[] };

export const siteNavigation: SiteNavigationItem[] = [
  { label: "Home", href: "/" },
  {
    label: "About",
    children: [
      { label: "Company Profile", href: "/about/company-profile" },
      { label: "Vision & Mission", href: "/about/vision-mission" },
      { label: "Corporate Goals", href: "/about/corporate-goals" },
      { label: "Certifications", href: "/about/certifications" },
      { label: "Business", href: "/about/business" },
      { label: "Technology", href: "/about/technology" },
    ],
  },
  {
    label: "Management",
    children: [
      { label: "Struktur", href: "/management/struktur" },
      { label: "Pendiri", href: "/management/pendiri" },
      { label: "Direksi", href: "/management/direksi" },
      { label: "SDM", href: "/management/sdm" },
    ],
  },
  {
    label: "Media",
    children: [
      { label: "Zamzameena Live", href: "/media/zamzameena-live" },
      { label: "Social Media", href: "/media/social-media" },
    ],
  },
  { label: "Marketing", href: "/marketing" },
  { label: "Career", href: "/career" },
  { label: "Contact", href: "/contact" },
];

export const companyContent = {
  name: "Zamzameena Ainsa Synergy",
  legalName: "PT Zamzameena Ainsa Synergy",
  description:
    "An intelligence business ecosystem connecting people, markets, and partners through shared insight and integrated operations.",
};

export const businessContent = {
  hero: {
    eyebrow: "Business",
    title: "Building a Connected Business Future",
    description:
      "An integrated ecosystem model connecting partners, commerce, and intelligence to unlock sustainable growth.",
    image: "/images/business-meeting-placeholder.svg",
    imageAlt: "Placeholder artwork for a collaborative business meeting",
  },
  models: [
    {
      title: "Partnership Network",
      description:
        "Bring producers, distributors, retailers, and business partners into a collaborative network built on shared opportunity.",
      image: "/images/partnership-network-placeholder.svg",
      imageAlt: "Placeholder artwork for a connected partnership network",
    },
    {
      title: "Distribution & Commerce",
      description:
        "Connect supply, distribution, and market access with coordinated operations designed to serve evolving customer needs.",
      image: "/images/distribution-commerce-placeholder.svg",
      imageAlt: "Placeholder artwork for connected distribution and commerce",
    },
    {
      title: "Ecosystem Intelligence",
      description:
        "Turn connected business information into clearer insight that supports timely, data-informed decisions.",
      image: "/images/intelligence-platform-placeholder.svg",
      imageAlt: "Placeholder artwork for an intelligence platform",
    },
  ],
  intelligence: [
    {
      title: "One Data Center",
      description:
        "A shared view of business information supports visibility across teams, partners, and operations.",
      image: "/images/data-center-placeholder.svg",
      imageAlt: "Placeholder artwork for a connected data center",
    },
    {
      title: "Market Insight",
      description:
        "Market signals help the ecosystem understand demand and identify relevant opportunities.",
      image: "/images/market-insight-placeholder.svg",
      imageAlt: "Placeholder artwork for market insight and analytics",
    },
    {
      title: "Connected Operations",
      description:
        "Coordinated processes link planning, supply, distribution, and customer feedback.",
      image: "/images/connected-operations-placeholder.svg",
      imageAlt: "Placeholder artwork for connected business operations",
    },
  ],
};

export const callToAction = {
  eyebrow: "Create What Comes Next",
  title: "Let's Build Opportunities Together",
  description:
    "Join us in shaping a more connected and collaborative business ecosystem.",
  buttonLabel: "Explore Our Business",
  href: "/about/business",
};

export const footerContent = {
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "Company Profile", href: "/about/company-profile" },
    { label: "Business", href: "/about/business" },
    { label: "Technology", href: "/about/technology" },
    { label: "Marketing", href: "/marketing" },
    { label: "Career", href: "/career" },
    { label: "Contact", href: "/contact" },
  ],
  connectLabel: "Connect",
  email: "[Add official company email]",
  socialLinks: [
    { label: "LinkedIn" },
    { label: "Instagram" },
  ],
};
