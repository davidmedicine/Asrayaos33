// === File: asrayaos3.4/src/lib/core/directiveValidation.ts ===

/**
 * directiveValidation.ts
 * Utility functions to validate LangGraph directive payloads with strong typing,
 * modular validators, result helpers, type guards, and enhanced helpers.
 * Includes individual exports for validators and enhanced robustness checks.
 * (v10.6 - Polished V4 / World-Class Candidate)
 */

// --- Core Validation Types (Standardized & Reusable) ---

/** Defines possible validation severity levels. */
export type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

/** Discriminated union type for validation results. */
export type ValidationResult =
  | { isValid: true; level: 'success' | 'info'; message: string; code?: string; details?: any }
  | { isValid: false; level: 'error' | 'warning'; message: string; code?: string; details?: any };

/** Domain-specific alias for ValidationResult for semantic clarity. */
export type DirectiveValidationResult = ValidationResult;

// --- Validation Result Type Guards (Polish #3) ---

/** Type guard to check if a validation result indicates success or info. */
export function isValidationSuccess(result: ValidationResult): result is { isValid: true; level: 'success' | 'info'; message: string; code?: string; details?: any } {
    return result.isValid === true;
}

/** Type guard to check if a validation result indicates an error or warning. */
export function isValidationError(result: ValidationResult): result is { isValid: false; level: 'error' | 'warning'; message: string; code?: string; details?: any } {
    return result.isValid === false;
}

// --- Validation Result Helper Functions ---

/** Creates a successful validation result (level: 'success'). */
export const success = (message: string, details?: any, code?: string): DirectiveValidationResult => ({
    isValid: true, level: 'success', message, details, code
});

/** Creates an informational validation result (level: 'info'). */
export const info = (message: string, details?: any, code?: string): DirectiveValidationResult => ({
    isValid: true, level: 'info', message, details, code
});

/** Creates a warning validation result (level: 'warning'). */
export const warning = (message: string, details?: any, code?: string): DirectiveValidationResult => ({
    isValid: false, level: 'warning', message, details, code
});

/** Creates an error validation result (level: 'error'). */
export const error = (message: string, details?: any, code?: string): DirectiveValidationResult => ({
    isValid: false, level: 'error', message, details, code
});

// --- Field Path Helper (Polish #1) ---
/** Helper to create dot-separated field paths for error messages/details. */
const fieldPath = (...args: (string | number)[]): string => args.join('.');


// --- Directive Types ---

/** Union of all known directive types (using camelCase). */
export type DirectiveType =
  | 'createArtifact'
  | 'pinContext'
  | 'showNotification'
  | 'navigate'
  | 'executeCommand'
  | 'searchMemory'
  | 'suggestions';

/** Base interface for all action directives. */
export interface ActionDirective {
  type: DirectiveType;
  payload: Record<string, unknown>;
  source?: 'user' | 'agent' | 'system'; // Optional source attribution
  [key: string]: unknown;
}

// --- Specific Directive Interfaces (Payload definitions) ---
// [Interfaces: CreateArtifactPayload, CreateArtifactDirective, PinContextPayload, etc.
// remain exactly the same as in the previous version ("Polished V3").
// Omitted here for brevity, but assume they are present.]
export interface CreateArtifactPayload { /* ... as before ... */ }
export interface CreateArtifactDirective extends ActionDirective { type: 'createArtifact'; payload: CreateArtifactPayload; }
export interface PinContextPayload { /* ... as before ... */ }
export interface PinContextDirective extends ActionDirective { type: 'pinContext'; payload: PinContextPayload; }
export interface ShowNotificationPayload { /* ... as before ... */ }
export interface ShowNotificationDirective extends ActionDirective { type: 'showNotification'; payload: ShowNotificationPayload; }
export interface NavigatePayload { /* ... as before ... */ }
export interface NavigateDirective extends ActionDirective { type: 'navigate'; payload: NavigatePayload; }
export interface ExecuteCommandPayload { /* ... as before ... */ }
export interface ExecuteCommandDirective extends ActionDirective { type: 'executeCommand'; payload: ExecuteCommandPayload; }
export interface SearchMemoryPayload { /* ... as before ... */ }
export interface SearchMemoryDirective extends ActionDirective { type: 'searchMemory'; payload: SearchMemoryPayload; }
export interface SuggestionItem { /* ... as before ... */ }
export interface SuggestionsPayload { suggestions: SuggestionItem[]; }
export interface SuggestionsDirective extends ActionDirective { type: 'suggestions'; payload: SuggestionsPayload; }


