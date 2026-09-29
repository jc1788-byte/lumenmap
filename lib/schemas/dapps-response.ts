import { z } from "zod";
import {
  dataSourceSchema,
  finiteNumberSchema,
  isoTimestampSchema,
  periodSchema,
} from "./activity-response";

export const dappLeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  protocol: z.string(),
  op_count: finiteNumberSchema,
  share: finiteNumberSchema,
  opCount: finiteNumberSchema.optional(),
  entity_count: z.number().int().nonnegative().optional(),
});

export type DappLeaderboardEntry = z.infer<typeof dappLeaderboardEntrySchema>;

export const dappsResponseSchema = z.object({
  period: periodSchema,
  start: isoTimestampSchema,
  end: isoTimestampSchema,
  source: dataSourceSchema,
  sourceTimestamp: isoTimestampSchema,
  isPeriodComplete: z.boolean(),
  total_ops: finiteNumberSchema,
  totalOps: finiteNumberSchema.optional(),
  rankings: z.array(dappLeaderboardEntrySchema),
  protocols: z.array(dappLeaderboardEntrySchema).optional(),
  coverage: finiteNumberSchema.optional(),
  fixture: z.boolean().optional(),
});

export type DappsResponse = z.infer<typeof dappsResponseSchema>;

export class DappsResponseValidationError extends Error {
  readonly path: string;
  readonly diagnostic: string;

  constructor(path: string, message: string) {
    super(`Dapps response validation failed at ${path}: ${message}`);
    this.name = "DappsResponseValidationError";
    this.path = path;
    this.diagnostic = `schema path "${path || "(root)"}": ${message}`;
  }
}

function formatIssuePath(path: PropertyKey[]): string {
  return path
    .map((segment) => String(segment))
    .join(".")
    .replace(/\.(\d+)(?=\.|$)/g, "[$1]");
}

export function validateDappsResponse(data: unknown): DappsResponse {
  const result = dappsResponseSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const issue = result.error.issues[0];
  const path = formatIssuePath(issue?.path ?? []);
  const message = issue?.message ?? "Unknown validation error";

  throw new DappsResponseValidationError(path, message);
}

export function publicDappsValidationErrorBody(): {
  code: string;
  message: string;
} {
  return {
    code: "INTERNAL_ERROR",
    message: "Dapps response failed validation",
  };
}
