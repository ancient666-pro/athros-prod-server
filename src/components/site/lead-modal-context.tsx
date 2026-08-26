import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type LeadModalState = {
  open: boolean;
  openModal: () => void;
  setOpen: (open: boolean) => void;
};

const LeadModalContext = createContext<LeadModalState | null>(null);

export function LeadModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen, openModal: () => setOpen(true) }), [open]);

  return <LeadModalContext.Provider value={value}>{children}</LeadModalContext.Provider>;
}

export function useLeadModal() {
  const context = useContext(LeadModalContext);
  if (!context) {
    throw new Error("useLeadModal must be used inside <LeadModalProvider>");
  }
  return context;
}
