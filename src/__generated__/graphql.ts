/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AgentType = {
  __typename?: 'AgentType';
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastSeenAt?: Maybe<Scalars['String']['output']>;
  latestStatus?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pipelines: Array<Scalars['String']['output']>;
  recentExecutions: Array<RecentExecutionType>;
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type AuthPayloadType = {
  __typename?: 'AuthPayloadType';
  token?: Maybe<Scalars['String']['output']>;
  user?: Maybe<UserType>;
};

export type DashboardStatsType = {
  __typename?: 'DashboardStatsType';
  activeWorkflows: Scalars['Int']['output'];
  onlineAgents: Scalars['Int']['output'];
  totalAgents: Scalars['Int']['output'];
  totalTransactions: Scalars['Int']['output'];
};

export type ForgotPassword = {
  __typename?: 'ForgotPassword';
  message?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['Boolean']['output']>;
};

export type LicenseStatusType = {
  __typename?: 'LicenseStatusType';
  clientId: Scalars['String']['output'];
  daysLeft: Scalars['Int']['output'];
  expiresAt: Scalars['String']['output'];
  features: Array<Scalars['String']['output']>;
  issuedAt: Scalars['String']['output'];
  licenseId: Scalars['String']['output'];
  maxAgents: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  tier: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  advanceRun: RunAdvanceResultType;
  createWorkflow: WorkflowType;
  deleteWorkflow: Scalars['Boolean']['output'];
  forgotPassword?: Maybe<ForgotPassword>;
  login?: Maybe<AuthPayloadType>;
  resetPassword?: Maybe<ForgotPassword>;
  signup?: Maybe<AuthPayloadType>;
  startRun: WorkflowRunType;
  startStep: StartStepResultType;
  updateUserRole?: Maybe<UserType>;
  updateUserStatus?: Maybe<UserType>;
  updateWorkflow: WorkflowType;
};


export type MutationAdvanceRunArgs = {
  runId: Scalars['ID']['input'];
};


export type MutationCreateWorkflowArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  edges: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  nodes: Scalars['String']['input'];
};


export type MutationDeleteWorkflowArgs = {
  id: Scalars['ID']['input'];
};


export type MutationForgotPasswordArgs = {
  callBackUrl: Scalars['String']['input'];
  emailId: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationResetPasswordArgs = {
  email: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
  oldPassword: Scalars['String']['input'];
};


export type MutationSignupArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  role?: InputMaybe<UserRoleEnumType>;
};


export type MutationStartRunArgs = {
  context?: InputMaybe<Scalars['String']['input']>;
  workflowId: Scalars['ID']['input'];
};


export type MutationStartStepArgs = {
  input?: InputMaybe<Scalars['String']['input']>;
  runId: Scalars['ID']['input'];
  workbenchId: Scalars['ID']['input'];
};


export type MutationUpdateUserRoleArgs = {
  id: Scalars['ID']['input'];
  role: UserRoleEnumType;
};


export type MutationUpdateUserStatusArgs = {
  id: Scalars['ID']['input'];
  status: UserStatusEnumType;
};


export type MutationUpdateWorkflowArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  edges: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  nodes: Scalars['String']['input'];
};

export type PaginationType = {
  __typename?: 'PaginationType';
  cursor?: Maybe<Scalars['ID']['output']>;
  hasNextPage?: Maybe<Scalars['Boolean']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type Query = {
  __typename?: 'Query';
  agent?: Maybe<AgentType>;
  agents: Array<AgentType>;
  dashboardStats: DashboardStatsType;
  licenseStatus?: Maybe<LicenseStatusType>;
  me?: Maybe<UserType>;
  transaction?: Maybe<TransactionType>;
  transactions: TransactionsConnectionType;
  user: UserType;
  users: UsersType;
  workflow?: Maybe<WorkflowType>;
  workflowRun?: Maybe<WorkflowRunType>;
  workflowRuns: WorkflowRunsConnectionType;
  workflows: WorkflowsConnectionType;
};


export type QueryAgentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAgentsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTransactionsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  workflowId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  filters?: InputMaybe<UserFilterInputType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sortType?: InputMaybe<SortTypeEnumType>;
};


