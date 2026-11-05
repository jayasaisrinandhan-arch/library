import { supabase } from "./supabase";

export async function getBooks() {
  const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBorrowings(profile) {
  let query = supabase
    .from("borrowings")
    .select("id,user_id,book_id,borrow_date,due_date,return_date,status,created_at,books(title,author),profiles(full_name,email)")
    .order("created_at", { ascending: false });
  if (profile.role !== "admin") query = query.eq("user_id", profile.id);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getReservations(profile) {
  let query = supabase
    .from("reservations")
    .select("id,user_id,book_id,status,created_at,books(title,author),profiles(full_name,email)")
    .order("created_at", { ascending: false });
  if (profile.role !== "admin") query = query.eq("user_id", profile.id);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getNotifications(userId) {
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
