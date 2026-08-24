import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { WhyUs } from "@/components/site/WhyUs";
import { Timeline } from "@/components/site/Timeline";
import { Pricing } from "@/components/site/Pricing";
import { Integrations } from "@/components/site/Integrations";
import { Testimonials } from "@/components/site/Testimonials";
import { Process } from "@/components/site/Process";
import { CommandCenter } from "@/components/site/CommandCenter";
import { CtaSection } from "@/components/site/CtaSection";
import { Footer } from "@/components/site/Footer";
import { LeadCaptureModal } from "@/components/site/LeadCaptureModal";
import { LeadModalProvider } from "@/components/site/lead-modal-context";
import { Toaster } from "@/components/ui/sonner";
import { ScrollProgress, useLenis } from "@/components/site/primitives";

const title = "Athros — AI Native App Development, MVP in 48 Hours";
const description =
  "Production-ready native Android and iOS apps built by senior engineers with AI acceleration. MVP in 48 hours, production launch in 5–7 days.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "Athros",
          description,
          areaServed: "Worldwide",
          email: "build@athros.dev",
          telephone: "+1-315-482-0199",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  useLenis();

  return (
    <LeadModalProvider>
      <div className="relative min-h-screen">
        <ScrollProgress />
        <Nav />
        <main>
          <Hero />
          <WhyUs />
          <Timeline />
          <Pricing />
          <Integrations />
          <Process />
          <CommandCenter />
          <Testimonials />
          <CtaSection />
        </main>
        <Footer />
        <LeadCaptureModal />
        <Toaster />
      </div>
    </LeadModalProvider>
  );
}
