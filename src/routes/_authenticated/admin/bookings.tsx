import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Filter, ChevronDown, ChevronUp, Search, Eye, Edit } from "lucide-react";
import {
  getAdminBookings,
  updateBookingStatus,
  type AdminBooking,
} from "@/lib/booking/admin-booking.functions";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
                          <Button variant="ghost" size="sm" onClick={() => viewBooking(booking)}>
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

function viewBooking(booking: AdminBooking) {
  // TODO: Open modal with booking details
  alert(`View booking ${booking.booking_number} - implement modal`);
}
