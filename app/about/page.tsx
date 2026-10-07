import { SectionHeading } from "@/components/section-heading";
import { companyProfile, valueChain } from "@/data/company";

export const metadata = {
  title: "About Zamzameena",
  description: "About Zamzameena and its intelligence business ecosystem model built around interdependence, platform thinking, and value creation.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="About Zamzameena" title="About Zamzameena" description="Building an Intelligence Business Ecosystem." />

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Who we are</p>
          <p className="mt-6 text-lg leading-8 text-zinc-700">{companyProfile.name} develops an intelligence business model focused on ecosystem coordination, data-led decision-making, and sustainable commercial growth.</p>
          <p className="mt-5 text-base leading-7 text-zinc-600">
            The business architecture connects producers, partners, distribution networks, and customers within a shared value system designed to improve coordination and strategic execution.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-900">
          <div className="h-full min-h-[280px] bg-cover bg-center" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80)" }} />
        </div>
      </div>

      <div className="mt-20">
        <SectionHeading eyebrow="Our business philosophy" title="The Triangle System" description="The business philosophy is centered on three core principles that define the operating logic behind Zamzameena’s ecosystem." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["Interdependence", "Business value is created through connected relationships and mutual reliance across the ecosystem."],
            ["Platform-Centric", "Shared infrastructure, coordination, and information flow support commercial agility and better decisions."],
            ["Co-Creation of Value", "Partners, users, and operating teams participate in value creation instead of acting in isolation."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[1.7rem] border border-zinc-200 bg-white p-7">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Principle</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">{title}</h3>
              <p className="mt-4 text-base leading-7 text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-20 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 sm:p-10">
        <SectionHeading
          eyebrow="Our approach"
          title="A lean, intelligent, and partnership-driven model"
          description="The architecture is designed to remain flexible, data-led, and ecosystem-oriented across both supply and market activity."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Asset-Light Business Model", "A structure designed to reduce heavy operational dependence while preserving scale potential."],
            ["Strategic Trading", "Commercial decisions are informed by market flow, alignment, and demand patterns."],
            ["Integrated Distribution", "Upstream supply, ZAS coordination, and downstream market access work in a connected flow."],
            ["Technology-enabled operations", "Data, BI, AI, and operational coordination support faster decisions and clearer visibility."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[1.5rem] border border-zinc-200 bg-white p-6">
              <h3 className="text-lg font-semibold tracking-[-0.04em] text-zinc-950">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-20">
        <SectionHeading eyebrow="Business value chain" title="The circular value system" description="The model is built around a continuous feedback loop between planning, operations, commercial execution, and strategic learning." />
        <div className="mt-12 rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {valueChain.map((step, index) => (
              <div key={`${step}-${index}`} className="flex items-center gap-3">
                <div className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-900">{step}</div>
                {index < valueChain.length - 1 ? <span className="text-zinc-300">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-20 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Vision / Mission</p>
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Vision</p>
              <p className="mt-2 text-base leading-7 text-zinc-700">
                [ DRAFT — Replace with official company statement ] To build a trusted intelligence business ecosystem that creates sustainable value across market, technology, and partnership.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Mission</p>
              <p className="mt-2 text-base leading-7 text-zinc-700">
                [ DRAFT — Replace with official company statement ] To coordinate business participation across data, product, distribution, and partner capability in a disciplined and scalable way.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-8 text-zinc-100 sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Leadership</p>
          <div className="mt-6 flex items-center gap-4">
            <div
              className="h-16 w-16 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 bg-cover bg-center"
              style={{ backgroundImage: "url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80)" }}
            />
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-50">[FOUNDER NAME — REPLACE WITH OFFICIAL DATA]</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">Founder / Strategic Director</p>
            </div>
          </div>
          <p className="mt-6 text-base leading-7 text-zinc-300">[OFFICIAL BIO REQUIRED] The founder profile should be replaced with verified leadership information once the official data is available.</p>
        </div>
      </div>

      <div className="mt-20 rounded-[2rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>DRAFT — Proposed Organizational Structure</strong> Founder / Shareholders → Strategic Direction → Executive Management → Business Development / Technology & Intelligence / Operations & Distribution / Finance / Marketing /
        Partnership & Akademi.
      </div>
    </div>
  );
}
