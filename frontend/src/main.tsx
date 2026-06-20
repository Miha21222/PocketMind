import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Vite injects the deploy sub-path as BASE_URL ("/PocketMind/" on Pages, "/" in dev).
// React Router needs it as a basename so absolute routes resolve under that sub-path.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
