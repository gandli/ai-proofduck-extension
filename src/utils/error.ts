/**
 * Utility functions for error handling.
 */

/**
 * Formats an unknown error caught in a try/catch block into a string message.
 * @param error The caught error (can be of any type).
 * @param fallback The fallback message if the error is not an Error instance or has no message.
 * @returns The formatted error string.
 */
export function formatErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  return error instanceof Error ? error.message : String(error) || fallback;
}
