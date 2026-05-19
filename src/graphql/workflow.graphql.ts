import { gql } from '@apollo/client';

const WORKFLOW_SUMMARY_FRAGMENT = gql`
  fragment WorkflowSummaryFields on WorkflowType {
    id
    name
    description
    isActive
    status
    config
    createdAt
    updatedAt
  }
`;

const WORKFLOW_DETAIL_FRAGMENT = gql`
  fragment WorkflowDetailFields on WorkflowType {
    id
    name
    description
    isActive
    status
    nodes
    edges
    createdAt
    updatedAt
  }
`;

const WORKBENCH_INFO_FRAGMENT = gql`
  fragment WorkbenchInfoFields on WorkbenchInfoType {
    id
    name
    executorType
    order
  }
`;

const WORKBENCH_RUN_FRAGMENT = gql`
  fragment WorkbenchRunFields on WorkbenchRunType {
    id
    workbench
    workbenchName
    executorType
    status
    awaitingInput
    inputPrompt
    inputs
    outputs
    startedAt
    completedAt
  }
`;

const WORKFLOW_RUN_FRAGMENT = gql`
  fragment WorkflowRunFields on WorkflowRunType {
    id
    workflow
    workflowName
    status
    currentWorkbench {
      ...WorkbenchInfoFields
    }
    pipelineRunId
    error
    startedAt
    completedAt
    createdAt
    workbenchRuns {
      ...WorkbenchRunFields
    }
  }
  ${WORKBENCH_INFO_FRAGMENT}
  ${WORKBENCH_RUN_FRAGMENT}
`;

export const LIST_WORKFLOWS_QUERY = gql`
  query ListWorkflows {
    workflows {
      nodes {
        ...WorkflowSummaryFields
      }
      total
    }
  }
  ${WORKFLOW_SUMMARY_FRAGMENT}
`;

export const GET_WORKFLOW_QUERY = gql`
  query GetWorkflow($id: ID!) {
    workflow(id: $id) {
      ...WorkflowDetailFields
    }
  }
  ${WORKFLOW_DETAIL_FRAGMENT}
`;

export const GET_WORKFLOW_RUNS_QUERY = gql`
  query GetWorkflowRuns($workflowId: ID!) {
    workflowRuns(workflowId: $workflowId) {
      nodes {
        ...WorkflowRunFields
      }
      total
    }
  }
  ${WORKFLOW_RUN_FRAGMENT}
`;

export const GET_WORKFLOW_RUN_QUERY = gql`
  query GetWorkflowRun($id: ID!) {
    workflowRun(id: $id) {
      ...WorkflowRunFields
    }
  }
  ${WORKFLOW_RUN_FRAGMENT}
`;

export const CREATE_WORKFLOW_MUTATION = gql`
  mutation CreateWorkflow(
    $name: String!
    $description: String
    $isActive: Boolean
    $nodes: String!
    $edges: String!
  ) {
    createWorkflow(
      name: $name
      description: $description
      isActive: $isActive
      nodes: $nodes
      edges: $edges
    ) {
      ...WorkflowDetailFields
    }
  }
  ${WORKFLOW_DETAIL_FRAGMENT}
`;

export const UPDATE_WORKFLOW_MUTATION = gql`
  mutation UpdateWorkflow(
    $id: ID!
    $name: String!
    $description: String
    $isActive: Boolean
    $nodes: String!
    $edges: String!
  ) {
    updateWorkflow(
      id: $id
      name: $name
      description: $description
      isActive: $isActive
      nodes: $nodes
      edges: $edges
    ) {
      ...WorkflowDetailFields
    }
  }
  ${WORKFLOW_DETAIL_FRAGMENT}
`;

export const DELETE_WORKFLOW_MUTATION = gql`
  mutation DeleteWorkflow($id: ID!) {
    deleteWorkflow(id: $id)
  }
`;

export const START_RUN_MUTATION = gql`
  mutation StartRun($workflowId: ID!, $context: String) {
    startRun(workflowId: $workflowId, context: $context) {
      ...WorkflowRunFields
    }
  }
  ${WORKFLOW_RUN_FRAGMENT}
`;

export const START_STEP_MUTATION = gql`
  mutation StartStep($runId: ID!, $workbenchId: ID!, $input: String) {
    startStep(runId: $runId, workbenchId: $workbenchId, input: $input) {
      id
      status
      awaitingInput
      inputPrompt
      inputs
      outputs
    }
  }
`;

export const ADVANCE_RUN_MUTATION = gql`
  mutation AdvanceRun($runId: ID!) {
    advanceRun(runId: $runId) {
      done
      nextWorkbench {
        ...WorkbenchInfoFields
      }
      outcome
    }
  }
  ${WORKBENCH_INFO_FRAGMENT}
`;

export const UPLOAD_RUN_FILE_MUTATION = gql`
  mutation UploadRunFile($runId: ID!, $fieldName: String!, $file: Upload!) {
    uploadRunFile(runId: $runId, fieldName: $fieldName, file: $file) {
      fieldName
      url
    }
  }
`;

export const SUBMIT_PREFLIGHT_MUTATION = gql`
  mutation SubmitPreflight($runId: ID!, $excel: Upload, $pdf: Upload, $claimId: String) {
    submitPreflight(runId: $runId, excel: $excel, pdf: $pdf, claimId: $claimId) {
      id
      status
      awaitingInput
      inputPrompt
      inputs
      outputs
    }
  }
`;