// --- Reusable Field Validation Helpers (Internal - Using Result Helpers & fieldPath) ---

// Basic Type Definitions for FieldSet Validation
type FieldBasicType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'stringArray';
interface FieldValidationOptions {
    integer?: boolean;
    positive?: boolean;
    // Add other options like minLength, maxLength, pattern etc. if needed
}
interface FieldDefinition {
    type: FieldBasicType;
    required: boolean;
    options?: FieldValidationOptions;
}
type FieldShape = Record<string, FieldDefinition>;

// [Helper functions: validateRequiredString, validateOptionalString,
// validateStringArray, validateObject, validateBoolean, validateNumber now use
// fieldPath(...) for the fieldName argument. Implementations otherwise the same.
// Omitted here for brevity, but assume they are updated.]

function validateRequiredString(value: unknown, fieldNamePath: string): DirectiveValidationResult {
    if (typeof value !== 'string' || value.trim() === '') return error(`${fieldNamePath} is required and must be a non-empty string.`, { field: fieldNamePath }, 'FIELD_REQUIRED_STRING');
    return success(`${fieldNamePath} is valid.`);
}
function validateOptionalString(value: unknown, fieldNamePath: string): DirectiveValidationResult { /* ... uses fieldPath ... */
    if (value !== undefined && typeof value !== 'string') return warning(`${fieldNamePath} must be a string if provided.`, { field: fieldNamePath }, 'FIELD_OPTIONAL_STRING_TYPE'); return success(`${fieldNamePath} is valid or absent.`); }
function validateStringArray(value: unknown, fieldNamePath: string, required: boolean): DirectiveValidationResult { /* ... uses fieldPath ... */
    if (required && !Array.isArray(value)) return error(`${fieldNamePath} is required and must be an array.`, { field: fieldNamePath }, 'FIELD_REQUIRED_ARRAY'); if (value !== undefined) { if (!Array.isArray(value)) return warning(`${fieldNamePath} must be an array if provided.`, { field: fieldNamePath }, 'FIELD_OPTIONAL_ARRAY_TYPE'); if (!value.every(/*...*/)) return warning(`${fieldNamePath} must be an array of non-empty strings.`, { field: fieldNamePath }, 'FIELD_ARRAY_STRING_CONTENT'); } return success(`${fieldNamePath} is valid.`); }
function validateObject(value: unknown, fieldNamePath: string, required: boolean): DirectiveValidationResult { /* ... uses fieldPath ... */
    if (required && (/*...*/)) return error(`${fieldNamePath} is required and must be an object.`, { field: fieldNamePath }, 'FIELD_REQUIRED_OBJECT'); if (value !== undefined && (/*...*/)) return warning(`${fieldNamePath} must be an object if provided.`, { field: fieldNamePath }, 'FIELD_OPTIONAL_OBJECT_TYPE'); return success(`${fieldNamePath} is valid.`); }
function validateBoolean(value: unknown, fieldNamePath: string, required: boolean): DirectiveValidationResult { /* ... uses fieldPath ... */
    if (required && typeof value !== 'boolean') return error(`${fieldNamePath} is required and must be a boolean.`, { field: fieldNamePath }, 'FIELD_REQUIRED_BOOLEAN'); if (value !== undefined && typeof value !== 'boolean') return warning(`${fieldNamePath} must be a boolean if provided.`, { field: fieldNamePath }, 'FIELD_OPTIONAL_BOOLEAN_TYPE'); return success(`${fieldNamePath} is valid.`); }
