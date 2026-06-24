export type TelegramHapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type TelegramHapticNotificationType = "error" | "success" | "warning";

export interface TelegramHapticFeedback {
  impactOccurred?: (style: TelegramHapticImpactStyle) => void;
  notificationOccurred?: (type: TelegramHapticNotificationType) => void;
  selectionChanged?: () => void;
}

export interface TelegramWebAppControls {
  initData?: string;
  isVersionAtLeast?: (version: string) => boolean;
  ready?: () => void;
  expand?: () => void;
  HapticFeedback?: TelegramHapticFeedback;
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
  // Only ready() + expand(): let Telegram open the Mini App in its default
  // window. requestFullscreen() forced whole-screen mode on Desktop, which is
  // not the desired UX.
  webApp?.ready?.();
  webApp?.expand?.();
}
