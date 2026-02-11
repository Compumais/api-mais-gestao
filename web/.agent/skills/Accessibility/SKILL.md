---
name: accessibility
description: Good accessibility practices for web development. Use this skill when building a new or modifying a component/page.
---

## Rules

- Every interactive component must be keyboard accessible.
- Clickable elements must be:
  - `<button>`.
  - `<a>`.
  - or have appropriate `role` and `tabindex` attributes.

## Images and media

- Every images must have `alt` attribute.
- Decorative icons must use `aria-hidden="true"`.

## Forms

- Inputs must have `label` associated.
- Error messages must be accessible (aria-live).
- Required fields must be indicated semantically.

## Semantics and ARIA

- Use ARIA only when HTML semantic is not enough.
- Do not abuse of `role`.
- Ensure adequate color contrast.

## Prohibitions

- Do not use `div` or `span` as button.
- Do not remove focus outline without accessible alternative.
- Do not create interactions only with mouse.

## Examples


```typescript
// Good: Accessible button with proper semantics and keyboard support
type Props = {
  onSubmit: () => void
  isLoading?: boolean
}

export function SubmitButton({ onSubmit, isLoading = false }: Props) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? "Submitting..." : "Submit"}
    </button>
  )
}


// Bad: Not accessible button without proper semantics and keyboard support
type Props = {
  onSubmit: () => void
  isLoading?: boolean
}

export function SubmitButton({ onSubmit, isLoading = false }: Props) {
  return (
    <div
      onClick={onSubmit}
      aria-disabled={isLoading}
    >
      {isLoading ? "Submitting..." : "Submit"}
    </div>
  )
}

// Good: Accessible form input with label and error handling
export function EmailField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const errorId = "email-error"

  return (
    <div>
      <label htmlFor="email">Email address</label>

      <input
        id="email"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required
      />

      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}


// Bad: Not accessible form input without proper label and error handling
export function EmailField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {error && <p role="alert">{error}</p>}
    </div>
  )
}

// Good: Custom component with proper role and keyboard handling
export function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onChange(!value)
        }
      }}
    >
      {value ? "On" : "Off"}
    </div>
  )
}

// Bad: Not accessible custom component without proper role and keyboard handling
export function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!value)}
    >
      {value ? "On" : "Off"}
    </div>
  )
}
```

