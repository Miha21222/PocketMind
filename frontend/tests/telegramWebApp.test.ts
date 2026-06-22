import { initializeTelegramWebApp, type TelegramWebAppControls } from "../src/telegramWebApp";

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function buildWebApp(): TelegramWebAppControls & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    ready: () => calls.push("ready"),
    expand: () => calls.push("expand"),
    isVersionAtLeast: (version) => version === "8.0",
    requestFullscreen: () => calls.push("requestFullscreen"),
  };
}

{
  const webApp = buildWebApp();
  initializeTelegramWebApp(webApp);

  assertEqual(webApp.calls.join(","), "ready,expand,requestFullscreen");
}

{
  const calls: string[] = [];
  initializeTelegramWebApp({
    ready: () => calls.push("ready"),
    expand: () => calls.push("expand"),
    isVersionAtLeast: () => false,
    requestFullscreen: () => calls.push("requestFullscreen"),
  });

  assertEqual(calls.join(","), "ready,expand");
}

{
  initializeTelegramWebApp(undefined);
}
