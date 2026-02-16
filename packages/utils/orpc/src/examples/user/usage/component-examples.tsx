/**
 * User Module - React Component Usage Examples (DOCUMENTATION ONLY)
 *
 * These examples demonstrate CONCEPTUAL patterns for using generated hooks.
 * The actual hook API depends on your createRouterHooks implementation.
 *
 * NOTE: This file uses mock types for documentation purposes.
 * In a real app, hooks would be generated from createRouterHooks().
 *
 * @see ../hooks/index.ts - Hook generation patterns
 * @see ../contracts/index.ts - ORPC contracts
 */

'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState } from 'react';
import type { User, UserCreate, UserUpdate } from '../entity';

// =============================================================================
// MOCK TYPES FOR DOCUMENTATION (Replace with actual generated hooks in real apps)
// =============================================================================

type UseQueryResult<T> = {
  data?: T;
  isLoading: boolean;
  error?: Error | null;
  refetch: () => void;
};

type UseMutationResult<TInput, TOutput> = {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  isPending: boolean;
  error?: Error | null;
};

type MutationOptions<TInput, TOutput> = {
  onSuccess?: (data: TOutput, variables: TInput) => void;
  onError?: (error: Error) => void;
  onMutate?: (variables: TInput) => Promise<unknown> | undefined;
};

type PaginatedResponse<T> = {
  items: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

/**
 * Conceptual hook structure - actual generated hooks may vary.
 * This demonstrates the expected usage patterns.
 */
const userHooks = {
  list: {
    useQuery: (_input: { pagination?: { page: number; limit: number }; sorting?: { field: string; direction: string } }): UseQueryResult<PaginatedResponse<User>> =>
      ({} as UseQueryResult<PaginatedResponse<User>>),
  },
  read: {
    useQuery: (_input: { id: string }): UseQueryResult<User> => ({} as UseQueryResult<User>),
  },
  create: {
    useMutation: <T extends MutationOptions<UserCreate, User>>(_opts?: T): UseMutationResult<UserCreate, User> =>
      ({} as UseMutationResult<UserCreate, User>),
  },
  update: {
    useMutation: <T extends MutationOptions<UserUpdate & { id: string }, User>>(_opts?: T): UseMutationResult<UserUpdate & { id: string }, User> =>
      ({} as UseMutationResult<UserUpdate & { id: string }, User>),
  },
  delete: {
    useMutation: <T extends MutationOptions<{ id: string }, void>>(_opts?: T): UseMutationResult<{ id: string }, void> =>
      ({} as UseMutationResult<{ id: string }, void>),
  },
  batchCreate: {
    useMutation: <T extends MutationOptions<{ items: UserCreate[] }, { items: User[] }>>(_opts?: T): UseMutationResult<{ items: UserCreate[] }, { items: User[] }> =>
      ({} as UseMutationResult<{ items: UserCreate[] }, { items: User[] }>),
  },
};

/** Query key utilities for cache manipulation */
const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userQueryKeys.lists(), filters] as const,
  details: () => [...userQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...userQueryKeys.details(), id] as const,
};

/** Optimistic update utilities */
const userOptimisticUpdates = {
  updateInCache: (_queryClient: unknown, _userId: string, _updates: Partial<User>): void => {
    // Implementation would update React Query cache
  },
};

// =============================================================================
// 1. BASIC LIST WITH PAGINATION
// =============================================================================

/**
 * UserListPage - Basic paginated list example
 *
 * Demonstrates:
 * - Using userHooks for queries
 * - Loading and error states
 * - Page navigation
 */
export function UserListPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Use the list hook from userHooks
  // Note: The actual hook API depends on your createRouterHooks implementation
  const listQuery = userHooks.list.useQuery({
    pagination: { page, limit },
    sorting: { field: 'createdAt', direction: 'desc' },
  });

  if (listQuery.isLoading) {
    return (
      <div className="loading">
        <span>Loading users...</span>
      </div>
    );
  }

  if (listQuery.error) {
    return (
      <div className="error">
        <p>Error loading users</p>
        <button onClick={() => { listQuery.refetch(); }}>Retry</button>
      </div>
    );
  }

  const { items: users = [], pagination: paginationData } = listQuery.data ?? {};
  const totalPages = Math.ceil((paginationData?.total ?? 0) / limit);

  return (
    <div className="user-list-page">
      <h1>Users ({paginationData?.total ?? 0} total)</h1>

      <ul className="user-list">
        {users.map((user: User) => (
          <li key={user.id} className="user-item">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
            <span className={`user-status status-${user.status}`}>
              {user.status}
            </span>
          </li>
        ))}
      </ul>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => { setPage((p) => p - 1); }}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => { setPage((p) => p + 1); }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 2. SINGLE USER WITH DETAILS
