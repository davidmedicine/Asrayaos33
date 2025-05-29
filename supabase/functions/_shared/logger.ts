// supabase/_shared/logger.ts

/**
 * Shared logging utility for Edge Functions.
 *
 * @param level - The log level ('INFO', 'DEBUG', 'WARN', 'ERROR').
 * @param message - The log message.
 * @param data - Optional additional data to log (e.g., error object, context).
 * @param functionName - The name of the calling Edge Function (e.g., 'list-quests').
 * @param isDebugMode - Boolean indicating if the function is in debug mode (to enable INFO/DEBUG logs).
 */
export function log(
    level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR',
    message: string,
    data?: unknown,
    functionName: string = 'UNKNOWN_FUNCTION',
    isDebugMode: boolean = false
  ): void {
    // Global debug flag for all First Flame functions
    const DEBUG_FIRST_FLAME = Deno.env.get('DEBUG_FIRST_FLAME') === 'true';
    
    // Use either function-specific debug flag OR global First Flame debug flag
    const shouldLog = isDebugMode || DEBUG_FIRST_FLAME || level === 'ERROR' || level === 'WARN';
    
    if (shouldLog) {
      const logData = data instanceof Error
        ? { message: data.message, stack: data.stack, code: (data as any).code, name: (data as any).name, ...data }
        : data;
      const fullMessage = `[${functionName}] [${level}] ${message}`;
  
      switch(level) {
        case 'INFO': console.info(fullMessage, logData ?? ''); break;
        case 'DEBUG': console.debug(fullMessage, logData ?? ''); break;
        case 'WARN': console.warn(fullMessage, logData ?? ''); break;
        case 'ERROR': console.error(fullMessage, logData ?? ''); break;
        default: console.log(fullMessage, logData ?? ''); // Fallback, should not happen with TS
      }
    }
  }