// === File: asrayaos3.4/src/components/ui/TagInput.tsx ===

'use client';

/**
 * TagInput.tsx
 * A reusable component for inputting tags.
 * Includes validation feedback, keyboard controls, max tag limits, accessibility improvements,
 * and uses CSS variables for theming.
 * (v11.0 - Incorporating Feedback)
 */

import React, { useState, useRef, useCallback, KeyboardEvent, useMemo } from 'react';
// DEV_VERIFY: Ensure cn utility exists (e.g., from clsx/tailwind-merge).
import { cn } from '@/lib/utils'; // Adjust path as needed

// --- Component Props Interface ---

interface TagInputProps {
  /** Optional label for the input field. Associated via htmlFor if 'id' is provided. */
  label?: string;
  /** Unique ID for the input element, necessary for label association and aria attributes. */
  id?: string; // Recommended if label is used
  /** Placeholder text for the input field when tags can be added. */
  placeholder?: string;
  /** Current array of tags. */
  tags: string[];
  /** Callback function triggered when the tags array changes. */
  onChange: (tags: string[]) => void;
  /** Maximum number of tags allowed. Defaults to 5. */
  maxTags?: number;
  /** Additional CSS classes to apply to the main wrapper div. */
  className?: string;
  /** Error state. Can be a boolean (true for generic error) or a string message. */
  error?: string | boolean;
  /** Maximum character length for a single tag. */
  maxTagLength?: number; // Added optional prop for individual tag length
}

// --- Constants ---
const DEFAULT_MAX_TAGS = 5;
const HELPER_TEXT_ID_SUFFIX = '-helper'; // Suffix for aria-describedby

// --- TagInput Component ---

