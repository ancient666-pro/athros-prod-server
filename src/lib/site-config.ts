/** Configurable contact + booking endpoints. Override in .env, no code changes needed. */
export const siteConfig = {
  bookingUrl: import.meta.env.VITE_BOOKING_URL ?? "https://booking.example.com",
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE ?? "+91XXXXXXXXXX",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? "support@athros.ai",
};

export const telHref = `tel:${siteConfig.supportPhone.replace(/[^\d+]/g, "")}`;
export const mailtoHref = `mailto:${siteConfig.supportEmail}`;