export type QueryWorkflowArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkflowRunArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkflowRunsArgs = {
  workflowId: Scalars['ID']['input'];
};


export type QueryWorkflowsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type RecentExecutionType = {
  __typename?: 'RecentExecutionType';
  agentName: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  pipelineName: Scalars['String']['output'];
  status: Scalars['String']['output'];
  stepOrder: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
};

export type RunAdvanceResultType = {
  __typename?: 'RunAdvanceResultType';
  done: Scalars['Boolean']['output'];
  nextWorkbench?: Maybe<WorkbenchInfoType>;
  outcome?: Maybe<Scalars['String']['output']>;
};

export enum SortTypeEnumType {
  Ascending = 'ASCENDING',
  Descending = 'DESCENDING'
}

export type StartStepResultType = {
  __typename?: 'StartStepResultType';
  awaitingInput: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  inputPrompt?: Maybe<Scalars['String']['output']>;
  inputs?: Maybe<Scalars['String']['output']>;
  outputs?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type StepType = {
  __typename?: 'StepType';
  agentType: Scalars['String']['output'];
  config?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  workflowId: Scalars['String']['output'];
};

export type TaskType = {
  __typename?: 'TaskType';
  agent?: Maybe<AgentType>;
  agentId?: Maybe<Scalars['String']['output']>;
  agentName?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  input?: Maybe<Scalars['String']['output']>;
  output?: Maybe<Scalars['String']['output']>;
  pipelineName?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  stepId?: Maybe<Scalars['String']['output']>;
  stepOrder?: Maybe<Scalars['Int']['output']>;
  transactionId: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type TransactionType = {
  __typename?: 'TransactionType';
  createdAt: Scalars['String']['output'];
  finishedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  pipelineName?: Maybe<Scalars['String']['output']>;
  results?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tasks: Array<TaskType>;
  triggeredBy?: Maybe<Scalars['String']['output']>;
  workflow?: Maybe<WorkflowType>;
  workflowId: Scalars['String']['output'];
};

export type TransactionsConnectionType = {
  __typename?: 'TransactionsConnectionType';
  cursor?: Maybe<Scalars['String']['output']>;
  hasMore: Scalars['String']['output'];
  nodes: Array<TransactionType>;
  total: Scalars['Int']['output'];
};

export type UserFilterInputType = {
  roles?: InputMaybe<Array<InputMaybe<UserRoleEnumType>>>;
  status?: InputMaybe<UserStatusEnumType>;
  text?: InputMaybe<Scalars['String']['input']>;
};

/** User roles in the system */
export enum UserRoleEnumType {
  /** Administrator with full access */
  Admin = 'ADMIN',
  /** Standard user with read access */
  User = 'USER'
}

/** User status enumeration */
export enum UserStatusEnumType {
  /** Active user */
  Active = 'ACTIVE',
  /** Deleted user */
  Deleted = 'DELETED',
  /** Inactive user */
  Inactive = 'INACTIVE',
  /** Pending verification */
  Pending = 'PENDING',
  /** Suspended user */
  Suspended = 'SUSPENDED'
}

export type UserType = {
  __typename?: 'UserType';
  createdAt?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastLoginAt?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  role: UserRoleEnumType;
  status: UserStatusEnumType;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type UsersType = {
  __typename?: 'UsersType';
  nodes: Array<UserType>;
  pageInfo: PaginationType;
};

export type WorkbenchInfoType = {
  __typename?: 'WorkbenchInfoType';
  executorType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
};

export type WorkbenchRunType = {
  __typename?: 'WorkbenchRunType';
  awaitingInput: Scalars['Boolean']['output'];
  completedAt?: Maybe<Scalars['String']['output']>;
  executorType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inputPrompt?: Maybe<Scalars['String']['output']>;
  inputs?: Maybe<Scalars['String']['output']>;
  outputs?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  workbench: Scalars['String']['output'];
  workbenchName: Scalars['String']['output'];
};

export type WorkflowRunType = {
  __typename?: 'WorkflowRunType';
  completedAt?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  currentWorkbench?: Maybe<WorkbenchInfoType>;
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  pipelineRunId?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  workbenchRuns: Array<WorkbenchRunType>;
  workflow: Scalars['String']['output'];
  workflowName: Scalars['String']['output'];
};

export type WorkflowRunsConnectionType = {
  __typename?: 'WorkflowRunsConnectionType';
  nodes: Array<WorkflowRunType>;
  total: Scalars['Int']['output'];
};

export type WorkflowType = {
  __typename?: 'WorkflowType';
  agentCount?: Maybe<Scalars['Int']['output']>;
  config?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  edges?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  nodes?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  steps: Array<StepType>;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type WorkflowsConnectionType = {
  __typename?: 'WorkflowsConnectionType';
  cursor?: Maybe<Scalars['String']['output']>;
  hasMore: Scalars['String']['output'];
  nodes: Array<WorkflowType>;
  total: Scalars['Int']['output'];
};

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login?: { __typename?: 'AuthPayloadType', token?: string | null, user?: { __typename?: 'UserType', id: string, email?: string | null, name?: string | null, status: UserStatusEnumType, role: UserRoleEnumType, lastLoginAt?: string | null, createdAt?: string | null } | null } | null };

export type AgentFieldsFragment = { __typename?: 'AgentType', id: string, name: string, type: string, status: string, latestStatus?: string | null, pipelines: Array<string>, lastSeenAt?: string | null, metadata?: string | null, createdAt?: string | null, updatedAt?: string | null, recentExecutions: Array<{ __typename?: 'RecentExecutionType', id: string, agentName: string, pipelineName: string, stepOrder: number, status: string, createdAt: string, updatedAt: string }> } & { ' $fragmentName'?: 'AgentFieldsFragment' };

export type ListAgentsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListAgentsQuery = { __typename?: 'Query', agents: Array<(
    { __typename?: 'AgentType' }
    & { ' $fragmentRefs'?: { 'AgentFieldsFragment': AgentFieldsFragment } }
  )> };

export type GetAgentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetAgentQuery = { __typename?: 'Query', agent?: (
    { __typename?: 'AgentType' }
    & { ' $fragmentRefs'?: { 'AgentFieldsFragment': AgentFieldsFragment } }
  ) | null };

export type SignupMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  name: Scalars['String']['input'];
  role?: InputMaybe<UserRoleEnumType>;
}>;


export type SignupMutation = { __typename?: 'Mutation', signup?: { __typename?: 'AuthPayloadType', token?: string | null, user?: { __typename?: 'UserType', id: string, email?: string | null, name?: string | null, status: UserStatusEnumType, role: UserRoleEnumType } | null } | null };

export type UserByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserByIdQuery = { __typename?: 'Query', user: { __typename?: 'UserType', id: string, email?: string | null, name?: string | null, status: UserStatusEnumType, role: UserRoleEnumType, lastLoginAt?: string | null, createdAt?: string | null, updatedAt?: string | null } };

export type UsersQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  filters?: InputMaybe<UserFilterInputType>;
  sortType?: InputMaybe<SortTypeEnumType>;
}>;


export type UsersQuery = { __typename?: 'Query', users: { __typename?: 'UsersType', nodes: Array<{ __typename?: 'UserType', id: string, email?: string | null, name?: string | null, status: UserStatusEnumType, role: UserRoleEnumType, lastLoginAt?: string | null, createdAt?: string | null }>, pageInfo: { __typename?: 'PaginationType', hasNextPage?: boolean | null, cursor?: string | null, totalCount?: number | null } } };

export type UpdateUserRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  role: UserRoleEnumType;
}>;


