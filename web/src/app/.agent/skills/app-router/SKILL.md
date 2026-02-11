---
name: app-router
description: Next.js App Router best practices. Use this skill when building a new or modifying a page, layout, loading, error, or template file.
---

## Rukes

- Use App Router
- Use Server Components by default
- Use Client Components only when necessary
- Use Server Actions for mutations
- Separate responsibilities:
  - `page.tsx` => composition
  - `layout.tsx` => structure
  - `loading.tsx` / `error.tsx` => states

## Prohibitions

- Don't make direct fetch in client `page.tsx`
- Don't mix data logic with UI
- Don't access authentication directly without abstraction

## Examples

```tsx
// Good
export default async function Page() {
  const data = await getData();
  return <Component data={data} />;
}

// Bad
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => {
    getData().then(setData);
  }, []);
  return <Component data={data} />;
}
```
