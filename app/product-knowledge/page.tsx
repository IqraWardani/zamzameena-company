import { SectionHeading } from "@/components/section-heading";
import { productCategories } from "@/data/company";

export const metadata = {
  title: "Product Knowledge",
  description: "Product knowledge and ecosystem understanding for Zamzameena’s business architecture and commercial positioning.",
};

export default function ProductKnowledgePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Product knowledge"
        title="Understanding the products inside the ecosystem"
        description="This section holds product context, positioning, and category understanding so the ecosystem can be communicated with greater clarity and consistency."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {productCategories.map((product) => (
          <article key={product.name} className="overflow-hidden rounded-[1.8rem] border border-zinc-200 bg-white">
            <div className="h-52 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }} />
            <div className="p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{product.category}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">{product.name}</h3>
              <p className="mt-4 text-base leading-7 text-zinc-600">{product.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-20 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 sm:p-10">
        <SectionHeading
          eyebrow="Knowledge discipline"
          title="Product understanding should support the wider business logic"
          description="Each product line becomes clearer when paired with commercial positioning, partner readiness, and value-chain alignment."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["Category clarity", "Reliable positioning reduces confusion across supply, market, and demand activities."],
            ["Commercial relevance", "Each product must be understood in the context of customer need and market fit."],
            ["Ecosystem fit", "Product knowledge should align with operations, distribution, and partner capability."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[1.5rem] border border-zinc-200 bg-white p-6">
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-zinc-950">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
