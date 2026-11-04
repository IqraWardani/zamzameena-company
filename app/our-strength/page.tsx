import { redirect } from "next/navigation";

export const metadata = {
  title: "Struktur Organisasi",
  description: "Kenali contoh struktur organisasi dan pembagian peran PT Zamzameena Ainsa Synergy.",
};

export default function OurStrengthPage() {
  redirect("/management/struktur");
}
