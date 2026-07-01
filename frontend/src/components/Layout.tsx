import { PropsWithChildren, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, House, Languages, ListTodo, PlusSquare, Settings as SettingsIcon } from "lucide-react";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { TASKS_ALL_QUERY_KEY } from "../features/tasks/cache";
import { taskListViewForTask } from "../features/tasks/selectors";
import { hasTaskCreateDraft, TASK_CREATE_DRAFT_UPDATED_EVENT } from "../features/tasks/taskCreateDraft";
import { TASK_LIST_TYPE_STORAGE_KEY, TASK_LIST_VIEW_STORAGE_KEY } from "../features/tasks/viewPreferences";
import { writeStoredEnumValue } from "../hooks/usePersistentEnumState";
import { hapticImpact, hapticSelection } from "../utils/haptics";
import { TranslationKey } from "../i18n/translations";
import { AppLanguage } from "../types/settings";
import { Task } from "../types/task";

const TASK_DETAIL_PATH = /^\/tasks\/[^/]+$/;

const LANGUAGE_CYCLE: AppLanguage[] = ["en", "ru", "uk"];

// The three destinations reachable from the bottom navigation are "roots" and
// never show the floating back button.
const ROOT_PATHS = ["/", "/tasks", "/settings"];

export function Layout({ children }: PropsWithChildren) {
  const { settings, setLanguage, t } = useAppSettings();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageTitle = getPageTitle(location.pathname, t);
  const [hasCreateDraft, setHasCreateDraft] = useState(() => hasTaskCreateDraft());
  const isTaskCreatePage = location.pathname === "/tasks/new";
  const showBackButton = !ROOT_PATHS.includes(location.pathname);
  const FloatingCreateIcon = hasCreateDraft ? FileText : PlusSquare;

  useEffect(() => {
    setHasCreateDraft(hasTaskCreateDraft());
  }, [location.pathname]);

  useEffect(() => {
    const syncDraftState = () => setHasCreateDraft(hasTaskCreateDraft());
    window.addEventListener(TASK_CREATE_DRAFT_UPDATED_EVENT, syncDraftState);
    return () => window.removeEventListener(TASK_CREATE_DRAFT_UPDATED_EVENT, syncDraftState);
  }, []);

  // A task opened straight from a bot notification deep link is the first
  // (and only) entry in this tab's history, so there is nothing for
  // navigate(-1) to pop back to. Detect that case via location.key (react-router
  // sets it to "default" only for that initial entry) and fall back to the
  // task list, resetting its persisted filters so the task is actually visible there.
  const handleBack = () => {
    hapticImpact("light");
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    const isTaskDetail = TASK_DETAIL_PATH.test(location.pathname);
    if (isTaskDetail) {
      const taskId = location.pathname.split("/")[2];
      const task = (queryClient.getQueryData<Task[]>(TASKS_ALL_QUERY_KEY) ?? []).find((item) => item.id === taskId);
      writeStoredEnumValue(TASK_LIST_VIEW_STORAGE_KEY, task ? taskListViewForTask(task) : "active");
      writeStoredEnumValue(TASK_LIST_TYPE_STORAGE_KEY, "all");
      navigate("/tasks", { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

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
                hapticSelection();
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

      {showBackButton && (
        <button
          type="button"
          className="floating-back-btn"
          aria-label={t("back")}
          title={t("back")}
          onClick={handleBack}
        >
          <ArrowLeft size={34} />
        </button>
      )}

      {!isTaskCreatePage && (
        <Link
          to="/tasks/new"
          className={`floating-create-btn${hasCreateDraft ? " has-draft" : ""}`}
          aria-label={t("newTask")}
          title={t("newTask")}
        >
          <FloatingCreateIcon size={34} />
        </Link>
      )}

      <nav className="bottom-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("home")}
        >
          <House size={28} />
        </NavLink>
        <NavLink
          to="/tasks"
          end
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("tasks")}
        >
          <ListTodo size={28} />
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => (isActive ? "active rounded-xl bg-pmgreen-200 text-emerald-800 font-extrabold" : "")}
          aria-label={t("settings")}
        >
          <SettingsIcon size={28} />
        </NavLink>
      </nav>
    </div>
  );
}

function getPageTitle(pathname: string, t: (key: TranslationKey) => string): string {
  if (pathname === "/tasks/new") return t("createTask");
  if (/^\/tasks\/[^/]+\/edit$/.test(pathname)) return t("editTask");
  if (pathname.startsWith("/tasks")) return t("tasks");
  if (pathname === "/settings/feedback") return t("rateExperience");
  if (pathname === "/settings/bug-report") return t("reportBug");
  if (pathname === "/settings") return t("settings");
  return t("dashboard");
}
