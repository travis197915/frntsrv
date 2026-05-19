export interface User {
  id: string;
  email: string | null;
  name: string | null;
  status: string;  // 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED'
  role: string;    // 'USER' | 'ADMIN'
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type RoleRequirement = 'ADMIN' | 'USER';

/** Check if user has admin role */
export const isAdmin = (role: string) => role === 'ADMIN';

/** Format role enum to display label */
export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'USER':  return 'User';
    default:      return role;
  }
};

/** Format status enum to display label */
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'ACTIVE':    return 'Active';
    case 'INACTIVE':  return 'Inactive';
    case 'PENDING':   return 'Pending';
    case 'SUSPENDED': return 'Suspended';
    case 'DELETED':   return 'Deleted';
    default:          return status;
  }
};
