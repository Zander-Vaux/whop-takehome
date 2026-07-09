export function logWhopError(
  context: string,
  error: unknown,
  meta?: Record<string, string | undefined>
): void {
  const err = error as {
    status?: number;
    message?: string;
    headers?: { get?: (name: string) => string | null };
    requestID?: string;
  };

  console.error(`[whop] ${context}`, {
    endpoint: meta?.endpoint,
    environment: meta?.environment,
    internalId: meta?.internalId,
    status: err.status,
    message: err.message ?? String(error),
    requestId:
      err.requestID ??
      err.headers?.get?.("x-request-id") ??
      err.headers?.get?.("request-id"),
  });
}

export function whopErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isAuthError(error: unknown): boolean {
  const err = error as { status?: number };
  return err.status === 401;
}

export function isPermissionError(error: unknown): boolean {
  const err = error as { status?: number };
  return err.status === 403;
}
