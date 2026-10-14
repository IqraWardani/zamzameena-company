type SiteSectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
  titleId?: string;
};

export function SiteSectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
  titleId,
}: SiteSectionHeadingProps) {
  return (
    <div className={`zas-section-heading is-${align}${light ? " is-light" : ""}`}>
      {eyebrow ? <p className="zas-eyebrow">{eyebrow}</p> : null}
      <h2 id={titleId}>{title}</h2>
      {description ? <p className="zas-section-description">{description}</p> : null}
    </div>
  );
}
