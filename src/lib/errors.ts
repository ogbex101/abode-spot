const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

const SAFE_EXACT_MESSAGES = new Set([
  "Message is required",
  "Not signed in",
  "No pending application was updated",
  "Original inquiry not found",
  "Property not found",
  "Signup failed",
  "This property doesn't have an assigned agent",
  "This property does not have an assigned agent",
  "The person you are trying to message does not have a valid profile yet",
  "You cannot message yourself about your own listing",
  "You cannot send a message to yourself",
  "You cannot start a chat with yourself",
  "You must be signed in to send a reply",
  "You must be signed in to send an inquiry",
]);

function rawMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

export function getErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  const message = rawMessage(error).trim();
  if (!message) return fallback;
  if (SAFE_EXACT_MESSAGES.has(message)) return message;

  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (lower.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("password should be") || lower.includes("password must")) return message;
  if (lower.includes("jwt") || lower.includes("session") || lower.includes("refresh token")) {
    return "Your session expired. Please sign in again.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return "Network connection failed. Check your internet and try again.";
  }
  if (
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("permission denied") ||
    lower.includes("not authorized") ||
    lower.includes("unauthorized")
  ) {
    return "You do not have permission to do that.";
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return "This item already exists.";
  }
  if (
    lower.includes("foreign key constraint") ||
    lower.includes("violates foreign key") ||
    lower.includes("_fkey")
  ) {
    return "Some linked account or listing data is missing. Refresh and try again.";
  }
  if (
    lower.includes("violates check constraint") ||
    lower.includes("not-null constraint") ||
    lower.includes("_check")
  ) {
    return "Some required information is missing or invalid.";
  }
  if (
    lower.includes("relation ") ||
    lower.includes("column ") ||
    lower.includes("schema cache") ||
    lower.includes("invalid input syntax")
  ) {
    return fallback;
  }
  if (lower.includes("supabase not configured")) {
    return "This service is not available right now.";
  }

  return fallback;
}

export function toAppError(error: unknown, fallback = DEFAULT_MESSAGE): Error {
  return new Error(getErrorMessage(error, fallback));
}
