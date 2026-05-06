export default function Avatar({ src, name, className }) {
  if (src) return <img alt={name || 'avatar'} className={`${className} rounded-full object-cover`} src={src} />;
  const initial = name?.charAt(0)?.toUpperCase();
  return (
    <div className={`${className} rounded-full bg-[#2F4DA0] flex items-center justify-center text-white font-bold shrink-0`}>
      {initial || <span className="material-symbols-outlined text-sm">person</span>}
    </div>
  );
}
