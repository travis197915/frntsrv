import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Plus } from 'lucide-react';
import SidebarLayout from '@/layouts/SidebarLayout';
import Loader from '@/components/Loader';
import EmptyState from '@/components/EmptyState';
import SearchInput from '@/components/SearchInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';
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
  useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [newSopUrls, setNewSopUrls] = useState<string[]>([]);
  const [newRuntimeAgents, setNewRuntimeAgents] = useState<RuntimeAgentInput[]>([]);

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
    let filtered = rawWorkflows;

    if (statusFilter) {
      filtered = filtered.filter(
        (w: any) => w.status?.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w: any) =>
          w.name?.toLowerCase().includes(q) ||
          w.description?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [rawWorkflows, statusFilter, searchQuery]);

  const handleCreateNew = async () => {
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
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
        sopUrls:       newSopUrls,
        runtimeAgents: newRuntimeAgents,
      });
      setIsCreateOpen(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      setNewSopUrls([]);
      setNewRuntimeAgents([]);
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

  const STATUS_TABS = [
    { value: '',          label: 'All' },
    { value: 'running',   label: 'Running' },
    { value: 'idle',      label: 'Idle' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed',    label: 'Failed' },
  ];

  const runningCount = rawWorkflows.filter((w: any) => w.status?.toLowerCase() === 'running').length;

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
        onNameChange={setNewWorkflowName}
        onDescriptionChange={setNewWorkflowDescription}
        onSopUrlsChange={setNewSopUrls}
        onRuntimeAgentsChange={setNewRuntimeAgents}
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

        <Button size="sm" onClick={handleCreateNew} className="shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Workflow
        </Button>
      </div>

      {/* Status tabs + summary */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground shrink-0">
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          {runningCount > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600 dark:text-blue-400">{runningCount} running</span>
            </span>
          )}
        </p>
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
            searchQuery || statusFilter
              ? 'No workflows match your filters. Try adjusting your search or status.'
              : 'Create your first workflow to start building automation pipelines.'
          }
          action={
            !searchQuery && !statusFilter ? (
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
              onRun={() => {}}
              onDuplicate={() => void handleDuplicateWorkflow(wf.id)}
              onDelete={() => void handleDeleteWorkflow(wf.id)}
            />
          ))}
        </div>
      )}
    </SidebarLayout>
  );
}
