import { z } from "zod";

/** Transactional email catalogue. Client-safe: names + payload contracts only. */
export const EMAIL_TEMPLATES = {
  "account.invite": z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    tempPassword: z.string().min(8),
    loginUrl: z.string().url(),
  }),
  "account.password-reset": z.object({
    fullName: z.string().min(1).optional(),
    resetUrl: z.string().url(),
    expiresInMinutes: z.number().int().positive(),
  }),
  "account.locked": z.object({
    fullName: z.string().min(1).optional(),
    unlockMinutes: z.number().int().positive(),
  }),
  "project.status": z.object({
    projectName: z.string().min(1),
    status: z.string().min(1),
    progress: z.number().int().min(0).max(100),
    projectUrl: z.string().url(),
  }),
  "project.milestone": z.object({
    projectName: z.string().min(1),
    milestone: z.string().min(1),
    projectUrl: z.string().url(),
  }),
  "delivery.ready": z.object({
    projectName: z.string().min(1),
    label: z.string().min(1),
    projectUrl: z.string().url(),
  }),
  "payment.receipt": z.object({
    projectName: z.string().min(1).optional(),
    amount: z.string().min(1),
    invoiceNumber: z.string().min(1),
    invoiceUrl: z.string().url().optional(),
  }),
  "meeting.scheduled": z.object({
    projectName: z.string().min(1),
    title: z.string().min(1),
    scheduledAt: z.string().min(1),
    meetingLink: z.string().url().optional(),
  }),
  "lead.received": z.object({
    fullName: z.string().min(1),
    company: z.string().optional(),
    email: z.string().email(),
  }),
  "booking.confirmed": z.object({
    bookingNumber: z.string().min(1),
    package: z.string().min(1),
    tokenAmount: z.string().min(1),
    currency: z.string().min(1),
  }),
  "booking.admin_notification": z.object({
    bookingNumber: z.string().min(1),
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    customerPhone: z.string().optional(),
    company: z.string().optional(),
    package: z.string().min(1),
    region: z.string().min(1),
    currency: z.string().min(1),
    fullAmount: z.string().min(1),
    tokenAmount: z.string().min(1),
    paymentStatus: z.string().min(1),
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    projectId: z.string().optional(),
  }),
} as const;

export type EmailTemplate = keyof typeof EMAIL_TEMPLATES;

export type EmailPayload<T extends EmailTemplate> = z.infer<(typeof EMAIL_TEMPLATES)[T]>;

export const SUBJECTS: Record<EmailTemplate, string> = {
  "account.invite": "Your Athros client portal is ready",
  "account.password-reset": "Reset your Athros password",
  "account.locked": "Your Athros account was temporarily locked",
  "project.status": "Project update from Athros",
  "project.milestone": "Milestone completed",
  "delivery.ready": "Your build is ready to download",
  "payment.receipt": "Payment receipt",
  "meeting.scheduled": "Your Athros call is scheduled",
  "lead.received": "We received your project brief",
  "booking.confirmed": "Your Athros project booking is confirmed",
  "booking.admin_notification": "New Athros Project Booking — Token Payment Received",
};
