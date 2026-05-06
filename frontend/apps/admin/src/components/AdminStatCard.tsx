export default function AdminStatCard({ label, value, tone = 'default', detail = '' }) {
  const cardClasses = tone === 'accent'
    ? 'border-blue-100 bg-gradient-to-b from-blue-50 to-white'
    : 'border-slate-200 bg-white';

  return (
    <article className={`grid gap-2 rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <strong className="text-3xl font-semibold text-slate-900">{value}</strong>
      {detail ? <small className="text-sm text-slate-500">{detail}</small> : null}
    </article>
  );
}