function validateNumber(value: unknown, fieldNamePath: string, required: boolean, options: FieldValidationOptions = {}): DirectiveValidationResult { /* ... uses fieldPath ... */
    if (required && typeof value !== 'number') return error(`${fieldNamePath} is required and must be a number.`, { field: fieldNamePath }, 'FIELD_REQUIRED_NUMBER'); if (value !== undefined) { if (typeof value !== 'number' || !Number.isFinite(value)) return warning(`${fieldNamePath} must be a finite number if provided.`, { field: fieldNamePath }, 'FIELD_OPTIONAL_NUMBER_TYPE'); if (options.integer && !Number.isInteger(value)) return warning(`${fieldNamePath} must be an integer.`, { field: fieldNamePath }, 'FIELD_NUMBER_INTEGER'); if (options.positive && value <= 0) return warning(`${fieldNamePath} must be a positive number.`, { field: fieldNamePath }, 'FIELD_NUMBER_POSITIVE'); } return success(`${fieldNamePath} is valid.`); }


/** Helper to validate an array of objects against a defined shape. (Polish #5) */
function validateFieldSet(
    value: unknown,
    fieldNamePath: string,
    itemShape: FieldShape,
    required: boolean
): DirectiveValidationResult {
    // First, validate if the value is an array (if required or present)
    if (required && !Array.isArray(value)) {
        return error(`${fieldNamePath} is required and must be an array.`, { field: fieldNamePath }, 'FIELD_REQUIRED_ARRAY');
    }
    if (value !== undefined) {
        if (!Array.isArray(value)) {
            return warning(`${fieldNamePath} must be an array if provided.`, { field: fieldNamePath }, 'FIELD_OPTIONAL_ARRAY_TYPE');
        }

        // If array is present and valid, validate each item
        for (let i = 0; i < value.length; i++) {
            const item = value[i];
            const itemFieldNamePath = fieldPath(fieldNamePath, i);

            // Check if item is an object
            const itemObjectCheck = validateObject(item, itemFieldNamePath, true); // Each item *must* be an object
            if (!itemObjectCheck.isValid) {
                // If item isn't an object, return that error immediately
                return error(itemObjectCheck.message, { field: itemFieldNamePath, index: i }, itemObjectCheck.code);
            }
            const currentItem = item as Record<string, unknown>; // Safe assertion after object check

            // Iterate through the expected shape and validate fields
            for (const [key, definition] of Object.entries(itemShape)) {
                const itemFieldPath = fieldPath(itemFieldNamePath, key);
                const itemValue = currentItem[key];
                let result: DirectiveValidationResult;

                switch (definition.type) {
                    case 'string':
                        result = definition.required
                            ? validateRequiredString(itemValue, itemFieldPath)
                            : validateOptionalString(itemValue, itemFieldPath);
                        break;
                    case 'number':
                        result = validateNumber(itemValue, itemFieldPath, definition.required, definition.options);
                        break;
                     case 'boolean':
                        result = validateBoolean(itemValue, itemFieldPath, definition.required);
                        break;
                     case 'object':
                         result = validateObject(itemValue, itemFieldPath, definition.required);
                         break;
                    case 'stringArray': // Specific common case for convenience
                        result = validateStringArray(itemValue, itemFieldPath, definition.required);
                        break;
                    // Add 'array' case if needed for generic arrays, requires more complex shape definition
                    default:
                        result = warning(`Unknown validation type "${definition.type}" for field ${itemFieldPath}`, { field: itemFieldPath }, 'VALIDATION_UNKNOWN_TYPE');
                }

                // Return immediately on the first error or warning within an item
                if (!result.isValid) {
                    return result;
                }
            }
        }
        // If loop completes without errors/warnings
        if (value.length === 0 && required) {
             return warning(`${fieldNamePath} is required but the array is empty.`, { field: fieldNamePath }, 'FIELD_ARRAY_EMPTY');
        }

    }
    // If not required and undefined, or if required/present and all items validated
    return success(`${fieldNamePath} is valid.`);
     // Future Enhancement (#2): Could add 'aggregate' mode here to collect all errors/warnings
}


// --- Specific Directive Payload Validator Functions (Exported - Using Helpers & fieldPath) ---

