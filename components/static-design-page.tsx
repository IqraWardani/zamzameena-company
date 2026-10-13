import { readFileSync } from "node:fs";
import { join } from "node:path";

type StaticDesignPageProps = {
  fileName: "struktur.html" | "hubungi.html";
};

const routeRewrites = [
  [/href="index\.html(?=[#"])/g, 'href="/'],
  [/href="tentang\.html(?=[#"])/g, 'href="/about'],
  [/href="struktur\.html(?=[#"])/g, 'href="/our-strength'],
  [/href="hubungi\.html(?=[#"])/g, 'href="/contact'],
  [/(src|href)="assets\//g, '$1="/assets/'],
  [/src="photos\//g, 'src="/photos/'],
] as const;

export function StaticDesignPage({ fileName }: StaticDesignPageProps) {
  const source = (() => {
    switch (fileName) {
      case "struktur.html":
        return readFileSync(join(process.cwd(), "struktur.html"), "utf8");
      case "hubungi.html":
        return readFileSync(join(process.cwd(), "hubungi.html"), "utf8");
    }
  })();
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (!body) {
    throw new Error(`Could not find a body element in ${fileName}.`);
  }

  const html = routeRewrites.reduce(
    (content, [pattern, replacement]) => content.replace(pattern, replacement),
    body,
  );

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
