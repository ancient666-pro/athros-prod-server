import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function generateBookingNumber(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const prefix = "ATH";
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const { data } = await supabaseAdmin
    .from("project_bookings")
    .select("booking_number")
    .like("booking_number", `${prefix}${datePart}%`)
    .order("booking_number", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0 && data[0]?.booking_number) {
    const lastNum = data[0].booking_number;
    const match = lastNum.match(new RegExp(`${prefix}${datePart}(\\d+)`));
    if (match && match[1]) seq = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${datePart}${String(seq).padStart(4, "0")}`;
}