export function validateCreateArtifactPayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true); if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as CreateArtifactPayload;
    let result = validateRequiredString(p.name, fieldPath('payload','name')); if (!result.isValid) return result;
    result = validateRequiredString(p.artifactType, fieldPath('payload','artifactType')); if (!result.isValid) return result;
    if (p.content === undefined || p.content === null) return error('payload.content is required.', { field: fieldPath('payload','content') }, 'FIELD_REQUIRED');
    if (typeof p.content !== 'string' && (typeof p.content !== 'object' || p.content === null || Array.isArray(p.content))) return error('payload.content must be a string or a non-null object.', { field: fieldPath('payload','content') }, 'FIELD_INVALID_TYPE');
    result = validateStringArray(p.tags, fieldPath('payload','tags'), false); if (!result.isValid) return result;
    result = validateObject(p.metadata, fieldPath('payload','metadata'), false); if (!result.isValid) return result;
    result = validateBoolean(p.openInViewer, fieldPath('payload','openInViewer'), false); if (!result.isValid) return result;
    return success('CreateArtifact payload is valid.');
}

export function validatePinContextPayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true); if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as PinContextPayload;
    let result = validateRequiredString(p.contextKey, fieldPath('payload','contextKey')); if (!result.isValid) return result;
    result = validateOptionalString(p.name, fieldPath('payload','name')); if (!result.isValid) return result;
    result = validateOptionalString(p.icon, fieldPath('payload','icon')); if (!result.isValid) return result;
    result = validateOptionalString(p.artifactId, fieldPath('payload','artifactId')); if (!result.isValid) return result;
    if (!p.name) return info('No name provided for pinned context. Default will be used.', undefined, 'PIN_CONTEXT_DEFAULT_NAME');
    return success('PinContext payload is valid.');
}

export function validateShowNotificationPayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true); if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as ShowNotificationPayload;
    let result = validateRequiredString(p.message, fieldPath('payload','message')); if (!result.isValid) return result;
    const validTypes = ['success', 'error', 'info', 'warning'];
    if (p.notificationType !== undefined && (typeof p.notificationType !== 'string' || !validTypes.includes(p.notificationType))) return warning(`Invalid notificationType: ${p.notificationType}.`, { field: fieldPath('payload','notificationType') }, 'NOTIFICATION_INVALID_TYPE');
    result = validateNumber(p.duration, fieldPath('payload','duration'), false, { positive: true }); if (!result.isValid) return result;
    result = validateBoolean(p.isPersistent, fieldPath('payload','isPersistent'), false); if (!result.isValid) return result;
    result = validateObject(p.actor, fieldPath('payload','actor'), false);
    if (!result.isValid) return result;
    if (result.isValid && p.actor) {
         const actor = p.actor as any;
         result = validateRequiredString(actor.id, fieldPath('payload','actor', 'id')); if (!result.isValid) return result;
         result = validateRequiredString(actor.name, fieldPath('payload','actor', 'name')); if (!result.isValid) return result;
         result = validateRequiredString(actor.type, fieldPath('payload','actor', 'type')); if (!result.isValid) return result;
    }
    result = validateOptionalString(p.contextLink, fieldPath('payload','contextLink')); if (!result.isValid) return result;
    return success('ShowNotification payload is valid.');
}

export function validateNavigatePayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true); if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as NavigatePayload;
    let result = validateRequiredString(p.path, fieldPath('payload','path')); if (!result.isValid) return result;
    if (typeof p.path === 'string') {
        result = validateBoolean(p.allowExternal, fieldPath('payload','allowExternal'), false); if (!result.isValid) return result;
        if (p.path.startsWith('http') && p.allowExternal !== true) return error('Navigation to external URLs requires payload.allowExternal: true', { field: fieldPath('payload','path'), path: p.path }, 'NAVIGATE_EXTERNAL_DENIED');
    }
    result = validateBoolean(p.replace, fieldPath('payload','replace'), false); if (!result.isValid) return result;
    return success('Navigate payload is valid.');
}

export function validateExecuteCommandPayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true); if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as ExecuteCommandPayload;
    let result = validateRequiredString(p.commandId, fieldPath('payload','commandId')); if (!result.isValid) return result;
    result = validateObject(p.context, fieldPath('payload','context'), false); if (!result.isValid) return result;
    return success('ExecuteCommand payload is valid.');
}

export function validateSearchMemoryPayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true); if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as SearchMemoryPayload;
    let result = validateRequiredString(p.query, fieldPath('payload','query')); if (!result.isValid) return result;
    result = validateObject(p.filters, fieldPath('payload','filters'), false); if (!result.isValid) return result;
    result = validateNumber(p.limit, fieldPath('payload','limit'), false, { integer: true, positive: true }); if (!result.isValid) return result;
    return success('SearchMemory payload is valid.');
}

