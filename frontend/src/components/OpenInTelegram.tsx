import { useEffect } from "react";
import { Send } from "lucide-react";

const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME as string | undefined) || "pocketmind1_bot";
const BOT_LINK = `https://t.me/${BOT_USERNAME}?startapp`;

interface OpenInTelegramProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  redirectingLabel: string;
  autoRedirect: boolean;
}

export function OpenInTelegram({ title, subtitle, buttonLabel, redirectingLabel, autoRedirect }: OpenInTelegramProps) {
  useEffect(() => {
    if (!autoRedirect) return;
    const timer = window.setTimeout(() => {
      window.location.href = BOT_LINK;
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [autoRedirect]);

  return (
    <div className="tg-gate">
      <div className="tg-gate-card">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="PocketMind" className="tg-gate-logo" />
        <h1 className="tg-gate-title">{title}</h1>
        <p className="tg-gate-subtitle">{subtitle}</p>
        <a className="tg-gate-btn" href={BOT_LINK}>
          <Send size={18} />
          {buttonLabel}
        </a>
        {autoRedirect ? <p className="tg-gate-redirect">{redirectingLabel}</p> : null}
      </div>
    </div>
  );
}
