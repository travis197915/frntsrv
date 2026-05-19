import { gql } from '@apollo/client';

const TRANSACTION_FRAGMENT = gql`
  fragment TransactionFields on TransactionType {
    id
    workflowId
    status
    triggeredBy
    startedAt
    finishedAt
    createdAt
    workflow {
      id
      name
    }
  }
`;

export const LIST_TRANSACTIONS_QUERY = gql`
  query ListTransactions($workflowId: ID, $status: String, $limit: Int, $cursor: String) {
    transactions(workflowId: $workflowId, status: $status, limit: $limit, cursor: $cursor) {
      nodes {
        ...TransactionFields
      }
      total
      hasMore
      cursor
    }
  }
  ${TRANSACTION_FRAGMENT}
`;

export const GET_TRANSACTION_QUERY = gql`
  query GetTransaction($id: ID!) {
    transaction(id: $id) {
      ...TransactionFields
      results
      tasks {
        id
        agentId
        stepId
        agentName
        pipelineName
        executorType
        stepOrder
        status
        input
        output
        error
        startedAt
        finishedAt
        createdAt
        agent {
          id
          name
          type
        }
      }
    }
  }
  ${TRANSACTION_FRAGMENT}
`;

/** GET /api/runs/{id}/steps/ — independent step list query */
export const GET_RUN_STEPS_QUERY = gql`
  query GetRunSteps($runId: ID!) {
    runSteps(runId: $runId) {
      id
      agentName
      pipelineName
      stepOrder
      status
      startedAt
      finishedAt
    }
  }
`;

/** GET /api/runs/{id}/steps/{wb_run_id}/detail/ — lazy-loaded full I/O per step */
export const GET_RUN_STEP_DETAIL_QUERY = gql`
  query GetRunStepDetail($runId: ID!, $stepId: ID!) {
    runStepDetail(runId: $runId, stepId: $stepId) {
      id
      workbenchId
      name
      executorType
      status
      inputs
      outputs
      startedAt
      finishedAt
    }
  }
`;

/** GET /api/runs/{id}/agent-logs/ — merged log rows from all 4 agent tables */
export const GET_RUN_AGENT_LOGS_QUERY = gql`
  query GetRunAgentLogs($runId: ID!) {
    runAgentLogs(runId: $runId) {
      id
      table
      startedAt
      data
    }
  }
`;

/** GET /api/runs/{id}/result/ — final context dict with _outcome (COMPLETED only) */
export const GET_RUN_RESULT_QUERY = gql`
  query GetRunResult($runId: ID!) {
    runResult(runId: $runId) {
      outcome
      context
    }
  }
`;