export type UpdateUserRoleMutation = { __typename?: 'Mutation', updateUserRole?: { __typename?: 'UserType', id: string, email?: string | null, name?: string | null, role: UserRoleEnumType, status: UserStatusEnumType } | null };

export type UpdateUserStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: UserStatusEnumType;
}>;


export type UpdateUserStatusMutation = { __typename?: 'Mutation', updateUserStatus?: { __typename?: 'UserType', id: string, email?: string | null, name?: string | null, role: UserRoleEnumType, status: UserStatusEnumType } | null };

export type DashboardStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type DashboardStatsQuery = { __typename?: 'Query', dashboardStats: { __typename?: 'DashboardStatsType', totalAgents: number, onlineAgents: number, activeWorkflows: number, totalTransactions: number } };

export type LicenseStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type LicenseStatusQuery = { __typename?: 'Query', licenseStatus?: { __typename?: 'LicenseStatusType', clientId: string, tier: string, maxAgents: number, features: Array<string>, issuedAt: string, expiresAt: string, licenseId: string, daysLeft: number, status: string } | null };

export type TransactionFieldsFragment = { __typename?: 'TransactionType', id: string, workflowId: string, status: string, triggeredBy?: string | null, startedAt?: string | null, finishedAt?: string | null, createdAt: string, workflow?: { __typename?: 'WorkflowType', id: string, name: string } | null } & { ' $fragmentName'?: 'TransactionFieldsFragment' };

