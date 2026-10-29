import { StaticDesignPage } from "@/components/static-design-page";
import { SiteFrame } from "@/components/site-frame";

export const metadata = {
  title: "Hubungi Kami",
  description: "Hubungi PT Zamzameena Ainsa Synergy melalui kantor, email, telepon, atau WhatsApp.",
};

export default function ContactPage() {
  return (
    <SiteFrame>
      <StaticDesignPage fileName="hubungi.html" useSiteChrome />
    </SiteFrame>
  );
}