// =============================================================================

/**
 * UserDetailPage - Single user details example
 *
 * Demonstrates:
 * - Reading a single entity by ID
 * - Loading states for detail views
 */
export function UserDetailPage({ userId }: { userId: string }) {
  const detailQuery = userHooks.read.useQuery({ id: userId });

  if (detailQuery.isLoading) {
    return <div className="loading">Loading user...</div>;
  }

  if (detailQuery.error || !detailQuery.data) {
    return <div className="error">User not found</div>;
  }

  const user = detailQuery.data;

  return (
    <div className="user-detail-page">
      <h1>{user.name}</h1>
      <div className="user-info">
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
        <p>Status: {user.status}</p>
        <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

// =============================================================================
// 3. CREATE USER FORM
// =============================================================================

/**
 * CreateUserForm - Create user mutation example
 *
 * Demonstrates:
 * - Using mutation hooks
 * - Form state management
 * - Success/error handling
 */
export function CreateUserForm() {
  const [form, setForm] = useState<Partial<UserCreate>>({
    email: '',
    name: '',
    role: 'user',
  });

  // Mutation hook for creating users
  const createMutation = userHooks.create.useMutation({
    onSuccess: (createdUser: User) => {
      console.log('User created:', createdUser.id);
      // Reset form
      setForm({ email: '', name: '', role: 'user' });
    },
    onError: (error: Error) => {
      console.error('Failed to create user:', error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.email && form.name) {
      createMutation.mutate(form as UserCreate);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-user-form">
      <h2>Create New User</h2>

      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={form.name ?? ''}
          onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); }}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); }}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="role">Role</label>
        <select
          id="role"
          value={form.role ?? 'user'}
          onChange={(e) => { setForm((f) => ({ ...f, role: e.target.value as 'user' | 'moderator' | 'admin' })); }}
        >
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create User'}
      </button>

      {createMutation.error && (
        <p className="error-message">Error: {createMutation.error.message}</p>
      )}
    </form>
  );
}

// =============================================================================
// 4. UPDATE USER FORM
// =============================================================================

/**
 * UpdateUserForm - Update user mutation example
 *
 * Demonstrates:
 * - Fetching existing data for editing
 * - Update mutations
 * - Optimistic updates (optional)
 */
export function UpdateUserForm({ userId }: { userId: string }) {
  const detailQuery = userHooks.read.useQuery({ id: userId });
  const [form, setForm] = useState<Partial<UserUpdate>>({});

  // Populate form when data loads
  const user = detailQuery.data;

  const updateMutation = userHooks.update.useMutation({
    onSuccess: () => {
      console.log('User updated successfully');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: userId, ...form } as UserUpdate & { id: string });
  };

  if (detailQuery.isLoading) {
    return <div>Loading user data...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="update-user-form">
      <h2>Edit User: {user.name}</h2>

      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={form.name ?? user.name}
          onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); }}
        />
      </div>

      <div className="form-field">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={form.bio ?? user.bio ?? ''}
          onChange={(e) => { setForm((f) => ({ ...f, bio: e.target.value })); }}
        />
      </div>

      <button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

// =============================================================================
// 5. DELETE USER CONFIRMATION
// =============================================================================

/**
 * DeleteUserButton - Delete mutation example
 *
 * Demonstrates:
 * - Confirmation pattern before deletion
 * - Delete mutations
 * - Cache invalidation
 */
export function DeleteUserButton({
  user,
  onDeleted,
}: {
  user: User;
  onDeleted?: () => void;
}) {
  const deleteMutation = userHooks.delete.useMutation({
    onSuccess: () => {
      console.log('User deleted');
      onDeleted?.();
    },
  });

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
    );
    if (confirmed) {
      deleteMutation.mutate({ id: user.id });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
      className="delete-button"
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
    </button>
  );
}

