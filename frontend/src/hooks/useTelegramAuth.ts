import { useEffect, useState } from "react";
import { AuthUser, authWithTelegram } from "../api/auth";
import { setAuthToken } from "../api/client";
import { syncPreferences } from "../api/preferences";
import { getEffectiveSettings } from "../features/settings/localSettings";
import { getTelegramWebApp } from "../telegramWebApp";

interface AuthState {
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  user: AuthUser | null;
}

// Dev-only local preview: `npm run dev:local` runs Vite in mode "preview", and
// that mode alone is enough to force the app into local-only auth/storage mode.
// A manual VITE_LOCAL_PREVIEW=true override still works from the single repo
// root .env when someone needs it.
const LOCAL_PREVIEW = import.meta.env.MODE === "preview" || import.meta.env.VITE_LOCAL_PREVIEW === "true";

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
        // Backfill client-owned settings into the backend's UserPreferences row
        // so server-side task creators (voice notes) see the real quick delay.
        // Best-effort: a failure must not fail auth; the next launch/save retries.
        void syncPreferences(getEffectiveSettings()).catch(() => {});
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
