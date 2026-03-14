import { X } from "lucide-react";
import { useMemo, useState } from "react";

import cn from "~/utils/cn";

import type { AclSuggestion } from "./catalog";

interface AclTokenFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: AclSuggestion[];
  placeholder?: string;
  description?: string;
  isDisabled?: boolean;
  normalizer?: (value: string) => string;
  emptyLabel?: string;
}

export function AclTokenField({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  description,
  isDisabled,
  normalizer,
  emptyLabel = "Type a value or choose from the suggestions below.",
}: AclTokenFieldProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return suggestions
      .filter((suggestion) => !value.includes(suggestion.value))
      .filter((suggestion) => {
        if (!needle) return true;
        return (
          suggestion.value.toLowerCase().includes(needle) ||
          suggestion.label.toLowerCase().includes(needle) ||
          suggestion.detail?.toLowerCase().includes(needle)
        );
      })
      .slice(0, 10);
  }, [query, suggestions, value]);

  function addToken(rawValue: string) {
    const next = normalize(rawValue, normalizer);
    if (!next || value.includes(next)) {
      setQuery("");
      return;
    }

    onChange([...value, next]);
    setQuery("");
  }

  function removeToken(token: string) {
    onChange(value.filter((item) => item !== token));
  }

  function commitQuery() {
    if (!query.trim()) return;
    addToken(query);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium tracking-[0.18em] text-mist-500 uppercase dark:text-mist-400">
          {label}
        </label>
        <span className="text-xs text-mist-500 dark:text-mist-400">{value.length} selected</span>
      </div>
      <div className="rounded-2xl border border-mist-200 bg-white p-3 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:border-mist-800 dark:bg-mist-950">
        <div className="flex flex-wrap gap-2">
          {value.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/60 dark:text-indigo-200"
            >
              {token}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-indigo-200/70 dark:hover:bg-indigo-900/70"
                disabled={isDisabled}
                onClick={() => removeToken(token)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[12rem] flex-1 bg-transparent py-1 text-sm outline-hidden placeholder:text-mist-400 dark:placeholder:text-mist-500"
            disabled={isDisabled}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 100);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
                if (!query.trim()) return;
                event.preventDefault();
                commitQuery();
              }

              if (event.key === "Backspace" && !query && value.length > 0) {
                removeToken(value[value.length - 1] ?? "");
              }
            }}
            placeholder={placeholder}
            value={query}
          />
        </div>
      </div>
      {description ? (
        <p className="text-xs text-mist-500 dark:text-mist-400">{description}</p>
      ) : null}
      {isFocused ? (
        <div className="rounded-2xl border border-mist-200 bg-mist-50 p-2 dark:border-mist-800 dark:bg-mist-950/70">
          {filtered.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {filtered.map((suggestion) => (
                <button
                  key={suggestion.value}
                  type="button"
                  className="rounded-xl border border-transparent bg-white px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50 dark:bg-mist-900 dark:hover:border-indigo-900/70 dark:hover:bg-indigo-950/40"
                  disabled={isDisabled}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addToken(suggestion.value);
                  }}
                >
                  <div className="text-sm font-medium text-mist-950 dark:text-mist-50">
                    {suggestion.label}
                  </div>
                  <div className="text-xs text-mist-500 dark:text-mist-400">
                    {suggestion.category}
                    {suggestion.detail ? ` - ${suggestion.detail}` : ""}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-1 text-xs text-mist-500 dark:text-mist-400">{emptyLabel}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface SuggestionInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: AclSuggestion[];
  placeholder?: string;
  description?: string;
  isDisabled?: boolean;
  normalizer?: (value: string) => string;
}

export function SuggestionInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  description,
  isDisabled,
  normalizer,
}: SuggestionInputProps) {
  const listId = `${label.toLowerCase().replace(/\s+/g, "-")}-suggestions`;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium tracking-[0.18em] text-mist-500 uppercase dark:text-mist-400">
        {label}
      </label>
      <input
        className={cn(
          "w-full rounded-2xl border border-mist-200 bg-white px-4 py-3 text-sm shadow-sm outline-hidden transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15",
          "dark:border-mist-800 dark:bg-mist-950",
        )}
        disabled={isDisabled}
        list={listId}
        onChange={(event) => onChange(normalize(event.target.value, normalizer))}
        placeholder={placeholder}
        value={value}
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion.value} value={suggestion.value}>
            {suggestion.detail}
          </option>
        ))}
      </datalist>
      {description ? (
        <p className="text-xs text-mist-500 dark:text-mist-400">{description}</p>
      ) : null}
    </div>
  );
}

function normalize(value: string, normalizer?: (value: string) => string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return normalizer ? normalizer(trimmed) : trimmed;
}