export type ListTransactionsQueryVariables = Exact<{
  workflowId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListTransactionsQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionsConnectionType', total: number, hasMore: string, cursor?: string | null, nodes: Array<(
      { __typename?: 'TransactionType' }
      & { ' $fragmentRefs'?: { 'TransactionFieldsFragment': TransactionFieldsFragment } }
    )> } };

export type GetTransactionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransactionQuery = { __typename?: 'Query', transaction?: (
    { __typename?: 'TransactionType', results?: string | null, tasks: Array<{ __typename?: 'TaskType', id: string, agentId?: string | null, stepId?: string | null, status: string, input?: string | null, output?: string | null, error?: string | null, startedAt?: string | null, finishedAt?: string | null, createdAt?: string | null, agent?: { __typename?: 'AgentType', id: string, name: string, type: string } | null }> }
    & { ' $fragmentRefs'?: { 'TransactionFieldsFragment': TransactionFieldsFragment } }
  ) | null };

export type WorkflowSummaryFieldsFragment = { __typename?: 'WorkflowType', id: string, name: string, description?: string | null, isActive?: boolean | null, status?: string | null, createdAt?: string | null, updatedAt?: string | null } & { ' $fragmentName'?: 'WorkflowSummaryFieldsFragment' };

export type WorkflowDetailFieldsFragment = { __typename?: 'WorkflowType', id: string, name: string, description?: string | null, isActive?: boolean | null, status?: string | null, nodes?: string | null, edges?: string | null, createdAt?: string | null, updatedAt?: string | null } & { ' $fragmentName'?: 'WorkflowDetailFieldsFragment' };

export type WorkbenchInfoFieldsFragment = { __typename?: 'WorkbenchInfoType', id: string, name: string, executorType: string, order: number } & { ' $fragmentName'?: 'WorkbenchInfoFieldsFragment' };

export type WorkbenchRunFieldsFragment = { __typename?: 'WorkbenchRunType', id: string, workbench: string, workbenchName: string, executorType: string, status: string, awaitingInput: boolean, inputPrompt?: string | null, inputs?: string | null, outputs?: string | null, startedAt?: string | null, completedAt?: string | null } & { ' $fragmentName'?: 'WorkbenchRunFieldsFragment' };

export type WorkflowRunFieldsFragment = { __typename?: 'WorkflowRunType', id: string, workflow: string, workflowName: string, status: string, pipelineRunId?: string | null, error?: string | null, startedAt?: string | null, completedAt?: string | null, createdAt?: string | null, currentWorkbench?: (
    { __typename?: 'WorkbenchInfoType' }
    & { ' $fragmentRefs'?: { 'WorkbenchInfoFieldsFragment': WorkbenchInfoFieldsFragment } }
  ) | null, workbenchRuns: Array<(
    { __typename?: 'WorkbenchRunType' }
    & { ' $fragmentRefs'?: { 'WorkbenchRunFieldsFragment': WorkbenchRunFieldsFragment } }
  )> } & { ' $fragmentName'?: 'WorkflowRunFieldsFragment' };

export type ListWorkflowsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListWorkflowsQuery = { __typename?: 'Query', workflows: { __typename?: 'WorkflowsConnectionType', total: number, nodes: Array<(
      { __typename?: 'WorkflowType' }
      & { ' $fragmentRefs'?: { 'WorkflowSummaryFieldsFragment': WorkflowSummaryFieldsFragment } }
    )> } };

