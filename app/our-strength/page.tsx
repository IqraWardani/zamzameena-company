import { SectionHeading } from "@/components/section-heading";
import { strengthSections } from "@/data/company";

export const metadata = {
  title: "Our Strength",
  description: "Core strengths of Zamzameena: Smart Market, One Data Center, integrated distribution, and strategic ecosystem coordination.",
};

export default function OurStrengthPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Our strength"
        title="The strategic advantages that shape the business"
        description="Zamzameena’s strength comes from the way its business architecture combines intelligence, people, distribution, and data into a coordinated operating system."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {strengthSections.map((item) => (
          <article key={item.title} className="rounded-[1.7rem] border border-zinc-200 bg-white p-6">
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Strength</p>
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-zinc-950">{item.title}</h3>
            <p className="mt-4 text-sm leading-6 text-zinc-600">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-20 rounded-[2rem] border border-zinc-200 bg-zinc-950 p-8 text-zinc-100 sm:p-10">
        <SectionHeading
          eyebrow="Strategic position"
          title="Why the model matters"
          description="The architecture is designed to move the business from fragmented activity into a coherent commercial system with clearer decision support and stronger ecosystem alignment."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["Decision clarity", "A connected data layer supports better decisions across operations and commercial activity."],
            ["Faster coordination", "Partners and internal functions can respond with greater alignment and fewer disconnects."],
            ["Long-term resilience", "The operating model is designed for sustainable growth rather than short-term transaction velocity alone."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-zinc-50">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-zinc-300">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
