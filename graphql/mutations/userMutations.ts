import { gql } from '@apollo/client'

/** Merge onboarding flags into `users.metadata` (requires Hasura update permission). */
export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding($userId: uuid!, $displayName: String, $metadata: jsonb) {
    update_users_by_pk(pk_columns: { id: $userId }, _set: { displayName: $displayName, metadata: $metadata }) {
      id
      displayName
      metadata
    }
  }
`
