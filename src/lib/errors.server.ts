// Maps internal/DB errors to safe user-facing messages.
// Logs the raw error server-side for debugging but never leaks schema details.
export function safeError(context: string, err: unknown, fallback = "Operation failed. Please try again."): Error {
  console.error(`[${context}]`, err);
  const code = (err as { code?: string } | null)?.code;
  if (code === "23505") return new Error("This record already exists.");
  if (code === "23503") return new Error("Related record not found.");
  if (code === "23514") return new Error("Invalid value provided.");
  return new Error(fallback);
}
