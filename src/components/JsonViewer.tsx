type JsonViewerProps = {
  title: string
  value: unknown
}

export function JsonViewer({ title, value }: JsonViewerProps) {
  return (
    <section className="json-panel">
      <h3>{title}</h3>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  )
}
