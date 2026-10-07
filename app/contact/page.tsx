import { SectionHeading } from "@/components/section-heading";
import { companyProfile } from "@/data/company";

export const metadata = {
  title: "Contact",
  description: "Contact Zamzameena for partnership, business discussion, and ecosystem collaboration opportunities.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Contact" title="Let’s build value together." description="The official contact details below are placeholders and should be replaced with verified company information before production deployment." />

      <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Get in touch</p>
          <div className="mt-6 space-y-5">
            {[
              ["Email", companyProfile.email],
              ["Phone", companyProfile.phone],
              ["WhatsApp", companyProfile.whatsapp],
              ["Address", companyProfile.address],
              ["Social Media", "[OFFICIAL SOCIAL MEDIA — REPLACE]"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                <p className="mt-3 text-base leading-7 text-zinc-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-8 text-zinc-100 sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Send inquiry</p>
          <form className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-400">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="company" className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-400">
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
                placeholder="Company name"
              />
            </div>
            <div>
              <label htmlFor="message" className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-400">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
                placeholder="Tell us about your interest"
              />
            </div>
            <button type="submit" className="inline-flex rounded-full bg-white px-6 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-900">
              Send Inquiry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
