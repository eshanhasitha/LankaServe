import Avatar from './Avatar.tsx';

type Badge = {
  label: string;
  className?: string;
};

function InfoBlock({ item }: { item?: any }) {
  if (!item) return null;

  if (item.type === 'avatar') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Avatar src={item.image} name={item.name || item.value || 'User'} className="w-10 h-10 rounded-full border border-slate-200" />
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</p>
          <p className="font-medium text-slate-900">{item.value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className={`material-symbols-outlined text-slate-400 text-lg ${item.iconClassName || ''}`}>{item.icon}</span>
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</p>
        <p className={`font-medium ${item.valueClassName || 'text-slate-900'}`}>{item.value}</p>
      </div>
    </div>
  );
}

export default function JobListCard({
  badges = [] as Badge[],
  title,
  infoBlocks = [],
  description = '',
  rightSummary,
  actions,
  className = '',
}: {
  badges?: Badge[];
  title?: string;
  infoBlocks?: any[];
  description?: string;
  rightSummary?: { label: string; value: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`bg-white p-6 rounded-[16px] shadow-sm border border-slate-50 flex items-center justify-between ${className}`.trim()}>
      <div className="flex-1">
        {badges.length ? (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {badges.map((badge, index) => (
              <span
                key={`${badge.label}-${index}`}
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        <h3 className="text-lg font-bold text-slate-900 mb-1">{title || 'Untitled Job'}</h3>

        {infoBlocks.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {infoBlocks.map((item, index) => (
              <InfoBlock key={`${item.label || item.value || 'item'}-${index}`} item={item} />
            ))}
          </div>
        ) : null}

        {description ? (
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl mt-4">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-4 ml-8">
        {rightSummary ? (
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rightSummary.label}</p>
            <p className="text-xl font-bold text-slate-900">{rightSummary.value}</p>
          </div>
        ) : null}
        {actions ? <div className="flex items-center gap-3 flex-wrap justify-end">{actions}</div> : null}
      </div>
    </article>
  );
}

