import type { ErrorCode } from "@/lib/types";

export interface ErrorCopy {
  title: string;
  message: string;
  hint?: string;
  showRetry: boolean;
}

export function getErrorCopy(code: ErrorCode): ErrorCopy {
  switch (code) {
    case "CREDENTIALS_MISSING":
      return {
        title: "Credentials Not Configured",
        message: "BigQuery credentials are not configured.",
        hint: "Set GOOGLE_APPLICATION_CREDENTIALS or GCP_SERVICE_ACCOUNT_KEY in your environment.",
        showRetry: false,
      };
    case "UPSTREAM_QUERY_FAILED":
      return {
        title: "Query Failed",
        message: "Failed to query upstream data source.",
        hint: "The data source may be temporarily unavailable. Please try again.",
        showRetry: true,
      };
    case "LIMIT_EXCEEDED":
      return {
        title: "Query Limit Exceeded",
        message: "The query exceeded the configured cost limit.",
        hint: "Try narrowing the time range or filters to reduce data usage.",
        showRetry: false,
      };
    case "INTERNAL_ERROR":
      return {
        title: "Unexpected Error",
        message: "An unexpected error occurred.",
        hint: "Please try again later.",
        showRetry: true,
      };
    case "INVALID_PERIOD":
    case "INVALID_NETWORK":
    case "INVALID_DATA_SOURCE":
      return {
        title: "Invalid Request",
        message: "The request parameters are invalid.",
        hint: "Check your request parameters and try again.",
        showRetry: false,
      };
    default: {
      const _exhaustiveCheck: never = code;
      return {
        title: "Unexpected Error",
        message: "An unexpected error occurred.",
        hint: "Please try again later.",
        showRetry: true,
      };
    }
  }
}
