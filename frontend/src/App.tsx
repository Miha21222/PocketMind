import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoadingState } from "./components/LoadingState";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { translations } from "./i18n/translations";
import { OpenInTelegram } from "./components/OpenInTelegram";
import { hasTelegramLaunchData, shouldShowTelegramGate } from "./authGate";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { TaskCreatePage } from "./pages/TaskCreatePage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TaskEditPage } from "./pages/TaskEditPage";
import { TaskListPage } from "./pages/TaskListPage";
import { useTasksAllQuery } from "./features/tasks/cache";
import { useTelegramAuth } from "./hooks/useTelegramAuth";
import { getEffectiveSettings } from "./features/settings/localSettings";

export default function App() {
  const auth = useTelegramAuth();
  const tasksAllQuery = useTasksAllQuery(auth.authenticated);
  const initialLanguage = getEffectiveSettings().language;
  const text = translations[initialLanguage] ?? translations.en;

  if (auth.loading) return <LoadingState label={text.authorizing} />;
  if (auth.error) {
    const navLang = (navigator.language || "en").toLowerCase();
    const gateLang = navLang.startsWith("uk") ? "uk" : navLang.startsWith("ru") ? "ru" : "en";
    const gt = translations[gateLang];
    const showTelegramGate = shouldShowTelegramGate({
      authError: auth.error,
      hasTelegramInitData: hasTelegramLaunchData(),
    });
    if (!showTelegramGate) return <p className="center-state error">{text.authFailed}: {auth.error}</p>;
    return (
      <OpenInTelegram
        title={gt.openInTelegramTitle}
        subtitle={gt.openInTelegramSubtitle}
        buttonLabel={gt.openInTelegramButton}
        redirectingLabel={gt.openInTelegramRedirecting}
        autoRedirect={showTelegramGate}
      />
    );
  }
  if (tasksAllQuery.isPending) return <LoadingState label={text.loadingTasks} />;
  if (tasksAllQuery.error) {
    return (
      <div className="center-state">
        <p className="error">{text.failedToLoadTasks}</p>
        <button className="ghost" onClick={() => tasksAllQuery.refetch()}>
          {text.retry}
        </button>
      </div>
    );
  }

  return (
    <AppSettingsProvider>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/tasks/:taskId/edit" element={<TaskEditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </AppSettingsProvider>
  );
}
