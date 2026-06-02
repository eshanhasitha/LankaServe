export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200/80 ${className}`.trim()} />;
}

