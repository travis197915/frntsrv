import { gql } from '@apollo/client';

export const LICENSE_STATUS_QUERY = gql`
  query LicenseStatus {
    licenseStatus {
      clientId
      tier
      maxAgents
      features
      issuedAt
      expiresAt
      licenseId
      daysLeft
      status
    }
  }
`;
