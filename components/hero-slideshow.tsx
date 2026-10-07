"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { heroSlides } from "@/data/company";

type HeroSlide = (typeof heroSlides)[number];

export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative isolate overflow-hidden bg-zinc-950">
      <div className="relative h-[78vh] min-h-[620px] w-full">
        {slides.map((slide, index) => {
          const isActive = activeIndex === index;
          return (
            <div key={slide.title} className={`absolute inset-0 transition-opacity duration-700 ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!isActive}>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(10,10,10,0.75), rgba(10,10,10,0.35)), url(${slide.image})`,
                }}
              />
            </div>
          );
        })}

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-200">{slides[activeIndex].eyebrow}</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[0.96] tracking-[-0.06em] sm:text-5xl lg:text-7xl">{slides[activeIndex].title}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">{slides[activeIndex].text}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/about" className="inline-flex rounded-full bg-white px-6 py-3 text-xs font-medium uppercase tracking-[0.22em] text-zinc-950 transition hover:bg-zinc-200">
                Explore Zamzameena
              </Link>
              <Link href="/business" className="inline-flex rounded-full border border-white/40 bg-white/5 px-6 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white transition hover:bg-white/10">
                View Ecosystem
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/15 px-3 py-2 backdrop-blur-sm">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={`h-2.5 rounded-full transition-all ${activeIndex === index ? "w-10 bg-white" : "w-2.5 bg-white/45"}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
