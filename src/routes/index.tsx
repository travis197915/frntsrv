import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "@/routes/dashboard";
import WorkflowsPage from "@/routes/workflows";
import WorkflowBuilderPage from "@/routes/workflows/[id]";
import AgentsPage from "@/routes/agents";
import AgentDetailPage from "@/routes/agents/[id]";
import ActivityPage from "@/routes/activity";
import ActivityDetailPage from "@/routes/activity/[id]";
import AIUsagePage from "@/routes/ai-usage";
import SettingsPage from "@/routes/settings";
import UsersListPage from "@/routes/users";
import UserDetailPage from "@/routes/users/[id]";
import NotFound from "@/components/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import UnauthorizedPage from "@/routes/unauthorized/UnauthorizedPage";
import LoginRoute from "@/routes/login";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/workflows/:id" element={<WorkflowBuilderPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:id" element={<AgentDetailPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/activity/:runId" element={<ActivityDetailPage />} />
        <Route path="/ai-usage" element={<AIUsagePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/users" element={<UsersListPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
