import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getErrorCopy } from "./error-copy";
import type { ErrorCode } from "./types";

describe("getErrorCopy", () => {
  test("CREDENTIALS_MISSING shows credentials hint without retry", () => {
    const copy = getErrorCopy("CREDENTIALS_MISSING");
    assert.equal(copy.title, "Credentials Not Configured");
    assert.equal(copy.message, "BigQuery credentials are not configured.");
    assert.match(copy.hint ?? "", /GOOGLE_APPLICATION_CREDENTIALS/);
    assert.equal(copy.showRetry, false);
  });

  test("UPSTREAM_QUERY_FAILED shows retry-oriented copy", () => {
    const copy = getErrorCopy("UPSTREAM_QUERY_FAILED");
    assert.equal(copy.title, "Query Failed");
    assert.equal(copy.message, "Failed to query upstream data source.");
    assert.match(copy.hint ?? "", /try again/);
    assert.equal(copy.showRetry, true);
  });

  test("LIMIT_EXCEEDED shows cost limit hint without retry", () => {
    const copy = getErrorCopy("LIMIT_EXCEEDED");
    assert.equal(copy.title, "Query Limit Exceeded");
    assert.equal(copy.message, "The query exceeded the configured cost limit.");
    assert.match(copy.hint ?? "", /narrow/i);
    assert.equal(copy.showRetry, false);
  });

  test("INTERNAL_ERROR shows generic error with retry", () => {
    const copy = getErrorCopy("INTERNAL_ERROR");
    assert.equal(copy.title, "Unexpected Error");
    assert.equal(copy.message, "An unexpected error occurred.");
    assert.match(copy.hint ?? "", /try again later/);
    assert.equal(copy.showRetry, true);
  });

  test("INVALID_PERIOD shows validation error without retry", () => {
    const copy = getErrorCopy("INVALID_PERIOD");
    assert.equal(copy.title, "Invalid Request");
    assert.equal(copy.message, "The request parameters are invalid.");
    assert.match(copy.hint ?? "", /request parameters/);
    assert.equal(copy.showRetry, false);
  });

  test("INVALID_NETWORK shows validation error without retry", () => {
    const copy = getErrorCopy("INVALID_NETWORK");
    assert.equal(copy.title, "Invalid Request");
    assert.equal(copy.message, "The request parameters are invalid.");
    assert.match(copy.hint ?? "", /request parameters/);
    assert.equal(copy.showRetry, false);
  });

  test("INVALID_DATA_SOURCE shows validation error without retry", () => {
    const copy = getErrorCopy("INVALID_DATA_SOURCE");
    assert.equal(copy.title, "Invalid Request");
    assert.equal(copy.message, "The request parameters are invalid.");
    assert.match(copy.hint ?? "", /request parameters/);
    assert.equal(copy.showRetry, false);
  });

  test("all error codes have defined copy", () => {
    const errorCodes: ErrorCode[] = [
      "INVALID_PERIOD",
      "INVALID_NETWORK",
      "INVALID_DATA_SOURCE",
      "LIMIT_EXCEEDED",
      "CREDENTIALS_MISSING",
      "UPSTREAM_QUERY_FAILED",
      "INTERNAL_ERROR",
    ];

    for (const code of errorCodes) {
      const copy = getErrorCopy(code);
      assert.ok(copy.title, `${code} should have a title`);
      assert.ok(copy.message, `${code} should have a message`);
      assert.equal(typeof copy.showRetry, "boolean", `${code} should have showRetry boolean`);
    }
  });

  test("credentials error does not suggest GOOGLE_APPLICATION_CREDENTIALS when health passes", () => {
    const credentialsCopy = getErrorCopy("CREDENTIALS_MISSING");
    const queryFailedCopy = getErrorCopy("UPSTREAM_QUERY_FAILED");

    // Credentials error should mention credentials
    assert.match(credentialsCopy.hint ?? "", /credentials/i);

    // Query failed should NOT mention credentials (the key requirement)
    assert.doesNotMatch(queryFailedCopy.hint ?? "", /credentials/i);
    assert.doesNotMatch(queryFailedCopy.message, /credentials/i);
  });
});
