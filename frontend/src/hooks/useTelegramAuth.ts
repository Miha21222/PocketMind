import { useEffect, useState } from "react";
import { AuthUser, authWithTelegram } from "../api/auth";
import { setAuthToken } from "../api/client";
import { getTelegramWebApp } from "../telegramWebApp";

interface AuthState {
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  user: AuthUser | null;
}

// Dev-only local preview: when VITE_LOCAL_PREVIEW=true the app skips Telegram
// auth and the backend entirely and runs fully on localStorage. The flag lives
// only in frontend/.env.preview (loaded by `npm run dev:local`); the GitHub
// Pages production build uses mode "production" and never sets it, so this
// branch is unreachable in production.
const LOCAL_PREVIEW = import.meta.env.VITE_LOCAL_PREVIEW === "true";

const PREVIEW_USER: AuthUser = {
  id: 0,
  telegram_id: 0,
  username: "local-preview",
  first_name: "Local",
  last_name: "Preview",
};

function getInitDataFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromSearch = searchParams.get("tgWebAppData");
  const fromHash = hashParams.get("tgWebAppData");
  return fromSearch || fromHash;
}

export function useTelegramAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    error: null,
    authenticated: false,
    user: null,
  });

  useEffect(() => {
    const init = async () => {
      if (LOCAL_PREVIEW) {
        setState({ loading: false, error: null, authenticated: true, user: PREVIEW_USER });
        return;
      }
      try {
        const webApp = getTelegramWebApp();
        const initData =
          webApp?.initData ||
          getInitDataFromUrl() ||
          (import.meta.env.VITE_DEV_INIT_DATA as string | undefined);
        if (!initData) {
          throw new Error("No Telegram initData available");
        }
        const auth = await authWithTelegram(initData);
        setAuthToken(auth.access_token);
        setState({ loading: false, error: null, authenticated: true, user: auth.user });
      } catch (error) {
        setState({
          loading: false,
          authenticated: false,
          user: null,
          error: error instanceof Error ? error.message : "Authentication failed",
        });
      }
    };
    init();
  }, []);

  return state;
}
