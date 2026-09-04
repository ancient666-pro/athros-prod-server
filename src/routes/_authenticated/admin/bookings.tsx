import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Search, Eye, X } from "lucide-react";
import {
  getAdminBookings,
  updateBookingStatus,
  type AdminBooking,
  type BookingServiceSnapshot,
} from "@/lib/booking/admin-booking.functions";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({
    meta: [
      { title: "Admin Bookings — Athros" },
      { name: "description", content: "Manage project bookings and token payments." },
      { property: "og:title", content: "Admin Bookings — Athros" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBookingsPage,
});

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  payment_pending: "secondary",
  token_paid: "default",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
  expired: "secondary",
  payment_review_required: "destructive",
};

const paymentStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  created: "outline",
  checkout_pending: "secondary",
  pending: "secondary",
  authorized: "default",
  captured: "default",
  paid: "default",
  partially_refunded: "secondary",
  refunded: "secondary",
  failed: "destructive",
  cancelled: "secondary",
  payment_review_required: "destructive",
};

function fmtCents(cents: number, currency: string): string {
  const amount = cents / 100;
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function BookingDetailDialog({ booking, onClose }: { booking: AdminBooking; onClose: () => void }) {
  const services: BookingServiceSnapshot[] = Array.isArray(booking.selected_services)
    ? booking.selected_services
    : [];
  const oneTimeServices = services.filter((s) => !s.isRecurring);
  const recurringServices = services.filter((s) => s.isRecurring);
  const recurringTotal = recurringServices.reduce((sum, s) => sum + s.subtotalCents, 0);
  const balanceCents = booking.full_amount_cents - booking.token_amount_cents;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">
            Booking {booking.booking_number}
          </DialogTitle>
        </DialogHeader>

        <section className="space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Customer
          </p>
          <p className="font-semibold">{booking.customer_name}</p>
          <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
          {booking.customer_phone && (
            <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
          )}
          {booking.company_name && (
            <p className="text-sm text-muted-foreground">{booking.company_name}</p>
          )}
        </section>

        <Separator />

        <section className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Core Package
          </p>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
            <div>
              <Badge
                variant={booking.package === "production_ready" ? "default" : "outline"}
                className="capitalize"
              >
                {booking.package.replace(/_/g, " ")}
              </Badge>
              <span className="ml-2 text-xs text-muted-foreground">
                {booking.region} · {booking.currency}
              </span>
            </div>
          </div>
        </section>

        {oneTimeServices.length > 0 && (
          <>
            <Separator />
            <section className="space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Modular Services ({oneTimeServices.length})
              </p>
              <ul className="space-y-1.5">
                {oneTimeServices.map((svc, i) => (
                  <li
                    key={`${svc.serviceId}-${svc.planId}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{svc.serviceLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {svc.planName} · {svc.deliveryDuration}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold">
                      {svc.unitPriceCents > 0
                        ? fmtCents(svc.subtotalCents, svc.currency)
                        : "Quote Required"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {recurringServices.length > 0 && (
          <>
            <Separator />
            <section className="space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Maintenance Retainer (Recurring Monthly)
              </p>
              <ul className="space-y-1.5">
                {recurringServices.map((svc, i) => (
                  <li
                    key={`${svc.serviceId}-${svc.planId}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{svc.serviceLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {svc.planName}
                        {svc.allocationHours ? ` · ${svc.allocationHours}` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold">
                      {fmtCents(svc.subtotalCents, svc.currency)}/mo
                    </span>
                  </li>
                ))}
              </ul>
              {recurringTotal > 0 && (
                <p className="text-xs text-muted-foreground pl-1">
                  Total recurring: {fmtCents(recurringTotal, booking.currency)}/mo · excluded from
                  15% token
                </p>
              )}
            </section>
          </>
        )}

        <Separator />

        <section className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Financial Summary
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Total</p>
              <p className="mt-1 font-mono text-base font-semibold">
                {fmtCents(booking.full_amount_cents, booking.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-nv/40 bg-nv/10 p-3 text-center">
              <p className="text-[10px] font-mono uppercase text-nv font-semibold">
                Token ({booking.token_percentage}%)
              </p>
              <p className="mt-1 font-mono text-base font-bold">
                {fmtCents(booking.token_amount_cents, booking.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Balance</p>
              <p className="mt-1 font-mono text-base font-semibold">
                {fmtCents(balanceCents, booking.currency)}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusColors[booking.status] || "outline"}>
              Booking: {booking.status.replace(/_/g, " ")}
            </Badge>
            <Badge variant={paymentStatusColors[booking.payment_status] || "outline"}>
              Payment: {booking.payment_status.replace(/_/g, " ")}
            </Badge>
          </div>
          {booking.paid_at && (
            <p className="text-xs text-muted-foreground">
              Paid at: {format(new Date(booking.paid_at), "PPpp")}
            </p>
          )}
        </section>

        {(booking.razorpay_order_id || booking.razorpay_payment_id) && (
          <>
            <Separator />
            <section className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Razorpay
              </p>
              {booking.razorpay_order_id && (
                <p className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">Order: </span>
                  {booking.razorpay_order_id}
                </p>
              )}
              {booking.razorpay_payment_id && (
                <p className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">Payment: </span>
                  {booking.razorpay_payment_id}
                </p>
              )}
            </section>
          </>
        )}

        {booking.project_summary && (
          <>
            <Separator />
            <section className="space-y-1.5">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Project Brief
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {booking.project_summary}
              </p>
            </section>
          </>
        )}

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={onClose}>
            <X className="mr-2 h-3.5 w-3.5" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const fetchBookings = useServerFn(getAdminBookings);
  const updateStatus = useServerFn(updateBookingStatus);

  const [filters, setFilters] = useState({
    status: "",
    payment_status: "",
    package: "",
    region: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const [detailBooking, setDetailBooking] = useState<AdminBooking | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin-bookings", filters],
    queryFn: () => fetchBookings({ data: { filters } }),
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateStatus({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isPending) {
    return (
      <PortalShell isAdmin subtitle="Booking Management">
        <div className="grid h-64 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-nv" />
        </div>
      </PortalShell>
    );
  }

  if (error || !data) {
    return (
      <PortalShell subtitle="Booking Management">
        <p className="mt-6 rounded-2xl border border-border p-6 text-[14px] text-muted-foreground">
          Failed to load bookings.
        </p>
      </PortalShell>
    );
  }

  const { bookings, stats } = data;

  return (
    <PortalShell isAdmin subtitle="Booking Management">
      {detailBooking && (
        <BookingDetailDialog booking={detailBooking} onClose={() => setDetailBooking(null)} />
      )}

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Booking Management
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {stats.total} total · {stats.payment_pending} pending payment · {stats.token_paid} token
            paid · {stats.approved} approved
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle>Filters</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search booking #, name, email..."
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    className="pl-9 w-64"
                  />
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="payment_pending">Payment Pending</SelectItem>
                    <SelectItem value="token_paid">Token Paid</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.payment_status}
                  onValueChange={(v) => setFilters((f) => ({ ...f, payment_status: v }))}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="checkout_pending">Checkout Pending</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="authorized">Authorized</SelectItem>
                    <SelectItem value="captured">Captured</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="payment_review_required">Review Required</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.package}
                  onValueChange={(v) => setFilters((f) => ({ ...f, package: v }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="production_ready">Production Ready</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>All project bookings</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Full Amount</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-sm">{booking.booking_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={booking.package === "production_ready" ? "default" : "outline"}
                        >
                          {booking.package.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{booking.region}</TableCell>
                      <TableCell className="font-mono text-sm">{booking.currency}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {booking.currency} {(booking.full_amount_cents / 100).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-nv">
                        {booking.currency} {(booking.token_amount_cents / 100).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[booking.status] || "outline"}>
                          {booking.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusColors[booking.payment_status] || "outline"}>
                          {booking.payment_status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(booking.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailBooking(booking)}
                            title="View booking details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Select
                            value={booking.status}
                            onValueChange={(v) =>
                              statusMutation.mutate({ id: booking.id, status: v })
                            }
                            disabled={statusMutation.isPending}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Change" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="payment_pending">Payment Pending</SelectItem>
                              <SelectItem value="token_paid">Token Paid</SelectItem>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No bookings found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
