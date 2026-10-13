type SiteSectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
};

export function SiteSectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
}: SiteSectionHeadingProps) {
  return (
    <div className={`zas-section-heading is-${align}${light ? " is-light" : ""}`}>
      <p className="zas-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p className="zas-section-description">{description}</p> : null}
    </div>
  );
}
