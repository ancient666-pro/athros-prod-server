import { createFileRoute } from "@tanstack/react-router";
import { BookingForm } from "@/components/site/BookingForm";
import { SectionHeading } from "@/components/site/primitives";

import { z } from "zod";

const bookingSearchSchema = z.object({
  package: z.enum(["mvp", "production_ready", "enterprise"]).optional(),
});

export const Route = createFileRoute("/booking")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { package?: "mvp" | "production_ready" | "enterprise"; services?: string } => {
    const pkg = typeof search?.package === "string" ? search.package : undefined;
    const services = typeof search?.services === "string" ? search.services : undefined;
    const validPkg =
      pkg === "mvp" || pkg === "production_ready" || pkg === "enterprise" ? pkg : undefined;
    return {
      ...(validPkg ? { package: validPkg } : {}),
      ...(services ? { services } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Book Your Project — Athros" },
      {
        name: "description",
        content:
          "Book your Athros project with a 15% token payment. Fixed scope, fixed price, shipped.",
      },
      { property: "og:title", content: "Book Your Project — Athros" },
      {
        property: "og:description",
        content: "Fixed scope, fixed price, shipped. Pay token to secure your project slot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const search = Route.useSearch();
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading
            eyebrow="New Project"
            title="Book your build"
            subtitle="Select a package, share your brief, and pay the 15% token to lock in your delivery slot."
          />
          <BookingForm initialPackage={search?.package} initialServices={search?.services} />
        </div>
      </section>
    </div>
  );
}
