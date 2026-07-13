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
  showConfirm?: (message: string, callback: (confirmed: boolean) => void) => void;
}

export interface VirtualKeyboardControls {
  overlaysContent: boolean;
}

interface NavigatorWithVirtualKeyboard extends Navigator {
  virtualKeyboard?: VirtualKeyboardControls;
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

function getVirtualKeyboard(): VirtualKeyboardControls | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as NavigatorWithVirtualKeyboard).virtualKeyboard;
}

export function calculateKeyboardOffset(stableHeight: number, viewportHeight: number, viewportTop = 0): number {
  return Math.max(0, Math.round(stableHeight - viewportHeight - viewportTop));
}

function acceptsTextInput(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.matches("input, textarea, select, [contenteditable='true']");
}

export function initializeKeyboardOverlay(win: Window | undefined = typeof window === "undefined" ? undefined : window): void {
  if (!win) return;

  const root = win.document.documentElement;
  const viewport = win.visualViewport;
  let stableHeight = Math.max(win.innerHeight, viewport?.height ?? 0);
  let frame = 0;
  let blurTimer = 0;

  const render = () => {
    frame = 0;
    const viewportHeight = viewport?.height ?? win.innerHeight;
    const focused = acceptsTextInput(win.document.activeElement);

    // Keep the largest unfocused viewport as the pre-keyboard baseline. Some
    // Telegram Android WebViews resize both the layout and visual viewports.
    if (!focused) stableHeight = Math.max(win.innerHeight, viewportHeight);
    else stableHeight = Math.max(stableHeight, win.innerHeight, viewportHeight);

    const offset = focused
      ? calculateKeyboardOffset(stableHeight, viewportHeight, viewport?.offsetTop ?? 0)
      : 0;
    const keyboardOpen = offset >= 100;

    root.style.setProperty("--app-stable-viewport-height", `${Math.round(stableHeight)}px`);
    root.style.setProperty("--keyboard-overlay-offset", `${keyboardOpen ? offset : 0}px`);
    root.classList.toggle("keyboard-overlay-active", keyboardOpen);
  };

  const scheduleRender = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(render);
  };
  const handleFocusOut = () => {
    win.clearTimeout(blurTimer);
    blurTimer = win.setTimeout(scheduleRender, 150);
  };
  const resetAfterOrientationChange = () => {
    win.setTimeout(() => {
      stableHeight = Math.max(win.innerHeight, viewport?.height ?? 0);
      scheduleRender();
    }, 300);
  };

  win.document.addEventListener("focusin", scheduleRender);
  win.document.addEventListener("focusout", handleFocusOut);
  win.addEventListener("resize", scheduleRender);
  win.addEventListener("orientationchange", resetAfterOrientationChange);
  viewport?.addEventListener("resize", scheduleRender);
  viewport?.addEventListener("scroll", scheduleRender);
  render();
}

export function initializeTelegramWebApp(
  webApp: TelegramWebAppControls | undefined = getTelegramWebApp(),
  virtualKeyboard: VirtualKeyboardControls | undefined = getVirtualKeyboard(),
): void {
  // Ask supporting Chromium Telegram WebViews to overlay the keyboard instead
  // of resizing the app. The viewport listener above compensates older clients.
  try {
    if (virtualKeyboard) virtualKeyboard.overlaysContent = true;
  } catch {
    // WebView capabilities are best-effort and must never block app startup.
  }
  // Only ready() + expand(): requestFullscreen() is intentionally avoided.
  webApp?.ready?.();
  webApp?.expand?.();
}

// The blocking browser window.confirm() desyncs the Telegram Android WebView's
// touch event routing once dismissed, leaving parts of the page unclickable
// until the app is restarted. Telegram's own showConfirm() is non-blocking and
// avoids that; fall back to window.confirm outside of Telegram (e.g. dev:local).
export function showConfirm(message: string, webApp: TelegramWebAppControls | undefined = getTelegramWebApp()): Promise<boolean> {
  if (webApp?.showConfirm) {
    return new Promise((resolve) => webApp.showConfirm!(message, resolve));
  }
  return Promise.resolve(typeof window === "undefined" ? false : window.confirm(message));
}
