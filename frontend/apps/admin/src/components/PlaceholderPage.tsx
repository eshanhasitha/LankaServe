export default function PlaceholderPage({ title, endpoint }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">This section is waiting for a dedicated backend implementation.</p>
      </div>
      {endpoint ? (
        <code className="inline-flex w-fit rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Backend endpoint: {endpoint}
        </code>
      ) : null}
    </section>
  );
}
