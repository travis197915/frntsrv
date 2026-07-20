import { Navigate, Route, Routes } from "react-router-dom";
import WorkflowsPage from "@/routes/workflows";
import WorkflowBuilderPage from "@/routes/workflows/[id]";
// import AgentsPage from "@/routes/agents";
// import AgentDetailPage from "@/routes/agents/[id]";
// import ActivityPage from "@/routes/activity";
// import ActivityDetailPage from "@/routes/activity/[id]";
// import AIUsagePage from "@/routes/ai-usage";
import SettingsPage from "@/routes/settings";
import UsersListPage from "@/routes/users";
import UserDetailPage from "@/routes/users/[id]";
import RolesPage from "@/routes/users/roles";
import FieldMappingPage from "@/routes/config/field-mapping";
import ClaimOntologyPage from "@/routes/config/claim-ontology";
import McpServersPage from "@/routes/config/mcp-servers";
import ToolCallsPage from "@/routes/config/tool-calls";
import NotFound from "@/components/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import UnauthorizedPage from "@/routes/unauthorized/UnauthorizedPage";
import LoginRoute from "@/routes/login";
import HealthPage from "@/routes/health";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/health" element={<HealthPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/workflows" replace />} />
        <Route path="/dashboard" element={<Navigate to="/workflows" replace />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/workflows/:id" element={<WorkflowBuilderPage />} />
        {/* Hidden until launch: agents, activity, ai-usage
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:id" element={<AgentDetailPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/activity/:runId" element={<ActivityDetailPage />} />
        <Route path="/ai-usage" element={<AIUsagePage />} />
        */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/config/field-mapping" element={<FieldMappingPage />} />
        <Route path="/config/claim-ontology" element={<ClaimOntologyPage />} />
        <Route path="/config/mcp-servers" element={<McpServersPage />} />
        <Route path="/config/tool-calls" element={<ToolCallsPage />} />
        <Route path="/users" element={<UsersListPage />} />
        <Route path="/users/roles" element={<RolesPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
