---
name: seo
description: Good SEO practices for web development. Use this skill in any component/page that contains HTML.
---

# Rules

- Every public route must define metadata using the Next.js Metadata API.
- Use `generateMetadata` when the data is dynamic.
- Define at least:
  - title
  - description
  - openGraph
  - robots when applicable
- Use semantic HTML tags: header, main, nav, section, article, footer.
- Use only one `<h1>` per page.
- Use the correct heading hierarchy: `h1` → `h6`.
- Prioritize Server Components.
- Avoid unnecessary JavaScript on the client.
- Use `Image` from Next.js for images.
- Do not use `<div>` when a semantic tag is available.
- Do not generate metadata manually via `<head>`.
- Do not duplicate titles and descriptions between pages.

## Performance SEO

- Prioritize Server Components.
- Avoid unnecessary JavaScript on the client.
- Use `Image` from Next.js for images.
- Do not use `<div>` when a semantic tag is available.
- Do not generate metadata manually via `<head>`.
- Do not duplicate titles and descriptions between pages.
- Use `alt` attribute for all images.
- Use `Link` from Next.js for links.

## Prohibitions

- Do not use `<div>` when a semantic tag is available.
- Do not generate metadata manually via `<head>`.
- Do not duplicate titles and descriptions between pages.

## Examples

```typescript
// Good
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Title",
    description: "Description",
    openGraph: {
      title: "Title",
      description: "Description",
    },
  };
}

// Bad
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Title",
    description: "Description",
    openGraph: {
      title: "Title",
      description: "Description",
    },
  };
}
```