export const TagInput: React.FC<TagInputProps> = ({
  label,
  id,
  placeholder: initialPlaceholder = 'Add tag... (Press Enter)', // Default placeholder
  tags,
  onChange,
  maxTags = DEFAULT_MAX_TAGS,
  className,
  error,
  maxTagLength,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const helperTextId = id ? `${id}${HELPER_TEXT_ID_SUFFIX}` : undefined; // ID for helper/error text

  // Determine the actual error message to display
  const errorMessage = useMemo(() => {
    if (typeof error === 'string') {
      return error;
    }
    if (error === true) {
      // --- Error Handling: Default message for boolean true ---
      return "Invalid input."; // Provide a generic default message
    }
    return null; // No error
  }, [error]);

  const hasError = !!errorMessage; // Boolean flag for error state

  // Function to add a tag
  const addTag = useCallback(() => {
    const trimmedInput = inputValue.trim();

    // Prevent adding empty tags, duplicates, or exceeding maxTags
    if (!trimmedInput || tags.includes(trimmedInput) || tags.length >= maxTags) {
      return; // Exit if invalid or limit reached
    }

    // Prevent adding tags exceeding maxTagLength if defined
    if (maxTagLength && trimmedInput.length > maxTagLength) {
      // Optionally set an error state here specific to tag length
      console.warn(`Tag "${trimmedInput}" exceeds max length of ${maxTagLength}`);
      // You might want to show a specific error message instead of just returning
      return;
    }

    onChange([...tags, trimmedInput]);
    setInputValue(''); // Clear input field after adding
  }, [inputValue, tags, onChange, maxTags, maxTagLength]);

  // Function to remove a tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
      // Keep focus on input after removing a tag for better UX
      inputRef.current?.focus();
    },
    [tags, onChange]
  );

  // Handle keyboard events (Enter, Backspace)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue) {
        e.preventDefault(); // Prevent form submission if wrapped in form
        addTag();
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        // Remove last tag on backspace if input is empty
        removeTag(tags[tags.length - 1]);
      }
    },
    [addTag, inputValue, removeTag, tags]
  );

  // Determine dynamic placeholder text
  const currentPlaceholder = useMemo(() => {
    if (tags.length >= maxTags) {
      return "Max tags reached";
    }
    return initialPlaceholder;
  }, [tags.length, maxTags, initialPlaceholder]);

  return (
    <div className={cn("w-full", className)}>
      {/* --- Accessibility: Link label to input if id provided --- */}
      {label && (
        <label
          htmlFor={id} // Use htmlFor to link to input ID
          // DEV_VERIFY: Ensure text-text-default, etc., are defined CSS variables/classes.
          className="block text-text-default mb-2 text-sm font-medium"
        >
          {label}
        </label>
      )}
      {/* --- Accessibility: role=list & aria-live added --- */}
      {/* Container for tags and input */}
      <div
        role="list" // Semantically identifies this as a list of tags
        aria-live="polite" // Announce tag additions/removals politely
        // DEV_VERIFY: Ensure CSS Vars (--bg-surface, --border-default, --agent-color-primary, --color-error) are defined.
        // Use cn for merging classes and conditional error styling
        className={cn(
          "flex flex-wrap gap-2 p-2 items-center", // Added items-center
          "bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md", // Use CSS Variables
          "focus-within:ring-2 focus-within:ring-[var(--agent-color-primary)]", // Use CSS Variable
          "min-h-[44px]", // Ensure minimum height for tap targets
          {
            // Conditional error styling using CSS variables
            "border-[var(--color-error)] focus-within:ring-[var(--color-error)]": hasError,
          }
        )}
        // --- UX: Click container to focus input ---
        // Clarification: This is intended behavior to allow easy input focusing.
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          // --- Accessibility: role=listitem --- (Optional but good practice)
          <div
            key={tag}
            role="listitem" // Each tag is a list item
            // DEV_VERIFY: Ensure CSS Vars (--bg-muted, --text-default, --agent-color-primary) are defined.
            className={cn(
              "flex items-center gap-1 px-2 py-1",
              "bg-[var(--bg-muted)] text-text-default rounded-md group", // Use CSS Variables
              "transition-colors hover:bg-[var(--agent-color-primary)] hover:bg-opacity-10" // Use CSS Variable
            )}
          >
            {/* --- Long Tag Names: Truncation + title attribute --- */}
            <span
              className="text-sm truncate" // Added truncate for long tags
              title={tag} // Show full tag on hover
            >
              {tag}
            </span>
            <button
              type="button"
              // --- UX: stopPropagation added --- (Was already present, confirming it's correct)
              onClick={(e) => {
                e.stopPropagation(); // Prevent container click focus when removing
                removeTag(tag);
              }}
              // DEV_VERIFY: Ensure text colors/styles are defined.
              className="text-text-muted group-hover:text-text-default focus:outline-none focus:ring-1 focus:ring-[var(--agent-color-primary)] rounded-sm" // Added focus ring
              aria-label={`Remove ${tag}`} // Accessible label for remove button
            >
              {/* Using a simple 'x' SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M18 6 6 18" />
                 <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          id={id} // Assign ID if provided
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag} // Add tag when input loses focus
          // --- Placeholder Dynamics & Max Tags Feedback ---
          placeholder={currentPlaceholder}
          // DEV_VERIFY: Ensure input styles are defined (text colors, placeholder color, disabled opacity).
          className="flex-1 min-w-[100px] outline-none bg-transparent text-text-default placeholder:text-text-muted p-1 disabled:opacity-70" // Added disabled style
          disabled={tags.length >= maxTags} // Disable input when max tags reached
          maxLength={maxTagLength} // Apply max length to input if provided
          // --- Accessibility: Link input to helper/error text ---
          aria-describedby={helperTextId}
          aria-invalid={hasError} // Indicate invalid state if error exists
        />
      </div>

      {/* Helper Text / Error Message Area */}
      {/* Provides context (tag count) or displays error */}
      <p
        id={helperTextId} // ID for aria-describedby
        // DEV_VERIFY: Ensure error color variable and muted text color are defined.
        className={cn(
          "mt-1 text-sm",
          hasError ? "text-[var(--color-error)]" : "text-text-muted" // Use CSS Variable for error color
        )}
        // Optionally add role="alert" if needed, but aria-live on container might suffice
      >
        {errorMessage ? errorMessage : `${tags.length}/${maxTags} tags`}
      </p>
      {/* --- Customization Comment --- */}
      {/* DEV_NOTE: Further CSS customization can be achieved via Tailwind classes passed in 'className' prop */}
      {/* or by defining more specific CSS variables for tag background, border radius, etc. */}
    </div>
  );
};