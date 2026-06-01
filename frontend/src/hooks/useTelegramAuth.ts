import { useEffect, useState } from "react";
import { AuthUser, authWithTelegram } from "../api/auth";
import { setAuthToken } from "../api/client";

interface AuthState {
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  user: AuthUser | null;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        initData: string;
      };
    };
  }
}

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
      try {
        const webApp = window.Telegram?.WebApp;
        webApp?.ready();
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