export type GetWorkflowQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWorkflowQuery = { __typename?: 'Query', workflow?: (
    { __typename?: 'WorkflowType' }
    & { ' $fragmentRefs'?: { 'WorkflowDetailFieldsFragment': WorkflowDetailFieldsFragment } }
  ) | null };

export type GetWorkflowRunsQueryVariables = Exact<{
  workflowId: Scalars['ID']['input'];
}>;


export type GetWorkflowRunsQuery = { __typename?: 'Query', workflowRuns: { __typename?: 'WorkflowRunsConnectionType', total: number, nodes: Array<(
      { __typename?: 'WorkflowRunType' }
      & { ' $fragmentRefs'?: { 'WorkflowRunFieldsFragment': WorkflowRunFieldsFragment } }
    )> } };

export type GetWorkflowRunQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWorkflowRunQuery = { __typename?: 'Query', workflowRun?: (
    { __typename?: 'WorkflowRunType' }
    & { ' $fragmentRefs'?: { 'WorkflowRunFieldsFragment': WorkflowRunFieldsFragment } }
  ) | null };

export type CreateWorkflowMutationVariables = Exact<{
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  nodes: Scalars['String']['input'];
  edges: Scalars['String']['input'];
}>;


export type CreateWorkflowMutation = { __typename?: 'Mutation', createWorkflow: (
    { __typename?: 'WorkflowType' }
    & { ' $fragmentRefs'?: { 'WorkflowDetailFieldsFragment': WorkflowDetailFieldsFragment } }
  ) };

export type UpdateWorkflowMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  nodes: Scalars['String']['input'];
  edges: Scalars['String']['input'];
}>;


export type UpdateWorkflowMutation = { __typename?: 'Mutation', updateWorkflow: (
    { __typename?: 'WorkflowType' }
    & { ' $fragmentRefs'?: { 'WorkflowDetailFieldsFragment': WorkflowDetailFieldsFragment } }
  ) };

export type DeleteWorkflowMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWorkflowMutation = { __typename?: 'Mutation', deleteWorkflow: boolean };

export type StartRunMutationVariables = Exact<{
  workflowId: Scalars['ID']['input'];
  context?: InputMaybe<Scalars['String']['input']>;
}>;


export type StartRunMutation = { __typename?: 'Mutation', startRun: (
    { __typename?: 'WorkflowRunType' }
    & { ' $fragmentRefs'?: { 'WorkflowRunFieldsFragment': WorkflowRunFieldsFragment } }
  ) };

export type StartStepMutationVariables = Exact<{
  runId: Scalars['ID']['input'];
  workbenchId: Scalars['ID']['input'];
  input?: InputMaybe<Scalars['String']['input']>;
}>;


export type StartStepMutation = { __typename?: 'Mutation', startStep: { __typename?: 'StartStepResultType', id: string, status: string, awaitingInput: boolean, inputPrompt?: string | null, inputs?: string | null, outputs?: string | null } };

export type AdvanceRunMutationVariables = Exact<{
  runId: Scalars['ID']['input'];
}>;


export type AdvanceRunMutation = { __typename?: 'Mutation', advanceRun: { __typename?: 'RunAdvanceResultType', done: boolean, outcome?: string | null, nextWorkbench?: (
      { __typename?: 'WorkbenchInfoType' }
      & { ' $fragmentRefs'?: { 'WorkbenchInfoFieldsFragment': WorkbenchInfoFieldsFragment } }
    ) | null } };

