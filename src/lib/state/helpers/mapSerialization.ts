// === File: src/lib/state/helpers/mapSerialization.ts ===
// Description: Utility functions for serializing and deserializing Map objects
// for use with Zustand's persist middleware, incorporating robustness
// and type-safety improvements.

/**
 * @type TaggedMap
 * Defines the structure for the serialized representation of a Map.
 * Uses a unique tag ('$$map') to avoid collisions with user data
 * and includes a version marker for future format changes.
 * @template K - The type of the keys in the Map.
 * @template V - The type of the values in the Map.
 */
type TaggedMap<K = unknown, V = unknown> = {
  __tag: '$$map'; // Unique identifier for serialized Maps
  v: [K, V][];   // Array of key-value pairs (entries)
  __v?: 1;       // Optional version marker for the serialization format
};

/**
 * A replacer function for JSON.stringify that handles Map objects.
 * Converts Map instances into a specific tagged object structure (`TaggedMap`)
 * for reliable serialization.
 *
 * @param _key - The current key being processed by JSON.stringify (unused here).
 * @param value - The value associated with the key.
 * @returns The processed value. If the value is a Map, returns the TaggedMap object.
 * Otherwise, returns the original value.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter
 *
 * @limitations
 * - Does not handle nested Maps recursively. A Map inside another Map will still serialize to '{}'.
 * - Map keys that are not strings or numbers (e.g., Symbols, functions) will be ignored by JSON.stringify
 * and silently dropped during serialization/deserialization. Consider converting complex keys to strings if needed.
 * - Does not handle other complex types like Set, Date, RegExp, BigInt unless handled by other replacers.
 */
export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    // Convert Map to the TaggedMap structure
    return {
      __tag: '$$map',
      v: [...value.entries()], // Use spread syntax for conciseness
      __v: 1,                  // Add version marker
    } satisfies TaggedMap; // Use 'satisfies' for type checking without casting
  }
  // Return other values unchanged
  return value;
}

/**
 * A reviver function for JSON.parse that handles serialized Map objects.
 * Detects objects matching the `TaggedMap` structure and converts them
 * back into Map instances.
 *
 * @template T - The expected type of the Map keys. Defaults to unknown.
 * @template U - The expected type of the Map values. Defaults to unknown.
 * @param _key - The current key being processed by JSON.parse (unused here).
 * @param value - The value associated with the key (potentially a serialized Map).
 * @returns The processed value. If the value is a serialized TaggedMap, returns a new Map instance.
 * Otherwise, returns the original value.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#the_reviver_parameter
 *
 * @example
 * // In persist middleware options:
 * {
 * storage: createJSONStorage(() => localStorage, {
 * replacer: mapReplacer,
 * reviver: mapReviver, // Optionally mapReviver<string, MyType> if types are known
 * }),
 * }
 */
export function mapReviver<T = unknown, U = unknown>(
  _key: string,
  value: unknown
): unknown | Map<T, U> {
  // Check if the value is an object, not null, and has the specific '__tag'
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as any).__tag === '$$map'
  ) {
    // Verify it matches the TaggedMap structure (basic check)
    // Note: More robust validation could be added here if needed.
    const potentialMap = value as TaggedMap<T, U>;
    if (potentialMap.v && Array.isArray(potentialMap.v)) {
       // Reconstruct the Map from the 'v' (entries) array
      return new Map<T, U>(potentialMap.v);
    }
  }
  // Return other values unchanged
  return value;
}

/*
 * Considerations for further enhancements:
 * - Recursive Handling: To support Maps nested within other objects or Maps,
 * the replacer would need to traverse the object structure recursively.
 * Libraries like 'superjson' handle this automatically.
 * - Set Support: Similar logic could be added to handle `Set` objects
 * (e.g., using a '__tag: "$$set"' and storing values in an array).
 * - Other Types: For broader type support (Date, BigInt, RegExp, etc.),
 * consider using a dedicated serialization library like 'superjson' or 'flatted'.
 */