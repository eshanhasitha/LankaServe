type JobImageGalleryProps = {
  images?: Array<string | null | undefined>;
  title?: string;
  className?: string;
};

export default function JobImageGallery({
  images,
  title = 'Uploaded Images',
  className = '',
}: JobImageGalleryProps) {
  const imageUrls = Array.from(
    new Set(
      (images || [])
        .map((image) => String(image || '').trim())
        .filter(Boolean)
    )
  );

  if (!imageUrls.length) return null;

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="material-symbols-outlined text-[#2F4DA0]">photo_library</span>
          {title}
        </h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#2F4DA0]">
          {imageUrls.length} image{imageUrls.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {imageUrls.map((imageUrl, index) => (
          <a
            key={imageUrl}
            className="group relative block overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
            href={imageUrl}
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt={`Uploaded job image ${index + 1}`}
              className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-40"
              loading="lazy"
              src={imageUrl}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-semibold text-white">Open image</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
