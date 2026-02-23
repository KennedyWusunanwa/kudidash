import type { Role } from "@/types/accounting";

export interface AppUser {
  id: string;
  email: string | null;
  full_name?: string | null;
  created_at?: string;
}

export interface OrgUserView {
  user_id: string;
  email: string | null;
  role: Role;
  is_active: boolean;
}
