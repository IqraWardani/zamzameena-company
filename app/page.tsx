import Link from "next/link";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { SectionHeading } from "@/components/section-heading";
import { companyProfile, heroSlides, productCategories, strengthSections } from "@/data/company";

export default function Home() {
  return (
    <>
      <HeroSlideshow slides={heroSlides} />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <SectionHeading
            eyebrow="PT Zamzameena Ainsa Synergy"
            title="An intelligence business ecosystem built for sustainable value"
            description="Zamzameena develops an integrated business architecture centered on market intelligence, strategic partnership, and coordinated execution across supply, distribution, and customer value creation."
          />
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-[0_18px_50px_rgba(24,24,27,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Brand</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-zinc-950">{companyProfile.brand}</h3>
            <p className="mt-4 text-base leading-7 text-zinc-600">{companyProfile.shortDescription}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Core idea</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-4xl">One ecosystem. Multiple capabilities.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {["Product", "Market", "Technology", "People", "Data"].map((item) => (
                <div key={item} className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-800">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Business flow"
          title="Producer → Zamzameena → Distributor / Partner → Customer"
          description="The architecture moves from upstream supply to ecosystem coordination and end-user value delivery, supported by intelligence and action-oriented decision making."
        />

        <div className="mt-12 rounded-[2rem] border border-zinc-200 bg-white p-8 sm:p-10">
          <div className="grid gap-5 md:grid-cols-4">
            {["Producer", "Zamzameena", "Distributor / Partner", "Customer"].map((item, index) => (
              <div key={item} className="flex flex-col items-center text-center">
                {index > 0 ? <div className="mb-4 h-px w-12 bg-zinc-300 md:mb-0 md:mt-8 md:w-full" /> : null}
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 text-sm font-medium text-zinc-900">{item}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.22em] text-zinc-600">
            {["Data", "Intelligence", "Decision", "Action"].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2">{item}</span>
                {index < 3 ? <span className="text-zinc-300">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-950 py-20 text-zinc-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Core strengths"
            title="Smart Market, One Data Center, and integrated distribution"
            description="The company architecture combines intelligence, strategy, and partnership to build sustainable commercial growth."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {strengthSections.slice(0, 8).map((item) => (
              <div key={item.title} className="rounded-[1.6rem] border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Strength</p>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-zinc-50">{item.title}</h3>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-start">
            <Link href="/our-strength" className="inline-flex rounded-full bg-white px-6 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-900">
              Explore Our Strength
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Product knowledge"
              title="Understanding the products inside the ecosystem"
              description="Product information is curated with the same disciplined approach as the wider business architecture: clear positioning, verified context, and a clear market role."
            />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {productCategories.map((product) => (
              <div key={product.name} className="overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white">
                <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }} />
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{product.category}</p>
                  <h3 className="mt-3 text-lg font-semibold tracking-[-0.04em] text-zinc-950">{product.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{product.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10">
          <Link href="/product-knowledge" className="inline-flex rounded-full border border-zinc-300 bg-white px-6 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-900">
            Explore Product Knowledge
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-8 text-zinc-100 sm:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Partnership</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">Let’s build value together.</h2>
            </div>
            <Link href="/contact" className="inline-flex rounded-full bg-white px-6 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-900">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
