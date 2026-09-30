/**
 * Experimental Flow view feature flag.
 *
 * Flow is off by default in production. Maintainers enable it by setting
 * `LUMENMAP_ENABLE_FLOW_VIEW=true`. In local development and fixture mode a
 * `?flow=1` query flag can opt into the view for previews while it is being
 * built out. The query opt-in is ignored in production, so public access
 * always requires the environment flag.
 *
 * The pure `isFlowViewEnabled` helper is exported separately so the gating
 * policy can be unit tested without touching `process.env`.
 */
export function isFlowViewEnabled(input: {
  nodeEnv: string | undefined;
  dataSource: string | undefined;
  envFlag: string | undefined;
  queryFlag: string | undefined;
}): boolean {
  if (input.envFlag?.toLowerCase() === "true") return true;

  const isProduction =
    input.nodeEnv === "production" && input.dataSource !== "fixture";
  const isLocalPreview =
    input.nodeEnv === "development" || input.dataSource === "fixture";

  return (
    !isProduction &&
    isLocalPreview &&
    (input.queryFlag === "1" || input.queryFlag?.toLowerCase() === "true")
  );
}

/** True when a `view` search param requests the Flow chart view. */
export function isFlowViewRequested(
  value: string | string[] | undefined,
): boolean {
  return (Array.isArray(value) ? value[0] : value) === "flow";
}

/**
 * Resolves the flag from the running environment. Intended for server
 * components (and tests), where `process.env` values are available.
 */
export function flowViewIsEnabled(queryFlag?: string | string[]): boolean {
  return isFlowViewEnabled({
    nodeEnv: process.env.NODE_ENV,
    dataSource: process.env.LUMENMAP_DATA_SOURCE,
    envFlag: process.env.LUMENMAP_ENABLE_FLOW_VIEW,
    queryFlag: Array.isArray(queryFlag) ? queryFlag[0] : queryFlag,
  });
}
