import { gql } from '@apollo/client';

export const SIGNUP_MUTATION = gql`
  mutation Signup($email: String!, $password: String!, $name: String!, $role: UserRoleEnumType) {
    signup(email: $email, password: $password, name: $name, role: $role) {
      token
      user {
        id
        email
        name
        status
        role
      }
    }
  }
`;

export const USER_QUERY = gql`
  query UserById($id: ID!) {
    user(id: $id) {
      id
      email
      name
      status
      role
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const USERS_QUERY = gql`
  query Users($cursor: ID, $limit: Int, $filters: UserFilterInputType, $sortType: SortTypeEnumType) {
    users(cursor: $cursor, limit: $limit, filters: $filters, sortType: $sortType) {
      nodes {
        id
        email
        name
        status
        role
        lastLoginAt
        createdAt
      }
      pageInfo {
        hasNextPage
        cursor
        totalCount
      }
    }
  }
`;

export const UPDATE_USER_ROLE_MUTATION = gql`
  mutation UpdateUserRole($id: ID!, $role: UserRoleEnumType!) {
    updateUserRole(id: $id, role: $role) {
      id
      email
      name
      role
      status
    }
  }
`;

export const UPDATE_USER_STATUS_MUTATION = gql`
  mutation UpdateUserStatus($id: ID!, $status: UserStatusEnumType!) {
    updateUserStatus(id: $id, status: $status) {
      id
      email
      name
      role
      status
    }
  }
`;
