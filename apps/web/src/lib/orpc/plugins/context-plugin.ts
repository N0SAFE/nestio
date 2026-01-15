// ============================================
// Type Definitions
// ============================================

import { StandardLinkOptions, StandardLinkPlugin } from "@orpc/client/standard";

export class ContextPlugin<
  T extends {
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
  },
> implements StandardLinkPlugin<T>
{
  // Order controls plugin loading order (higher = loads earlier)
  order = 100;

  init(link: StandardLinkOptions<T>): void {}
}

export default {
  ContextPlugin,
};
