import "server-only";

import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function unauthorizedSession() {
  return new ApiError(
    "UNAUTHORIZED_SESSION",
    401,
    "This browser does not own that session.",
  );
}

export function sessionNotFound() {
  return new ApiError("SESSION_NOT_FOUND", 404, "Session not found.");
}

export function dataBackendUnavailable() {
  return new ApiError(
    "DATA_BACKEND_UNAVAILABLE",
    503,
    "Please try again later.",
  );
}

export function sameOriginRequired() {
  return new ApiError(
    "SAME_ORIGIN_REQUIRED",
    403,
    "This request must come from the same site.",
  );
}

export function validationError() {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check your input.",
      },
    },
    { status: 400 },
  );
}

export function apiErrorResponse(error: unknown) {
  const safeError =
    error instanceof ApiError ? error : dataBackendUnavailable();

  return NextResponse.json(
    {
      error: {
        code: safeError.code,
        message: safeError.message,
      },
    },
    { status: safeError.status },
  );
}
