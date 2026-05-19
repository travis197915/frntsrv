import { gql } from '@apollo/client';

const AGENT_FRAGMENT = gql`
  fragment AgentFields on AgentType {
    id
    name
    type
    status
    latestStatus
    pipelines
    recentExecutions {
      id
      agentName
      pipelineName
      stepOrder
      status
      createdAt
      updatedAt
    }
    lastSeenAt
    metadata
    createdAt
    updatedAt
  }
`;

export const LIST_AGENTS_QUERY = gql`
  query ListAgents($status: String) {
    agents(status: $status) {
      ...AgentFields
    }
  }
  ${AGENT_FRAGMENT}
`;

export const GET_AGENT_QUERY = gql`
  query GetAgent($id: ID!) {
    agent(id: $id) {
      ...AgentFields
    }
  }
  ${AGENT_FRAGMENT}
`;

export const LIST_COMBO_TEMPLATES_QUERY = gql`
  query ListComboTemplates {
    comboTemplates {
      id
      label
      description
    }
  }
`;
