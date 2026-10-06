import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DepositStatus = "pending" | "confirmed" | "rejected";
export type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  deposit_date: string;
  note: string | null;
  receipt_path: string | null;
  status: DepositStatus;
  reviewed_at: string | null;
  created_at: string;
};
export type Profile = { id: string; display_name: string };

export const naira = (n: number) =>
  "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const savingsQuery = queryOptions({
  queryKey: ["savings"],
  queryFn: async () => {
    const [{ data: u }, profiles, deposits, roles] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("id, display_name").order("created_at"),
      supabase.from("deposits").select("*").order("deposit_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (profiles.error) throw profiles.error;
    if (deposits.error) throw deposits.error;
    const me = u.user?.id ?? "";
    const adminIds = new Set((roles.data ?? []).map((r) => r.user_id));
    return {
      me,
      isAdmin: adminIds.has(me),
      adminIds,
      profiles: profiles.data as Profile[],
      deposits: (deposits.data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Deposit[],
    };
  },
});

export async function openReceipt(path: string) {
  const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}
