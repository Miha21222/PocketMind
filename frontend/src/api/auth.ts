import { apiRequest } from "./client";

// The backend now returns only Telegram identity; all user preferences live in
// the client's localStorage (see features/settings/localSettings).
export interface AuthUser {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  language_code?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}

export function authWithTelegram(initData: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ init_data: initData }),
  });
}
