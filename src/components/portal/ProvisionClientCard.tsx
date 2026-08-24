import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { createClientAccount } from "@/lib/accounts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Invitation-only provisioning: staff creates the account and hands over credentials. */
export function ProvisionClientCard({ onCreated }: { onCreated?: () => void }) {
  const provision = useServerFn(createClientAccount);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: () =>
      provision({ data: { email, fullName, company, projectName } }),
    onSuccess: (result) => {
      setCredentials({ email: result.email, tempPassword: result.tempPassword });
      setEmail("");
      setFullName("");
      setCompany("");
      setProjectName("");
      toast.success("Account created — share the temporary password securely.");
      onCreated?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <article className="glass rounded-3xl border border-border p-6">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-nv" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Generate client account
        </h2>
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Creates the login, assigns a project and returns a one-time temporary password.
      </p>

      <form
        className="mt-5 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="client-name">Client name</Label>
          <Input
            id="client-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="client-email">Client email</Label>
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="client-company">Company</Label>
          <Input
            id="client-company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="client-project">Project name</Label>
          <Input
            id="client-project"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={mutation.isPending} className="sm:col-span-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create account & project
        </Button>
      </form>

      {credentials ? (
        <div className="mt-5 rounded-2xl border border-nv/40 bg-nv/10 p-4 text-[13px]">
          <p className="font-semibold">Share these credentials once, then delete this view.</p>
          <p className="mt-2 font-mono text-[12.5px] break-all">
            {credentials.email} · {credentials.tempPassword}
          </p>
          <p className="mt-2 text-muted-foreground">
            Dashboard URL: {typeof window !== "undefined" ? window.location.origin : ""}/login
          </p>
        </div>
      ) : null}
    </article>
  );
}
