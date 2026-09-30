export { buildSearchIndex, extractAssetCode } from "@/lib/search/build-index";
export { searchIndex } from "@/lib/search/query";
export { findTreemapPath } from "@/lib/search/find-path";
export {
  SEARCH_RESULT_TYPE_LABELS,
  SEARCH_RESULT_TYPE_ORDER,
  type GroupedSearchResults,
  type SearchIndexEntry,
  type SearchQueryResult,
  type SearchResult,
  type SearchResultType,
} from "@/lib/search/types";
export {
  buildFlowGraph,
  dedupeFlowNodes,
  aggregateParallelEdges,
  type FlowNode,
  type FlowEdge,
  type FlowGraphResponse,
  type FlowEdgeRow,
} from "@/lib/search/flow-graph";
export { flowGraphFixture } from "@/lib/search/flow-fixture";
