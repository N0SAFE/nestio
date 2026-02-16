/**
 * User Domain - Cache Invalidation Configuration
 *
 * Defines which queries to invalidate when mutations succeed.
 */

import { defineInvalidations } from "../shared/helpers";
import { userEndpoints } from "./endpoints";

/**
 * User invalidation configuration
 *
 * Maps each mutation to the queries it should invalidate:
 * - create: Invalidates user list and count
 * - update: Invalidates specific user (by id, ignoring other params) and list
 * - delete: Invalidates specific user (by id, ignoring other params), list, and count
 */
export const userInvalidations = defineInvalidations(userEndpoints, {
  create: ({ keys }) => [keys.list(), keys.count()],
  update: ({ input, keys }) => [
    // Invalidate ALL findById queries matching this params.id (regardless of other query/body params)
    // Both mutation and query use detailed input: { params: { id }, query, body, headers }
    keys.findById.predicate.byParams({ id: input.params.id }),
    keys.list(),
  ],
  delete: ({ input, keys }) => [
    // Invalidate ALL findById queries matching this params.id (regardless of other query/body params)
    keys.findById.predicate.byParams({ id: input.params.id }),
    keys.list(),
    keys.count(),
  ],
});
