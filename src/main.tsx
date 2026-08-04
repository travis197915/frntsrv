import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "./utils/theme";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { TooltipProvider } from "./components/ui/tooltip";
import AppRoutes from "./routes";
import { validateRuntimeConfig } from "./lib/runtimeConfig";
import { SopNotificationProvider } from "./features/sop-notifications/SopNotificationProvider";

// Validate required runtime environment variables before app starts
try {
  validateRuntimeConfig();
} catch (error) {
  // Display error message and prevent app from initializing
  const message = error instanceof Error ? error.message : "Unknown configuration error";
  console.error("Configuration Error:", message);
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: monospace; white-space: pre-wrap; color: #d32f2f; background-color: #ffebee; border: 1px solid #d32f2f; margin: 20px; border-radius: 4px;">
      <h1 style="color: #d32f2f; margin-top: 0;">⚠️ Configuration Error</h1>
      <pre>${message}</pre>
    </div>
  `;
  throw error;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SopNotificationProvider>
              <TooltipProvider delayDuration={400}>
                <AppRoutes />
              </TooltipProvider>
            </SopNotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
