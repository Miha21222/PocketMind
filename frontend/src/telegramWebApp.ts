export interface TelegramWebAppControls {
  initData?: string;
  isVersionAtLeast?: (version: string) => boolean;
  ready?: () => void;
  expand?: () => void;
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebAppControls;
  };
}

export function getTelegramWebApp(win?: Window): TelegramWebAppControls | undefined {
  const sourceWindow = win ?? (typeof window === "undefined" ? undefined : window);
  if (!sourceWindow) return undefined;
  return (sourceWindow as TelegramWindow).Telegram?.WebApp;
}

export function initializeTelegramWebApp(webApp: TelegramWebAppControls | undefined = getTelegramWebApp()): void {
  webApp?.ready?.();
  webApp?.expand?.();
}
