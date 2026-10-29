export type AboutStrategyPageContent = {
  slug: string;
  title: string;
  description: string;
  introductionTitle: string;
  introduction: string;
  sections: {
    title: string;
    label?: string;
    content: string;
  }[];
  closingTitle: string;
  closing: string;
};

export const visionMissionPage: AboutStrategyPageContent = {
  slug: "vision-mission",
  title: "Vision & Mission",
  description:
    "This page is prepared for Zamzameena Ainsa Synergy's approved vision and mission statements.",
  introductionTitle: "Our direction",
  introduction:
    "This page is prepared for the company's approved statements. The editable fields below are placeholders and are not official vision or mission statements.",
  sections: [
    {
      title: "Vision",
      label: "Approved statement pending",
      content: "[Insert the approved company vision statement here.]",
    },
    {
      title: "Mission",
      label: "Approved statement pending",
      content: "[Insert the approved company mission statement here.]",
    },
  ],
  closingTitle: "A connected business ecosystem",
  closing:
    "[Add approved copy explaining how the company's vision and mission connect with its business ecosystem.]",
};

export const corporateGoalsPage: AboutStrategyPageContent = {
  slug: "corporate-goals",
  title: "Corporate Goals",
  description:
    "Review a structured framework for Zamzameena Ainsa Synergy's corporate goals, with suggested categories pending approval.",
  introductionTitle: "Strategic priorities",
  introduction:
    "The categories below are suggestions for organizing company-approved objectives, not verified commitments. Replace each placeholder with an approved objective before publication.",
  sections: [
    {
      title: "Business ecosystem development",
      label: "Suggested category — confirm before publication",
      content:
        "[Insert an approved objective for business ecosystem development, if applicable.]",
    },
    {
      title: "Market connectivity",
      label: "Suggested category — confirm before publication",
      content:
        "[Insert an approved objective for market connectivity, if applicable.]",
    },
    {
      title: "Technology enablement",
      label: "Suggested category — confirm before publication",
      content:
        "[Insert an approved objective for technology enablement, if applicable.]",
    },
    {
      title: "Partnership development",
      label: "Suggested category — confirm before publication",
      content:
        "[Insert an approved objective for partnership development, if applicable.]",
    },
    {
      title: "Sustainable value creation",
      label: "Suggested category — confirm before publication",
      content:
        "[Insert an approved objective for sustainable value creation, if applicable.]",
    },
  ],
  closingTitle: "Moving forward",
  closing:
    "[Add an approved closing statement connecting the company's strategic objectives to its future direction.]",
};