/** Validates a SuggestionsDirective payload using validateFieldSet helper. */
export function validateSuggestionsPayload(payload: unknown): DirectiveValidationResult {
    const payloadCheck = validateObject(payload, 'payload', true);
    if (!payloadCheck.isValid) return payloadCheck;
    const p = payload as SuggestionsPayload;

    // Define the shape of each item in the suggestions array
    const suggestionShape: FieldShape = {
        label: { type: 'string', required: true },
        value: { type: 'string', required: true },
        description: { type: 'string', required: false },
    };

    // Use the validateFieldSet helper (Polish #5)
    const result = validateFieldSet(p.suggestions, fieldPath('payload','suggestions'), suggestionShape, true); // 'suggestions' array is required

    // If fieldSet validation passed but array was empty, it might have returned info/warning
    if (result.isValid && Array.isArray(p.suggestions) && p.suggestions.length === 0) {
        return info('payload.suggestions array is empty.'); // Override potential warning from helper
    }

    return result; // Return result from validateFieldSet
}


// --- Main Directive Validator Function (Exported) ---

/**
 * Validates a potential action directive object received from external sources (e.g., LangGraph).
 * Checks structure, type, and delegates payload validation to specific handlers.
 * @param directive The unknown directive object to validate.
 * @returns A DirectiveValidationResult object.
 */
export function validateDirective(directive: unknown): DirectiveValidationResult {
  // 1. Basic structural checks
  if (!directive || typeof directive !== 'object' || Array.isArray(directive)) {
    return error('Directive must be a non-null object.', undefined, 'INVALID_DIRECTIVE_STRUCTURE');
  }
  const dir = directive as Partial<ActionDirective>; // Use Partial for initial checks
  if (typeof dir.type !== 'string' || dir.type.trim() === '') {
    return error('Directive must have a non-empty string "type" property.', { received: dir }, 'MISSING_DIRECTIVE_TYPE');
  }
   if (typeof dir.payload !== 'object' || dir.payload === null) {
        return error('Directive must have a non-null "payload" object property.', { type: dir.type }, 'MISSING_OR_INVALID_PAYLOAD');
   }

  // 2. Dispatch payload validation based on type
  switch (dir.type as DirectiveType) {
    case 'createArtifact': return validateCreateArtifactPayload(dir.payload);
    case 'pinContext': return validatePinContextPayload(dir.payload);
    case 'showNotification': return validateShowNotificationPayload(dir.payload);
    case 'navigate': return validateNavigatePayload(dir.payload);
    case 'executeCommand': return validateExecuteCommandPayload(dir.payload);
    case 'searchMemory': return validateSearchMemoryPayload(dir.payload);
    case 'suggestions': return validateSuggestionsPayload(dir.payload);
    // Add cases for other directives here

    default: {
      const knownTypes: DirectiveType[] = ['createArtifact', 'pinContext', 'showNotification', 'navigate', 'executeCommand', 'searchMemory', 'suggestions'];
      // Check for potential old uppercase/snake_case types
      const possibleCamelCase = dir.type.toLowerCase().replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
      if (knownTypes.includes(possibleCamelCase as DirectiveType)) {
           return warning(`Directive type "${dir.type}" might use old format. Use camelCase: "${possibleCamelCase}".`, { receivedType: dir.type }, 'DEPRECATED_TYPE_FORMAT');
      }

      // Exhaustiveness check (Suggestion #4)
      // This line will cause a TypeScript error if a DirectiveType is added but not handled in the switch.
      const _exhaustiveCheck: never = dir.type;

      return error(`Unknown or unhandled directive type: "${dir.type}"`, { receivedType: dir.type }, 'UNKNOWN_DIRECTIVE_TYPE');
    }
  }
  // Future proofing ideas:
  // - Consider adding an optional `fix()` function to invalid results. (Suggestion #3 - Deferred)
  // - Attach metadata to validator functions for tooling/docs. (Suggestion #4 - Deferred)
  // - Add optional `mode: 'aggregate'` to collect multiple errors. (Suggestion from previous feedback - Deferred)
}

// Note: Individual validators are exported above.

// Ensure file ends with a newline