// =============================================================================
// 6. BATCH OPERATIONS
// =============================================================================

/**
 * BatchCreateUsers - Batch create mutation example
 *
 * Demonstrates:
 * - Batch operations for multiple entities
 * - Progress tracking for batch operations
 */
export function BatchCreateUsers({
  usersData,
  onComplete,
}: {
  usersData: UserCreate[];
  onComplete?: (created: User[]) => void;
}) {
  const batchCreateMutation = userHooks.batchCreate.useMutation({
    onSuccess: (result: { items: User[] }) => {
      console.log(`Created ${String(result.items.length)} users`);
      onComplete?.(result.items);
    },
  });

  const handleBatchCreate = () => {
    batchCreateMutation.mutate({ items: usersData });
  };

  return (
    <div className="batch-create">
      <p>Ready to create {String(usersData.length)} users</p>
      <button
        onClick={handleBatchCreate}
        disabled={batchCreateMutation.isPending}
      >
        {batchCreateMutation.isPending
          ? 'Creating...'
          : `Create ${String(usersData.length)} Users`}
      </button>
    </div>
  );
}

// =============================================================================
// 7. OPTIMISTIC UPDATES
// =============================================================================

/**
 * UserStatusToggle - Optimistic update example
 *
 * Demonstrates:
 * - Using optimistic update utilities
 * - Instant UI feedback before server response
 * - Rollback on error
 */
export function UserStatusToggle({ user }: { user: User }) {
  const updateMutation = userHooks.update.useMutation({
    // eslint-disable-next-line @typescript-eslint/require-await
    onMutate: async (newData: UserUpdate & { id: string }) => {
      // Optimistically update the cache
      userOptimisticUpdates.updateInCache(
        {} as never, // In real code: queryClient from useQueryClient()
        newData.id,
        { status: newData.status }
      );
    },
  });

  const toggleStatus = () => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({ id: user.id, status: newStatus });
  };

  return (
    <button onClick={toggleStatus} className="status-toggle">
      {user.status === 'active' ? 'Deactivate' : 'Activate'}
    </button>
  );
}

// =============================================================================
// 8. QUERY KEY USAGE
// =============================================================================

/**
 * UserAdminPanel - Query key usage example
 *
 * Demonstrates:
 * - Using query keys for manual cache manipulation
 * - Selective invalidation
 * - Cache inspection
 */
export function UserAdminPanel() {
  // Example: Using query keys for targeted actions
  const handleRefreshAllUsers = () => {
    // In real code: queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    console.log('Would invalidate:', userQueryKeys.all);
  };

  const handleRefreshUserLists = () => {
    console.log('Would invalidate:', userQueryKeys.lists());
  };

  const handleRefreshSingleUser = (userId: string) => {
    console.log('Would invalidate:', userQueryKeys.detail(userId));
  };

  return (
    <div className="admin-panel">
      <h2>Admin Actions</h2>
      <button onClick={handleRefreshAllUsers}>Refresh All User Data</button>
      <button onClick={handleRefreshUserLists}>Refresh User Lists</button>
      <button onClick={() => { handleRefreshSingleUser('user-123'); }}>
        Refresh Specific User
      </button>
    </div>
  );
}

// =============================================================================
// 9. COMPLETE CRUD PAGE EXAMPLE
// =============================================================================

/**
 * UserManagementPage - Complete CRUD example
 *
 * Demonstrates:
 * - Combining multiple hooks in one component
 * - Real-world CRUD page structure
 */
export function UserManagementPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="user-management-page">
      <header>
        <h1>User Management</h1>
        <button onClick={() => { setIsCreating(true); }}>Add User</button>
      </header>

      <main>
        {isCreating ? (
          <CreateUserForm />
        ) : selectedUserId ? (
          <>
            <UpdateUserForm userId={selectedUserId} />
            <button onClick={() => { setSelectedUserId(null); }}>
              Back to List
            </button>
          </>
        ) : (
          <UserListPage />
        )}
      </main>
    </div>
  );
}
