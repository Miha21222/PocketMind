import { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { House, Languages, ListTodo, PlusSquare, Settings as SettingsIcon } from "lucide-react";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";

export function Layout({ children }: PropsWithChildren) {
  const { settings, setLanguage, t } = useAppSettings();
  const { showToast } = useToast();

  return (
    <div className="app-shell font-sans">
      <header className="app-header">
        <div className="header-top-row">
          <Link to="/" className="brand flex items-center gap-3">
            <img src="/logo.png" alt="PocketMind" className="brand-logo h-14 w-14 rounded-2xl" />
            <div>
              <div className="brand-title text-lg font-extrabold text-pmblue-700">{t("appTitle")}</div>
              <div className="brand-subtitle text-sm text-slate-500">{t("appSubtitle")}</div>
            </div>
          </Link>
          <button
            type="button"
            className="lang-switch-btn ghost"
            aria-label={t("language")}
            onClick={async () => {
              try {
                await setLanguage(settings.language === "en" ? "ru" : "en");
                showToast({ tone: "success", message: t("languageUpdated") });
              } catch {
                showToast({ tone: "error", message: t("settingsSaveError") });
              }
            }}
          >
            <Languages size={17} />
            <span>{settings.language.toUpperCase()}</span>
          </button>
        </div>
      </header>

      <main className="app-content">{children}</main>

      <nav className="bottom-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("home")}
        >
          <House size={22} />
        </NavLink>
        <NavLink
          to="/tasks"
          end
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("tasks")}
        >
          <ListTodo size={22} />
        </NavLink>
        <NavLink
          to="/tasks/new"
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("newTask")}
        >
          <PlusSquare size={22} />
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("settings")}
        >
          <SettingsIcon size={22} />
        </NavLink>
      </nav>
    </div>
  );
}
