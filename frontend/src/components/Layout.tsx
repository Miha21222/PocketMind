import { PropsWithChildren } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { House, Languages, ListTodo, PlusSquare, Settings as SettingsIcon } from "lucide-react";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { TranslationKey } from "../i18n/translations";
import { AppLanguage } from "../types/settings";

const LANGUAGE_CYCLE: AppLanguage[] = ["en", "ru", "uk"];

export function Layout({ children }: PropsWithChildren) {
  const { settings, setLanguage, t } = useAppSettings();
  const { showToast } = useToast();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname, t);

  return (
    <div className="app-shell font-sans">
      <header className="app-header">
        <div className="header-top-row">
          <Link to="/" className="header-logo-link" aria-label={t("home")}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="PocketMind" className="brand-logo h-14 w-14 rounded-2xl" />
          </Link>
          <h1 className="header-page-title">{pageTitle}</h1>
          <button
            type="button"
            className="lang-switch-btn ghost"
            aria-label={t("language")}
            onClick={async () => {
              try {
                const next = LANGUAGE_CYCLE[(LANGUAGE_CYCLE.indexOf(settings.language) + 1) % LANGUAGE_CYCLE.length];
                await setLanguage(next);
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

      <Link
        to="/tasks/new"
        className="floating-create-btn"
        aria-label={t("newTask")}
        title={t("newTask")}
      >
        <PlusSquare size={26} />
      </Link>

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

function getPageTitle(pathname: string, t: (key: TranslationKey) => string): string {
  if (pathname === "/tasks/new") return t("createTask");
  if (/^\/tasks\/[^/]+\/edit$/.test(pathname)) return t("editTask");
  if (pathname.startsWith("/tasks")) return t("tasks");
  if (pathname === "/settings") return t("settings");
  return t("dashboard");
}
