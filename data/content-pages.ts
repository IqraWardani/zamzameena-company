import type { BreadcrumbItem } from "@/components/breadcrumbs";

export type StandardPageContent = {
  title: string;
  eyebrow: string;
  description: string;
  sectionTitle: string;
  sectionDescription: string;
  placeholder: string;
  breadcrumbs: BreadcrumbItem[];
};

const homeBreadcrumb = { label: "Home", href: "/" };

export const certificationsPage: StandardPageContent = {
  title: "Certifications",
  eyebrow: "About",
  description: "Verified company certifications and supporting information will be presented in this section.",
  sectionTitle: "Certification information",
  sectionDescription: "This space is prepared for approved certification details and documents.",
  placeholder: "Official certification information has not yet been provided. Add verified details and supporting documents here.",
  breadcrumbs: [
    homeBreadcrumb,
    { label: "About", href: "/about/company-profile" },
    { label: "Certifications" },
  ],
};

export const managementPages: Record<string, StandardPageContent> = {
  struktur: {
    title: "Struktur",
    eyebrow: "Management",
    description: "Organization structure information will be added when official details are available.",
    sectionTitle: "Organization structure",
    sectionDescription: "Use this section for the approved organization structure and role descriptions.",
    placeholder: "No organization chart or verified role information has been provided yet.",
    breadcrumbs: [
      homeBreadcrumb,
      { label: "Management", href: "/management/struktur" },
      { label: "Struktur" },
    ],
  },
  founder: {
    title: "Founder",
    eyebrow: "Management",
    description: "Founder information will be presented here using approved company biographies.",
    sectionTitle: "Founder profiles",
    sectionDescription: "This space is reserved for verified founder profiles and approved statements.",
    placeholder: "Founder details for this page have not yet been provided.",
    breadcrumbs: [
      homeBreadcrumb,
      { label: "Management", href: "/management/struktur" },
      { label: "Founder" },
    ],
  },
  direksi: {
    title: "Direksi",
    eyebrow: "Management",
    description: "Director information will be presented here once approved for publication.",
    sectionTitle: "Director profiles",
    sectionDescription: "Use this section for approved director biographies and role information.",
    placeholder: "Verified director details have not yet been provided.",
    breadcrumbs: [
      homeBreadcrumb,
      { label: "Management", href: "/management/struktur" },
      { label: "Direksi" },
    ],
  },
  sdm: {
    title: "SDM",
    eyebrow: "Management",
    description: "Information about people and human resources will be added when approved content is available.",
    sectionTitle: "People and human resources",
    sectionDescription: "This space can hold official information about the company's people and human resources.",
    placeholder: "Approved people and human resources information has not yet been provided.",
    breadcrumbs: [
      homeBreadcrumb,
      { label: "Management", href: "/management/struktur" },
      { label: "SDM" },
    ],
  },
};

export const marketingPage: StandardPageContent = {
  title: "Marketing",
  eyebrow: "Marketing",
  description: "Company-approved marketing information and materials will be added here.",
  sectionTitle: "Marketing information",
  sectionDescription: "This page is ready for verified company messaging, materials, and contact information.",
  placeholder: "Approved marketing content has not yet been provided.",
  breadcrumbs: [homeBreadcrumb, { label: "Marketing" }],
};

export const careerPage: StandardPageContent = {
  title: "Career",
  eyebrow: "Career",
  description: "Career opportunities and application information will be shared here when available.",
  sectionTitle: "Career opportunities",
  sectionDescription: "Use this section for current openings and verified application instructions.",
  placeholder: "There are no approved job listings or application details to display yet.",
  breadcrumbs: [homeBreadcrumb, { label: "Career" }],
};
