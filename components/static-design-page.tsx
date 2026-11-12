import { readFileSync } from "node:fs";
import { join } from "node:path";

type StaticDesignPageProps = {
  fileName: "struktur.html";
  useSiteChrome?: boolean;
};

const routeRewrites = [
  [/href="index\.html(?=[#"])/g, 'href="/'],
  [/href="tentang\.html(?=[#"])/g, 'href="/about/company-profile'],
  [/href="struktur\.html(?=[#"])/g, 'href="/management/struktur'],
  [/href="hubungi\.html(?=[#"])/g, 'href="/contact'],
  [/(src|href)="assets\//g, '$1="/assets/'],
  [/src="photos\//g, 'src="/photos/'],
] as const;

export function StaticDesignPage({
  fileName,
  useSiteChrome = false,
}: StaticDesignPageProps) {
  const source = (() => {
    switch (fileName) {
      case "struktur.html":
        return readFileSync(join(process.cwd(), "struktur.html"), "utf8");
    }
  })();
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (!body) {
    throw new Error(`Could not find a body element in ${fileName}.`);
  }

  const content = useSiteChrome
    ? body
        .replace(/<a class="skip-link"[^>]*>[\s\S]*?<\/a>/i, "")
        .replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, "")
        .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, "")
        .replace(/<main id="main"/i, '<main id="main-content"')
        .replace(
          /<nav class="side-nav"[^>]*>([\s\S]*?)<\/nav>/i,
          (_match, navContent: string) => {
            const themeToggle = navContent.match(
              /<button class="theme-toggle"[\s\S]*?<\/button>/i,
            )?.[0];

            if (!themeToggle) {
              throw new Error(`Could not find the appearance toggle in ${fileName}.`);
            }

            return `<div class="side-nav" aria-label="Appearance controls">${themeToggle}</div>`;
          },
        )
    : body;
  const html = routeRewrites.reduce(
    (content, [pattern, replacement]) => content.replace(pattern, replacement),
    content,
  );

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
