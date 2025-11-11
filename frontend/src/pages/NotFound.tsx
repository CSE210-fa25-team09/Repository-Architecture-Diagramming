export function NotFound() {
  return (
    <div
      role="status"
      className="rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] p-6 text-[color:var(--page-foreground)]"
    >
      <p className="font-semibold">Page not found</p>
      <p className="text-sm text-[color:var(--muted-text)]">
        Use the header navigation to return home.
      </p>
    </div>
  )
}
