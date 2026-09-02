// Shared by __root.tsx (hides the public Navigation/Footer) and
// AdminLayout.tsx (collapses the sidebar, hides its own header) - the page
// builder wants the canvas to have the entire viewport, so both layers
// strip themselves down for exactly these two routes and nothing else
// under /admin.
export function isPageEditorRoute(pathname: string): boolean {
  return /^\/admin\/pages\/(new|edit\/)/.test(pathname);
}
