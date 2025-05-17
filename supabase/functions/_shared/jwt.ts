// supabase/_shared/jwt.ts

/**
 * Masks a JWT string from an "Authorization" header for safe logging.
 * Shows the JWT structure (header, partial payload) and redacts the signature.
 *
 * @param authorizationHeader - The full "Authorization" header string (e.g., "Bearer eyJ...").
 * @returns Masked JWT string, "N/A" if header is missing/invalid,
 *          or an indicator for non-Bearer or malformed tokens.
 */
export function maskAuthorizationHeader(authorizationHeader: string | null | undefined): string {
    if (!authorizationHeader || typeof authorizationHeader !== 'string') {
      return "N/A (Header Missing or Invalid Type)";
    }
  
    if (!authorizationHeader.toLowerCase().startsWith('bearer ')) {
      // If you expect only Bearer tokens, this is an issue.
      // Otherwise, you might want to return the original header or a generic "Non-Bearer Auth Header".
      return "Non-Bearer Auth Header";
    }
  
    const token = authorizationHeader.substring(7); // Length of "Bearer "
    const parts = token.split('.');
  
    if (parts.length === 3) {
      const jwtHeader = parts[0];
      const jwtPayload = parts[1];
      // Displaying full header part, first 15 chars of payload part.
      return `Bearer ${jwtHeader}.${jwtPayload.substring(0, Math.min(15, jwtPayload.length))}...[SIGNATURE_REDACTED]`;
    } else {
      return `Bearer [MALFORMED_TOKEN_STRUCTURE]...`;
    }
  }