import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { leadSchema, submitLead, type LeadInput } from "@/lib/leads.functions";
import { useLeadModal } from "./lead-modal-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const projectTypes = [
  "Native Android app",
  "Native iOS app",
  "Android + iOS",
  "Cross-platform (Flutter / RN)",
  "Backend / API platform",
  "AI product",
  "Not sure yet",
];

const budgets = [
  "Under $2,500",
  "$2,500 – $8,000",
  "$8,000 – $25,000",
  "$25,000 – $75,000",
  "$75,000+",
];

const timelines = ["ASAP (48h MVP)", "1–2 weeks", "This month", "This quarter", "Exploring"];

const platformOptions = ["Android", "iOS", "Web dashboard", "Backend", "AI agents"];

const emptyForm: LeadInput = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  projectType: "",
  budget: "",
  timeline: "",
  platforms: [],
  message: "",
  referralSource: "",
};

function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[12px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}
    </div>
  );
}

function ChoiceChips({
  options,
  value,
  onSelect,
  name,
}: {
  options: string[];
  value: string;
  onSelect: (option: string) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option === value ? "" : option)}
          aria-pressed={option === value}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
            option === value
              ? "border-nv/60 bg-nv/15 text-foreground"
              : "border-border bg-card/60 text-muted-foreground hover:border-nv/40 hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function LeadCaptureModal() {
  const { open, setOpen } = useLeadModal();
  const [form, setForm] = useState<LeadInput>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitLead);

  const mutation = useMutation({
    mutationFn: (data: LeadInput) => submit({ data }),
    onSuccess: () => {
      setDone(true);
      setForm(emptyForm);
      toast.success("Request received — we'll reply within a few hours.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const update = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDone(false);
          setErrors({});
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card/85 backdrop-blur-xl sm:max-w-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_70%)] opacity-60 blur-3xl" />

        {done ? (
          <div className="relative py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-nv" />
            <DialogTitle className="mt-4 text-2xl font-semibold">
              Your empire is queued.
            </DialogTitle>
            <DialogDescription className="mt-2 text-[14px]">
              A senior engineer will reach out with a scope, timeline and fixed price. Check your
              inbox shortly.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
                <Rocket className="h-5 w-5 text-nv" />
                Unleash Your Empire
              </DialogTitle>
              <DialogDescription>
                Tell us about the product. We reply with scope, timeline and a fixed price — usually
                within a few hours.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="relative grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *" htmlFor="lead-name" error={errors.fullName}>
                  <Input
                    id="lead-name"
                    value={form.fullName}
                    maxLength={100}
                    onChange={(event) => update("fullName", event.target.value)}
                    placeholder="Ada Lovelace"
                  />
                </Field>
                <Field label="Company" htmlFor="lead-company" error={errors.company}>
                  <Input
                    id="lead-company"
                    value={form.company ?? ""}
                    maxLength={120}
                    onChange={(event) => update("company", event.target.value)}
                    placeholder="Athros Labs"
                  />
                </Field>
                <Field label="Work email *" htmlFor="lead-email" error={errors.email}>
                  <Input
                    id="lead-email"
                    type="email"
                    value={form.email}
                    maxLength={255}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="you@company.com"
                  />
                </Field>
                <Field label="Phone / WhatsApp" htmlFor="lead-phone" error={errors.phone}>
                  <Input
                    id="lead-phone"
                    type="tel"
                    value={form.phone ?? ""}
                    maxLength={32}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="+1 315 482 0199"
                  />
                </Field>
              </div>

              <Field label="Project type" htmlFor="lead-project-type">
                <ChoiceChips
                  name="Project type"
                  options={projectTypes}
                  value={form.projectType ?? ""}
                  onSelect={(option) => update("projectType", option)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Budget" htmlFor="lead-budget">
                  <ChoiceChips
                    name="Budget"
                    options={budgets}
                    value={form.budget ?? ""}
                    onSelect={(option) => update("budget", option)}
                  />
                </Field>
                <Field label="Timeline" htmlFor="lead-timeline">
                  <ChoiceChips
                    name="Timeline"
                    options={timelines}
                    value={form.timeline ?? ""}
                    onSelect={(option) => update("timeline", option)}
                  />
                </Field>
              </div>

              <Field label="Platforms needed" htmlFor="lead-platforms">
                <div className="flex flex-wrap gap-1.5">
                  {platformOptions.map((option) => {
                    const active = form.platforms.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          update(
                            "platforms",
                            active
                              ? form.platforms.filter((item) => item !== option)
                              : [...form.platforms, option],
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                          active
                            ? "border-nv/60 bg-nv/15 text-foreground"
                            : "border-border bg-card/60 text-muted-foreground hover:border-nv/40 hover:text-foreground",
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="What are you building?" htmlFor="lead-message" error={errors.message}>
                <Textarea
                  id="lead-message"
                  rows={4}
                  maxLength={2000}
                  value={form.message ?? ""}
                  onChange={(event) => update("message", event.target.value)}
                  placeholder="Core features, target users, integrations, anything already built…"
                />
              </Field>

              <Field label="How did you find us?" htmlFor="lead-referral">
                <Input
                  id="lead-referral"
                  value={form.referralSource ?? ""}
                  maxLength={80}
                  onChange={(event) => update("referralSource", event.target.value)}
                  placeholder="Referral, LinkedIn, Google…"
                />
              </Field>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="group relative mt-1 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-nv px-6 py-3.5 text-sm font-semibold text-[oklch(0.18_0.03_130)] transition-shadow duration-300 hover:shadow-[0_18px_50px_-14px_var(--nv)] disabled:opacity-70"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {mutation.isPending ? "Sending…" : "Send my project brief"}
              </button>
              <p className="text-center text-[11.5px] text-muted-foreground">
                We reply from build@athros.dev. No spam, no sales sequences.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
