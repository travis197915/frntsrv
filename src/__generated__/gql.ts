/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n    }\n  }\n": typeof types.LoginDocument,
    "\n  fragment AgentFields on AgentType {\n    id\n    name\n    type\n    status\n    latestStatus\n    pipelines\n    recentExecutions {\n      id\n      agentName\n      pipelineName\n      stepOrder\n      status\n      createdAt\n      updatedAt\n    }\n    lastSeenAt\n    metadata\n    createdAt\n    updatedAt\n  }\n": typeof types.AgentFieldsFragmentDoc,
    "\n  query ListAgents($status: String) {\n    agents(status: $status) {\n      ...AgentFields\n    }\n  }\n  \n": typeof types.ListAgentsDocument,
    "\n  query GetAgent($id: ID!) {\n    agent(id: $id) {\n      ...AgentFields\n    }\n  }\n  \n": typeof types.GetAgentDocument,
    "\n  mutation Signup($email: String!, $password: String!, $name: String!, $role: UserRoleEnumType) {\n    signup(email: $email, password: $password, name: $name, role: $role) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n      }\n    }\n  }\n": typeof types.SignupDocument,
    "\n  query UserById($id: ID!) {\n    user(id: $id) {\n      id\n      email\n      name\n      status\n      role\n      lastLoginAt\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.UserByIdDocument,
    "\n  query Users($cursor: ID, $limit: Int, $filters: UserFilterInputType, $sortType: SortTypeEnumType) {\n    users(cursor: $cursor, limit: $limit, filters: $filters, sortType: $sortType) {\n      nodes {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n      pageInfo {\n        hasNextPage\n        cursor\n        totalCount\n      }\n    }\n  }\n": typeof types.UsersDocument,
    "\n  mutation UpdateUserRole($id: ID!, $role: UserRoleEnumType!) {\n    updateUserRole(id: $id, role: $role) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n": typeof types.UpdateUserRoleDocument,
    "\n  mutation UpdateUserStatus($id: ID!, $status: UserStatusEnumType!) {\n    updateUserStatus(id: $id, status: $status) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n": typeof types.UpdateUserStatusDocument,
    "\n  query DashboardStats {\n    dashboardStats {\n      totalAgents\n      onlineAgents\n      activeWorkflows\n      totalTransactions\n    }\n  }\n": typeof types.DashboardStatsDocument,
    "\n  query LicenseStatus {\n    licenseStatus {\n      clientId\n      tier\n      maxAgents\n      features\n      issuedAt\n      expiresAt\n      licenseId\n      daysLeft\n      status\n    }\n  }\n": typeof types.LicenseStatusDocument,
    "\n  fragment TransactionFields on TransactionType {\n    id\n    workflowId\n    status\n    triggeredBy\n    startedAt\n    finishedAt\n    createdAt\n    workflow {\n      id\n      name\n    }\n  }\n": typeof types.TransactionFieldsFragmentDoc,
    "\n  query ListTransactions($workflowId: ID, $status: String, $limit: Int, $cursor: String) {\n    transactions(workflowId: $workflowId, status: $status, limit: $limit, cursor: $cursor) {\n      nodes {\n        ...TransactionFields\n      }\n      total\n      hasMore\n      cursor\n    }\n  }\n  \n": typeof types.ListTransactionsDocument,
    "\n  query GetTransaction($id: ID!) {\n    transaction(id: $id) {\n      ...TransactionFields\n      results\n      tasks {\n        id\n        agentId\n        stepId\n        status\n        input\n        output\n        error\n        startedAt\n        finishedAt\n        createdAt\n        agent {\n          id\n          name\n          type\n        }\n      }\n    }\n  }\n  \n": typeof types.GetTransactionDocument,
    "\n  fragment WorkflowSummaryFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    createdAt\n    updatedAt\n  }\n": typeof types.WorkflowSummaryFieldsFragmentDoc,
    "\n  fragment WorkflowDetailFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    nodes\n    edges\n    createdAt\n    updatedAt\n  }\n": typeof types.WorkflowDetailFieldsFragmentDoc,
    "\n  fragment WorkbenchInfoFields on WorkbenchInfoType {\n    id\n    name\n    executorType\n    order\n  }\n": typeof types.WorkbenchInfoFieldsFragmentDoc,
    "\n  fragment WorkbenchRunFields on WorkbenchRunType {\n    id\n    workbench\n    workbenchName\n    executorType\n    status\n    awaitingInput\n    inputPrompt\n    inputs\n    outputs\n    startedAt\n    completedAt\n  }\n": typeof types.WorkbenchRunFieldsFragmentDoc,
    "\n  fragment WorkflowRunFields on WorkflowRunType {\n    id\n    workflow\n    workflowName\n    status\n    currentWorkbench {\n      ...WorkbenchInfoFields\n    }\n    pipelineRunId\n    error\n    startedAt\n    completedAt\n    createdAt\n    workbenchRuns {\n      ...WorkbenchRunFields\n    }\n  }\n  \n  \n": typeof types.WorkflowRunFieldsFragmentDoc,
    "\n  query ListWorkflows {\n    workflows {\n      nodes {\n        ...WorkflowSummaryFields\n      }\n      total\n    }\n  }\n  \n": typeof types.ListWorkflowsDocument,
    "\n  query GetWorkflow($id: ID!) {\n    workflow(id: $id) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n": typeof types.GetWorkflowDocument,
    "\n  query GetWorkflowRuns($workflowId: ID!) {\n    workflowRuns(workflowId: $workflowId) {\n      nodes {\n        ...WorkflowRunFields\n      }\n      total\n    }\n  }\n  \n": typeof types.GetWorkflowRunsDocument,
    "\n  query GetWorkflowRun($id: ID!) {\n    workflowRun(id: $id) {\n      ...WorkflowRunFields\n    }\n  }\n  \n": typeof types.GetWorkflowRunDocument,
    "\n  mutation CreateWorkflow(\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    createWorkflow(\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n": typeof types.CreateWorkflowDocument,
    "\n  mutation UpdateWorkflow(\n    $id: ID!\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    updateWorkflow(\n      id: $id\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n": typeof types.UpdateWorkflowDocument,
    "\n  mutation DeleteWorkflow($id: ID!) {\n    deleteWorkflow(id: $id)\n  }\n": typeof types.DeleteWorkflowDocument,
    "\n  mutation StartRun($workflowId: ID!, $context: String) {\n    startRun(workflowId: $workflowId, context: $context) {\n      ...WorkflowRunFields\n    }\n  }\n  \n": typeof types.StartRunDocument,
    "\n  mutation StartStep($runId: ID!, $workbenchId: ID!, $input: String) {\n    startStep(runId: $runId, workbenchId: $workbenchId, input: $input) {\n      id\n      status\n      awaitingInput\n      inputPrompt\n      inputs\n      outputs\n    }\n  }\n": typeof types.StartStepDocument,
    "\n  mutation AdvanceRun($runId: ID!) {\n    advanceRun(runId: $runId) {\n      done\n      nextWorkbench {\n        ...WorkbenchInfoFields\n      }\n      outcome\n    }\n  }\n  \n": typeof types.AdvanceRunDocument,
};
const documents: Documents = {
    "\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n    }\n  }\n": types.LoginDocument,
    "\n  fragment AgentFields on AgentType {\n    id\n    name\n    type\n    status\n    latestStatus\n    pipelines\n    recentExecutions {\n      id\n      agentName\n      pipelineName\n      stepOrder\n      status\n      createdAt\n      updatedAt\n    }\n    lastSeenAt\n    metadata\n    createdAt\n    updatedAt\n  }\n": types.AgentFieldsFragmentDoc,
    "\n  query ListAgents($status: String) {\n    agents(status: $status) {\n      ...AgentFields\n    }\n  }\n  \n": types.ListAgentsDocument,
    "\n  query GetAgent($id: ID!) {\n    agent(id: $id) {\n      ...AgentFields\n    }\n  }\n  \n": types.GetAgentDocument,
    "\n  mutation Signup($email: String!, $password: String!, $name: String!, $role: UserRoleEnumType) {\n    signup(email: $email, password: $password, name: $name, role: $role) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n      }\n    }\n  }\n": types.SignupDocument,
    "\n  query UserById($id: ID!) {\n    user(id: $id) {\n      id\n      email\n      name\n      status\n      role\n      lastLoginAt\n      createdAt\n      updatedAt\n    }\n  }\n": types.UserByIdDocument,
    "\n  query Users($cursor: ID, $limit: Int, $filters: UserFilterInputType, $sortType: SortTypeEnumType) {\n    users(cursor: $cursor, limit: $limit, filters: $filters, sortType: $sortType) {\n      nodes {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n      pageInfo {\n        hasNextPage\n        cursor\n        totalCount\n      }\n    }\n  }\n": types.UsersDocument,
    "\n  mutation UpdateUserRole($id: ID!, $role: UserRoleEnumType!) {\n    updateUserRole(id: $id, role: $role) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n": types.UpdateUserRoleDocument,
    "\n  mutation UpdateUserStatus($id: ID!, $status: UserStatusEnumType!) {\n    updateUserStatus(id: $id, status: $status) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n": types.UpdateUserStatusDocument,
    "\n  query DashboardStats {\n    dashboardStats {\n      totalAgents\n      onlineAgents\n      activeWorkflows\n      totalTransactions\n    }\n  }\n": types.DashboardStatsDocument,
    "\n  query LicenseStatus {\n    licenseStatus {\n      clientId\n      tier\n      maxAgents\n      features\n      issuedAt\n      expiresAt\n      licenseId\n      daysLeft\n      status\n    }\n  }\n": types.LicenseStatusDocument,
    "\n  fragment TransactionFields on TransactionType {\n    id\n    workflowId\n    status\n    triggeredBy\n    startedAt\n    finishedAt\n    createdAt\n    workflow {\n      id\n      name\n    }\n  }\n": types.TransactionFieldsFragmentDoc,
    "\n  query ListTransactions($workflowId: ID, $status: String, $limit: Int, $cursor: String) {\n    transactions(workflowId: $workflowId, status: $status, limit: $limit, cursor: $cursor) {\n      nodes {\n        ...TransactionFields\n      }\n      total\n      hasMore\n      cursor\n    }\n  }\n  \n": types.ListTransactionsDocument,
    "\n  query GetTransaction($id: ID!) {\n    transaction(id: $id) {\n      ...TransactionFields\n      results\n      tasks {\n        id\n        agentId\n        stepId\n        status\n        input\n        output\n        error\n        startedAt\n        finishedAt\n        createdAt\n        agent {\n          id\n          name\n          type\n        }\n      }\n    }\n  }\n  \n": types.GetTransactionDocument,
    "\n  fragment WorkflowSummaryFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    createdAt\n    updatedAt\n  }\n": types.WorkflowSummaryFieldsFragmentDoc,
    "\n  fragment WorkflowDetailFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    nodes\n    edges\n    createdAt\n    updatedAt\n  }\n": types.WorkflowDetailFieldsFragmentDoc,
    "\n  fragment WorkbenchInfoFields on WorkbenchInfoType {\n    id\n    name\n    executorType\n    order\n  }\n": types.WorkbenchInfoFieldsFragmentDoc,
    "\n  fragment WorkbenchRunFields on WorkbenchRunType {\n    id\n    workbench\n    workbenchName\n    executorType\n    status\n    awaitingInput\n    inputPrompt\n    inputs\n    outputs\n    startedAt\n    completedAt\n  }\n": types.WorkbenchRunFieldsFragmentDoc,
    "\n  fragment WorkflowRunFields on WorkflowRunType {\n    id\n    workflow\n    workflowName\n    status\n    currentWorkbench {\n      ...WorkbenchInfoFields\n    }\n    pipelineRunId\n    error\n    startedAt\n    completedAt\n    createdAt\n    workbenchRuns {\n      ...WorkbenchRunFields\n    }\n  }\n  \n  \n": types.WorkflowRunFieldsFragmentDoc,
    "\n  query ListWorkflows {\n    workflows {\n      nodes {\n        ...WorkflowSummaryFields\n      }\n      total\n    }\n  }\n  \n": types.ListWorkflowsDocument,
    "\n  query GetWorkflow($id: ID!) {\n    workflow(id: $id) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n": types.GetWorkflowDocument,
    "\n  query GetWorkflowRuns($workflowId: ID!) {\n    workflowRuns(workflowId: $workflowId) {\n      nodes {\n        ...WorkflowRunFields\n      }\n      total\n    }\n  }\n  \n": types.GetWorkflowRunsDocument,
    "\n  query GetWorkflowRun($id: ID!) {\n    workflowRun(id: $id) {\n      ...WorkflowRunFields\n    }\n  }\n  \n": types.GetWorkflowRunDocument,
    "\n  mutation CreateWorkflow(\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    createWorkflow(\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n": types.CreateWorkflowDocument,
    "\n  mutation UpdateWorkflow(\n    $id: ID!\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    updateWorkflow(\n      id: $id\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n": types.UpdateWorkflowDocument,
    "\n  mutation DeleteWorkflow($id: ID!) {\n    deleteWorkflow(id: $id)\n  }\n": types.DeleteWorkflowDocument,
    "\n  mutation StartRun($workflowId: ID!, $context: String) {\n    startRun(workflowId: $workflowId, context: $context) {\n      ...WorkflowRunFields\n    }\n  }\n  \n": types.StartRunDocument,
    "\n  mutation StartStep($runId: ID!, $workbenchId: ID!, $input: String) {\n    startStep(runId: $runId, workbenchId: $workbenchId, input: $input) {\n      id\n      status\n      awaitingInput\n      inputPrompt\n      inputs\n      outputs\n    }\n  }\n": types.StartStepDocument,
    "\n  mutation AdvanceRun($runId: ID!) {\n    advanceRun(runId: $runId) {\n      done\n      nextWorkbench {\n        ...WorkbenchInfoFields\n      }\n      outcome\n    }\n  }\n  \n": types.AdvanceRunDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Login($email: String!, $password: String!) {\n    login(email: $email, password: $password) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment AgentFields on AgentType {\n    id\n    name\n    type\n    status\n    latestStatus\n    pipelines\n    recentExecutions {\n      id\n      agentName\n      pipelineName\n      stepOrder\n      status\n      createdAt\n      updatedAt\n    }\n    lastSeenAt\n    metadata\n    createdAt\n    updatedAt\n  }\n"): (typeof documents)["\n  fragment AgentFields on AgentType {\n    id\n    name\n    type\n    status\n    latestStatus\n    pipelines\n    recentExecutions {\n      id\n      agentName\n      pipelineName\n      stepOrder\n      status\n      createdAt\n      updatedAt\n    }\n    lastSeenAt\n    metadata\n    createdAt\n    updatedAt\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query ListAgents($status: String) {\n    agents(status: $status) {\n      ...AgentFields\n    }\n  }\n  \n"): (typeof documents)["\n  query ListAgents($status: String) {\n    agents(status: $status) {\n      ...AgentFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAgent($id: ID!) {\n    agent(id: $id) {\n      ...AgentFields\n    }\n  }\n  \n"): (typeof documents)["\n  query GetAgent($id: ID!) {\n    agent(id: $id) {\n      ...AgentFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation Signup($email: String!, $password: String!, $name: String!, $role: UserRoleEnumType) {\n    signup(email: $email, password: $password, name: $name, role: $role) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Signup($email: String!, $password: String!, $name: String!, $role: UserRoleEnumType) {\n    signup(email: $email, password: $password, name: $name, role: $role) {\n      token\n      user {\n        id\n        email\n        name\n        status\n        role\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query UserById($id: ID!) {\n    user(id: $id) {\n      id\n      email\n      name\n      status\n      role\n      lastLoginAt\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query UserById($id: ID!) {\n    user(id: $id) {\n      id\n      email\n      name\n      status\n      role\n      lastLoginAt\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query Users($cursor: ID, $limit: Int, $filters: UserFilterInputType, $sortType: SortTypeEnumType) {\n    users(cursor: $cursor, limit: $limit, filters: $filters, sortType: $sortType) {\n      nodes {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n      pageInfo {\n        hasNextPage\n        cursor\n        totalCount\n      }\n    }\n  }\n"): (typeof documents)["\n  query Users($cursor: ID, $limit: Int, $filters: UserFilterInputType, $sortType: SortTypeEnumType) {\n    users(cursor: $cursor, limit: $limit, filters: $filters, sortType: $sortType) {\n      nodes {\n        id\n        email\n        name\n        status\n        role\n        lastLoginAt\n        createdAt\n      }\n      pageInfo {\n        hasNextPage\n        cursor\n        totalCount\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateUserRole($id: ID!, $role: UserRoleEnumType!) {\n    updateUserRole(id: $id, role: $role) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateUserRole($id: ID!, $role: UserRoleEnumType!) {\n    updateUserRole(id: $id, role: $role) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateUserStatus($id: ID!, $status: UserStatusEnumType!) {\n    updateUserStatus(id: $id, status: $status) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateUserStatus($id: ID!, $status: UserStatusEnumType!) {\n    updateUserStatus(id: $id, status: $status) {\n      id\n      email\n      name\n      role\n      status\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DashboardStats {\n    dashboardStats {\n      totalAgents\n      onlineAgents\n      activeWorkflows\n      totalTransactions\n    }\n  }\n"): (typeof documents)["\n  query DashboardStats {\n    dashboardStats {\n      totalAgents\n      onlineAgents\n      activeWorkflows\n      totalTransactions\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query LicenseStatus {\n    licenseStatus {\n      clientId\n      tier\n      maxAgents\n      features\n      issuedAt\n      expiresAt\n      licenseId\n      daysLeft\n      status\n    }\n  }\n"): (typeof documents)["\n  query LicenseStatus {\n    licenseStatus {\n      clientId\n      tier\n      maxAgents\n      features\n      issuedAt\n      expiresAt\n      licenseId\n      daysLeft\n      status\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment TransactionFields on TransactionType {\n    id\n    workflowId\n    status\n    triggeredBy\n    startedAt\n    finishedAt\n    createdAt\n    workflow {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  fragment TransactionFields on TransactionType {\n    id\n    workflowId\n    status\n    triggeredBy\n    startedAt\n    finishedAt\n    createdAt\n    workflow {\n      id\n      name\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query ListTransactions($workflowId: ID, $status: String, $limit: Int, $cursor: String) {\n    transactions(workflowId: $workflowId, status: $status, limit: $limit, cursor: $cursor) {\n      nodes {\n        ...TransactionFields\n      }\n      total\n      hasMore\n      cursor\n    }\n  }\n  \n"): (typeof documents)["\n  query ListTransactions($workflowId: ID, $status: String, $limit: Int, $cursor: String) {\n    transactions(workflowId: $workflowId, status: $status, limit: $limit, cursor: $cursor) {\n      nodes {\n        ...TransactionFields\n      }\n      total\n      hasMore\n      cursor\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetTransaction($id: ID!) {\n    transaction(id: $id) {\n      ...TransactionFields\n      results\n      tasks {\n        id\n        agentId\n        stepId\n        status\n        input\n        output\n        error\n        startedAt\n        finishedAt\n        createdAt\n        agent {\n          id\n          name\n          type\n        }\n      }\n    }\n  }\n  \n"): (typeof documents)["\n  query GetTransaction($id: ID!) {\n    transaction(id: $id) {\n      ...TransactionFields\n      results\n      tasks {\n        id\n        agentId\n        stepId\n        status\n        input\n        output\n        error\n        startedAt\n        finishedAt\n        createdAt\n        agent {\n          id\n          name\n          type\n        }\n      }\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment WorkflowSummaryFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    createdAt\n    updatedAt\n  }\n"): (typeof documents)["\n  fragment WorkflowSummaryFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    createdAt\n    updatedAt\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment WorkflowDetailFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    nodes\n    edges\n    createdAt\n    updatedAt\n  }\n"): (typeof documents)["\n  fragment WorkflowDetailFields on WorkflowType {\n    id\n    name\n    description\n    isActive\n    status\n    nodes\n    edges\n    createdAt\n    updatedAt\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment WorkbenchInfoFields on WorkbenchInfoType {\n    id\n    name\n    executorType\n    order\n  }\n"): (typeof documents)["\n  fragment WorkbenchInfoFields on WorkbenchInfoType {\n    id\n    name\n    executorType\n    order\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment WorkbenchRunFields on WorkbenchRunType {\n    id\n    workbench\n    workbenchName\n    executorType\n    status\n    awaitingInput\n    inputPrompt\n    inputs\n    outputs\n    startedAt\n    completedAt\n  }\n"): (typeof documents)["\n  fragment WorkbenchRunFields on WorkbenchRunType {\n    id\n    workbench\n    workbenchName\n    executorType\n    status\n    awaitingInput\n    inputPrompt\n    inputs\n    outputs\n    startedAt\n    completedAt\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment WorkflowRunFields on WorkflowRunType {\n    id\n    workflow\n    workflowName\n    status\n    currentWorkbench {\n      ...WorkbenchInfoFields\n    }\n    pipelineRunId\n    error\n    startedAt\n    completedAt\n    createdAt\n    workbenchRuns {\n      ...WorkbenchRunFields\n    }\n  }\n  \n  \n"): (typeof documents)["\n  fragment WorkflowRunFields on WorkflowRunType {\n    id\n    workflow\n    workflowName\n    status\n    currentWorkbench {\n      ...WorkbenchInfoFields\n    }\n    pipelineRunId\n    error\n    startedAt\n    completedAt\n    createdAt\n    workbenchRuns {\n      ...WorkbenchRunFields\n    }\n  }\n  \n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query ListWorkflows {\n    workflows {\n      nodes {\n        ...WorkflowSummaryFields\n      }\n      total\n    }\n  }\n  \n"): (typeof documents)["\n  query ListWorkflows {\n    workflows {\n      nodes {\n        ...WorkflowSummaryFields\n      }\n      total\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetWorkflow($id: ID!) {\n    workflow(id: $id) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n"): (typeof documents)["\n  query GetWorkflow($id: ID!) {\n    workflow(id: $id) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetWorkflowRuns($workflowId: ID!) {\n    workflowRuns(workflowId: $workflowId) {\n      nodes {\n        ...WorkflowRunFields\n      }\n      total\n    }\n  }\n  \n"): (typeof documents)["\n  query GetWorkflowRuns($workflowId: ID!) {\n    workflowRuns(workflowId: $workflowId) {\n      nodes {\n        ...WorkflowRunFields\n      }\n      total\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetWorkflowRun($id: ID!) {\n    workflowRun(id: $id) {\n      ...WorkflowRunFields\n    }\n  }\n  \n"): (typeof documents)["\n  query GetWorkflowRun($id: ID!) {\n    workflowRun(id: $id) {\n      ...WorkflowRunFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateWorkflow(\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    createWorkflow(\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n"): (typeof documents)["\n  mutation CreateWorkflow(\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    createWorkflow(\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateWorkflow(\n    $id: ID!\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    updateWorkflow(\n      id: $id\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n"): (typeof documents)["\n  mutation UpdateWorkflow(\n    $id: ID!\n    $name: String!\n    $description: String\n    $isActive: Boolean\n    $nodes: String!\n    $edges: String!\n  ) {\n    updateWorkflow(\n      id: $id\n      name: $name\n      description: $description\n      isActive: $isActive\n      nodes: $nodes\n      edges: $edges\n    ) {\n      ...WorkflowDetailFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation DeleteWorkflow($id: ID!) {\n    deleteWorkflow(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteWorkflow($id: ID!) {\n    deleteWorkflow(id: $id)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation StartRun($workflowId: ID!, $context: String) {\n    startRun(workflowId: $workflowId, context: $context) {\n      ...WorkflowRunFields\n    }\n  }\n  \n"): (typeof documents)["\n  mutation StartRun($workflowId: ID!, $context: String) {\n    startRun(workflowId: $workflowId, context: $context) {\n      ...WorkflowRunFields\n    }\n  }\n  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation StartStep($runId: ID!, $workbenchId: ID!, $input: String) {\n    startStep(runId: $runId, workbenchId: $workbenchId, input: $input) {\n      id\n      status\n      awaitingInput\n      inputPrompt\n      inputs\n      outputs\n    }\n  }\n"): (typeof documents)["\n  mutation StartStep($runId: ID!, $workbenchId: ID!, $input: String) {\n    startStep(runId: $runId, workbenchId: $workbenchId, input: $input) {\n      id\n      status\n      awaitingInput\n      inputPrompt\n      inputs\n      outputs\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation AdvanceRun($runId: ID!) {\n    advanceRun(runId: $runId) {\n      done\n      nextWorkbench {\n        ...WorkbenchInfoFields\n      }\n      outcome\n    }\n  }\n  \n"): (typeof documents)["\n  mutation AdvanceRun($runId: ID!) {\n    advanceRun(runId: $runId) {\n      done\n      nextWorkbench {\n        ...WorkbenchInfoFields\n      }\n      outcome\n    }\n  }\n  \n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;