export const AgentFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AgentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AgentType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"latestStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pipelines"}},{"kind":"Field","name":{"kind":"Name","value":"recentExecutions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"agentName"}},{"kind":"Field","name":{"kind":"Name","value":"pipelineName"}},{"kind":"Field","name":{"kind":"Name","value":"stepOrder"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AgentFieldsFragment, unknown>;
export const TransactionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TransactionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflowId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<TransactionFieldsFragment, unknown>;
export const WorkflowSummaryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<WorkflowSummaryFieldsFragment, unknown>;
export const WorkflowDetailFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowDetailFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"}},{"kind":"Field","name":{"kind":"Name","value":"edges"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<WorkflowDetailFieldsFragment, unknown>;
export const WorkbenchInfoFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchInfoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchInfoType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]} as unknown as DocumentNode<WorkbenchInfoFieldsFragment, unknown>;
export const WorkbenchRunFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workbench"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchName"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingInput"}},{"kind":"Field","name":{"kind":"Name","value":"inputPrompt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"}},{"kind":"Field","name":{"kind":"Name","value":"outputs"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]} as unknown as DocumentNode<WorkbenchRunFieldsFragment, unknown>;
export const WorkflowRunFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"}},{"kind":"Field","name":{"kind":"Name","value":"workflowName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentWorkbench"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchInfoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pipelineRunId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchRuns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchRunFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchInfoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchInfoType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workbench"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchName"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingInput"}},{"kind":"Field","name":{"kind":"Name","value":"inputPrompt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"}},{"kind":"Field","name":{"kind":"Name","value":"outputs"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]} as unknown as DocumentNode<WorkflowRunFieldsFragment, unknown>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const ListAgentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListAgents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"agents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AgentFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AgentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AgentType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"latestStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pipelines"}},{"kind":"Field","name":{"kind":"Name","value":"recentExecutions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"agentName"}},{"kind":"Field","name":{"kind":"Name","value":"pipelineName"}},{"kind":"Field","name":{"kind":"Name","value":"stepOrder"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ListAgentsQuery, ListAgentsQueryVariables>;
export const GetAgentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAgent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"agent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AgentFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AgentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AgentType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"latestStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pipelines"}},{"kind":"Field","name":{"kind":"Name","value":"recentExecutions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"agentName"}},{"kind":"Field","name":{"kind":"Name","value":"pipelineName"}},{"kind":"Field","name":{"kind":"Name","value":"stepOrder"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetAgentQuery, GetAgentQueryVariables>;
export const SignupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Signup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRoleEnumType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<SignupMutation, SignupMutationVariables>;
export const UserByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UserByIdQuery, UserByIdQueryVariables>;
export const UsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Users"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"UserFilterInputType"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SortTypeEnumType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoginAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]} as unknown as DocumentNode<UsersQuery, UsersQueryVariables>;
export const UpdateUserRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserRoleEnumType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>;
export const UpdateUserStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserStatusEnumType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdateUserStatusMutation, UpdateUserStatusMutationVariables>;
export const DashboardStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DashboardStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dashboardStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAgents"}},{"kind":"Field","name":{"kind":"Name","value":"onlineAgents"}},{"kind":"Field","name":{"kind":"Name","value":"activeWorkflows"}},{"kind":"Field","name":{"kind":"Name","value":"totalTransactions"}}]}}]}}]} as unknown as DocumentNode<DashboardStatsQuery, DashboardStatsQueryVariables>;
export const LicenseStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LicenseStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"licenseStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"maxAgents"}},{"kind":"Field","name":{"kind":"Name","value":"features"}},{"kind":"Field","name":{"kind":"Name","value":"issuedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"licenseId"}},{"kind":"Field","name":{"kind":"Name","value":"daysLeft"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<LicenseStatusQuery, LicenseStatusQueryVariables>;
export const ListTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workflowId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workflowId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workflowId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TransactionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}},{"kind":"Field","name":{"kind":"Name","value":"cursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TransactionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflowId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ListTransactionsQuery, ListTransactionsQueryVariables>;
export const GetTransactionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTransaction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TransactionFields"}},{"kind":"Field","name":{"kind":"Name","value":"results"}},{"kind":"Field","name":{"kind":"Name","value":"tasks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"agentId"}},{"kind":"Field","name":{"kind":"Name","value":"stepId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"agent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TransactionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflowId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"triggeredBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<GetTransactionQuery, GetTransactionQueryVariables>;
export const ListWorkflowsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListWorkflows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workflows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowSummaryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ListWorkflowsQuery, ListWorkflowsQueryVariables>;
export const GetWorkflowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkflow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workflow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowDetailFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowDetailFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"}},{"kind":"Field","name":{"kind":"Name","value":"edges"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetWorkflowQuery, GetWorkflowQueryVariables>;
export const GetWorkflowRunsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkflowRuns"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workflowId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workflowRuns"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workflowId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workflowId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowRunFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchInfoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchInfoType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workbench"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchName"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingInput"}},{"kind":"Field","name":{"kind":"Name","value":"inputPrompt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"}},{"kind":"Field","name":{"kind":"Name","value":"outputs"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"}},{"kind":"Field","name":{"kind":"Name","value":"workflowName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentWorkbench"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchInfoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pipelineRunId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchRuns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchRunFields"}}]}}]}}]} as unknown as DocumentNode<GetWorkflowRunsQuery, GetWorkflowRunsQueryVariables>;
export const GetWorkflowRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkflowRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workflowRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowRunFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchInfoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchInfoType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workbench"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchName"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingInput"}},{"kind":"Field","name":{"kind":"Name","value":"inputPrompt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"}},{"kind":"Field","name":{"kind":"Name","value":"outputs"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"}},{"kind":"Field","name":{"kind":"Name","value":"workflowName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentWorkbench"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchInfoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pipelineRunId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchRuns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchRunFields"}}]}}]}}]} as unknown as DocumentNode<GetWorkflowRunQuery, GetWorkflowRunQueryVariables>;
export const CreateWorkflowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkflow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nodes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"edges"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkflow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"isActive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}}},{"kind":"Argument","name":{"kind":"Name","value":"nodes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nodes"}}},{"kind":"Argument","name":{"kind":"Name","value":"edges"},"value":{"kind":"Variable","name":{"kind":"Name","value":"edges"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowDetailFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowDetailFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"}},{"kind":"Field","name":{"kind":"Name","value":"edges"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateWorkflowMutation, CreateWorkflowMutationVariables>;
export const UpdateWorkflowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkflow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nodes"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"edges"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkflow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"isActive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isActive"}}},{"kind":"Argument","name":{"kind":"Name","value":"nodes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nodes"}}},{"kind":"Argument","name":{"kind":"Name","value":"edges"},"value":{"kind":"Variable","name":{"kind":"Name","value":"edges"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowDetailFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowDetailFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"}},{"kind":"Field","name":{"kind":"Name","value":"edges"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateWorkflowMutation, UpdateWorkflowMutationVariables>;
export const DeleteWorkflowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteWorkflow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteWorkflow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteWorkflowMutation, DeleteWorkflowMutationVariables>;
export const StartRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workflowId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"context"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workflowId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workflowId"}}},{"kind":"Argument","name":{"kind":"Name","value":"context"},"value":{"kind":"Variable","name":{"kind":"Name","value":"context"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkflowRunFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchInfoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchInfoType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workbench"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchName"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingInput"}},{"kind":"Field","name":{"kind":"Name","value":"inputPrompt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"}},{"kind":"Field","name":{"kind":"Name","value":"outputs"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkflowRunFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkflowRunType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workflow"}},{"kind":"Field","name":{"kind":"Name","value":"workflowName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentWorkbench"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchInfoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pipelineRunId"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"workbenchRuns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchRunFields"}}]}}]}}]} as unknown as DocumentNode<StartRunMutation, StartRunMutationVariables>;
export const StartStepDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartStep"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"runId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workbenchId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startStep"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"runId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"runId"}}},{"kind":"Argument","name":{"kind":"Name","value":"workbenchId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workbenchId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"awaitingInput"}},{"kind":"Field","name":{"kind":"Name","value":"inputPrompt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"}},{"kind":"Field","name":{"kind":"Name","value":"outputs"}}]}}]}}]} as unknown as DocumentNode<StartStepMutation, StartStepMutationVariables>;
export const AdvanceRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdvanceRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"runId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"advanceRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"runId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"runId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"done"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkbench"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WorkbenchInfoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"outcome"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WorkbenchInfoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"WorkbenchInfoType"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"executorType"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]} as unknown as DocumentNode<AdvanceRunMutation, AdvanceRunMutationVariables>;