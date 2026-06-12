import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Plus } from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import Loader from '@/components/Loader';
import EmptyState from '@/components/EmptyState';
import SearchInput from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  workflowsApi,
  type RuntimeAgentInput,
  type WorkflowSummary,
} from '@/lib/api';
import WorkflowCard from './components/WorkflowCard';
import CreateWorkflowDialog from './components/CreateWorkflowDialog';

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [newSopUrls, setNewSopUrls] = useState<string[]>([]);
  const [newRuntimeAgents, setNewRuntimeAgents] = useState<RuntimeAgentInput[]>([]);
  const [newAutoBuild, setNewAutoBuild] = useState(false);

  const [rawWorkflows, setRawWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setRawWorkflows(await workflowsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const workflows = useMemo(() => {
    if (!searchQuery.trim()) return rawWorkflows;

    const q = searchQuery.toLowerCase();
    return rawWorkflows.filter(
      (w: any) =>
        w.name?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q),
    );
  }, [rawWorkflows, searchQuery]);

  const handleCreateNew = async () => {
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (override?: {
    sopUrls: string[];
    runtimeAgents: typeof newRuntimeAgents;
  }) => {
    const workflowName = newWorkflowName.trim();
    if (!workflowName) return;
    setCreatingWorkflow(true);
    try {
      const created = await workflowsApi.create({
        name:          workflowName,
        description:   newWorkflowDescription.trim(),
        isActive:      true,
        nodes:         '[]',
        edges:         '[]',
        sopUrls:          override?.sopUrls ?? newSopUrls,
        runtimeAgents:    override?.runtimeAgents ?? newRuntimeAgents,
        autoBuildFromSop: newAutoBuild,
      });
      setIsCreateOpen(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      setNewSopUrls([]);
      setNewRuntimeAgents([]);
      setNewAutoBuild(false);
      navigate(`/workflows/${created.id}`);
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    const confirmed = window.confirm('Delete this workflow? This action cannot be undone.');
    if (!confirmed) return;
    await workflowsApi.remove(workflowId);
    await refetch();
  };

  const handleDuplicateWorkflow = async (workflowId: string) => {
    const dup = await workflowsApi.duplicate(workflowId);
    await refetch();
    navigate(`/workflows/${dup.id}`);
  };

  const isLoading = loading && rawWorkflows.length === 0;

  return (
    <SidebarLayout title="Workflows" subtitle="Build and manage automation pipelines">
      <CreateWorkflowDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        name={newWorkflowName}
        description={newWorkflowDescription}
        creating={creatingWorkflow}
        sopUrls={newSopUrls}
        runtimeAgents={newRuntimeAgents}
        autoBuild={newAutoBuild}
        onNameChange={setNewWorkflowName}
        onDescriptionChange={setNewWorkflowDescription}
        onSopUrlsChange={setNewSopUrls}
        onRuntimeAgentsChange={setNewRuntimeAgents}
        onAutoBuildChange={setNewAutoBuild}
        onCreate={handleCreateSubmit}
      />

      {/* Top toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search workflows..."
          wrapperClassName="w-full sm:w-[240px]"
          className="h-8 text-sm"
        />

        <Button size="sm" onClick={handleCreateNew} className="shrink-0" disabled={!canWrite}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Workflow
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No workflows found"
          description={
            searchQuery
              ? 'No workflows match your search.'
              : 'Create your first workflow to start building automation pipelines.'
          }
          action={
            !searchQuery && canWrite ? (
              <Button size="sm" onClick={handleCreateNew}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Workflow
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((wf: any) => (
            <WorkflowCard
              key={wf.id}
              id={wf.id}
              name={wf.name}
              description={wf.description}
              status={wf.status}
              config={wf.config}
              updatedAt={wf.updatedAt}
              needsTools={Boolean(wf.metadata?.needs_tools)}
              onDuplicate={canWrite ? () => void handleDuplicateWorkflow(wf.id) : undefined}
              onDelete={canWrite ? () => void handleDeleteWorkflow(wf.id) : undefined}
              disableActions={!canWrite}
            />
          ))}
        </div>
      )}
    </SidebarLayout>
  );
}
