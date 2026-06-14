import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { reverseGeocodeLocation } from '../../lib/location.ts';
import { SERVICE_CATEGORY_OPTIONS, normalizeServiceCategory } from '../../lib/service-categories.ts';
import { uploadServiceImage } from '../../lib/profile-image-client.ts';
import Skeleton from '../../components/Skeleton.tsx';

const DEFAULT_LOCATION = {
  label: 'Colombo, Sri Lanka',
  district: 'Colombo',
  coordinates: [79.8612, 6.9271],
};

const FALLBACK_CITIES = [
  { label: 'Colombo, Sri Lanka', district: 'Colombo', coordinates: [79.8612, 6.9271] },
  { label: 'Kandy, Sri Lanka', district: 'Kandy', coordinates: [80.6337, 7.2906] },
  { label: 'Galle, Sri Lanka', district: 'Galle', coordinates: [80.217, 6.0535] },
  { label: 'Jaffna, Sri Lanka', district: 'Jaffna', coordinates: [80.0255, 9.6615] },
  { label: 'Kurunegala, Sri Lanka', district: 'Kurunegala', coordinates: [80.3647, 7.4863] },
];

const budgetPresets = ['1500', '3000', '5000', '10000'];
const MAX_SERVICE_IMAGES = 5;
const MAX_SERVICE_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_SERVICE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const locationPin = L.divIcon({
  className: 'customer-job-location-pin',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:#2F4DA0;box-shadow:0 4px 14px rgba(47,77,160,0.4);border:3px solid white;">
      <span style="width:10px;height:10px;border-radius:999px;background:white;display:block;"></span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function mapSearchResult(item: any) {
  const lon = Number(item.lon);
  const lat = Number(item.lat);
  return {
    label: item.display_name,
    district: item.address?.city || item.address?.town || item.address?.state_district || item.address?.county || 'Sri Lanka',
    coordinates: [lon, lat],
  };
}

function RecenterMap({ coordinates }: { coordinates: number[] }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      map.flyTo([coordinates[1], coordinates[0]], Math.max(map.getZoom(), 12), { duration: 0.8 });
    }
  }, [coordinates, map]);
  return null;
}

function ClickToPick({ onSelect }: { onSelect: (latlng: any) => void }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });
  return null;
}

function LocationMap({ coordinates, onSelect }: { coordinates: number[]; onSelect: (latlng: any) => void }) {
  const center: [number, number] = Array.isArray(coordinates) && coordinates.length === 2
    ? [Number(coordinates[1]), Number(coordinates[0])]
    : [DEFAULT_LOCATION.coordinates[1], DEFAULT_LOCATION.coordinates[0]];

  return (
    <MapContainer center={center} className="h-[240px] w-full rounded-xl z-10" scrollWheelZoom zoom={12}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker icon={locationPin} position={center} />
      <RecenterMap coordinates={coordinates} />
      <ClickToPick onSelect={onSelect} />
    </MapContainer>
  );
}

export default function CustomerPostServicePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set());
  
  const editJobId = routeLocation.state?.editJobId || '';
  const preferredProviderId = routeLocation.state?.preferredProviderId || '';
  const preferredProviderName = routeLocation.state?.preferredProviderName || '';
  const preferredCategory = routeLocation.state?.preferredCategory || '';

  // ⚡ Wizard flow tab controller
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState(DEFAULT_LOCATION.label);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [suggestions, setSuggestions] = useState(FALLBACK_CITIES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageError, setImageError] = useState('');
  const [serviceImages, setServiceImages] = useState<any[]>([]);

  const fallbackSuggestions = useMemo(() => {
    const query = address.trim().toLowerCase();
    if (!query) return FALLBACK_CITIES;
    return FALLBACK_CITIES.filter((city) => city.label.toLowerCase().includes(query) || city.district.toLowerCase().includes(query));
  }, [address]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url as string));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (editJobId) return;
    if (preferredCategory && !category) {
      setCategory(normalizeServiceCategory(preferredCategory));
    }
  }, [category, editJobId, preferredCategory]);

  useEffect(() => {
    const query = address.trim();
    if (query.length < 2) {
      setSuggestions(fallbackSuggestions);
      setSuggestionsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=lk&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
          { signal: controller.signal, headers: { Accept: 'application/json' } }
        );
        if (!response.ok) throw new Error('Search failed');
        const payload = await response.json();
        const mapped = Array.isArray(payload) ? payload.map(mapSearchResult) : [];
        setSuggestions(mapped.length ? mapped : fallbackSuggestions);
      } catch (loadError: any) {
        if (loadError.name !== 'AbortError') setSuggestions(fallbackSuggestions);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [address, fallbackSuggestions]);

  useEffect(() => {
    let mounted = true;
    async function loadJobForEdit() {
      if (!editJobId) return;
      try {
        setLoading(true);
        setError('');
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const response = await apiRequest(`/jobs/${editJobId}`, { headers });
        if (!mounted) return;

        const nextJob = response?.data;
        if (!nextJob) return;

        setTitle(nextJob.title || '');
        setCategory(normalizeServiceCategory(nextJob.category || ''));
        setDescription(nextJob.description || '');
        setBudget(String(nextJob.price ?? ''));
        setServiceImages(
          Array.isArray(nextJob.images)
            ? nextJob.images.filter(Boolean).slice(0, MAX_SERVICE_IMAGES).map((url, idx) => ({
                id: `existing-${idx}-${url}`,
                name: `Uploaded picture ${idx + 1}`,
                previewUrl: url,
                uploadedUrl: url,
              }))
            : []
        );

        const coords = Array.isArray(nextJob.location?.coordinates) && nextJob.location.coordinates.length === 2
          ? nextJob.location.coordinates
          : DEFAULT_LOCATION.coordinates;

        try {
          const resolved = await reverseGeocodeLocation(coords);
          if (mounted) {
            setSelectedLocation(resolved);
            setAddress(resolved.label);
          }
        } catch {
          if (!mounted) return;
          const fallbackLocation = {
            label: `Coordinates (${coords[1].toFixed(5)}, ${coords[0].toFixed(5)})`,
            district: 'Sri Lanka',
            coordinates: coords,
          };
          setSelectedLocation(fallbackLocation);
          setAddress(fallbackLocation.label);
        }
      } catch (loadError: any) {
        if (mounted) setError(loadError.message || 'Failed to load configuration');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadJobForEdit();
    return () => { mounted = false; };
  }, [accessToken, editJobId]);

  function applyLocation(location: any) {
    setSelectedLocation(location);
    setAddress(location.label);
    setShowSuggestions(false);
  }

  function addImageFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setImageError('');

    setServiceImages((current) => {
      const availableSlots = MAX_SERVICE_IMAGES - current.length;
      if (availableSlots <= 0) {
        setImageError(`Maximum threshold capped at ${MAX_SERVICE_IMAGES} attachments.`);
        return current;
      }

      const accepted: any[] = [];
      files.slice(0, availableSlots).forEach((file) => {
        if (!SUPPORTED_SERVICE_IMAGE_TYPES.has(file.type)) return;
        if (file.size > MAX_SERVICE_IMAGE_SIZE) return;

        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);
        accepted.push({
          id: `${file.name}-${Date.now()}`,
          file,
          name: file.name,
          previewUrl: url,
        });
      });
      return [...current, ...accepted];
    });
  }

  function removeImage(id: string) {
    setServiceImages((current) => current.filter((img) => img.id !== id));
  }

  async function handleMapSelect(latlng: any) {
    const resolved = await reverseGeocodeLocation([latlng.lng, latlng.lat]);
    setSelectedLocation(resolved);
    setAddress(resolved.label);
  }

  async function onSubmit(event: any) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const imageUrls = [];
      for (const item of serviceImages) {
        if (item.uploadedUrl) imageUrls.push(item.uploadedUrl);
        else if (item.file) imageUrls.push(await uploadServiceImage(item.file, accessToken));
      }

      await apiRequest(editJobId ? `/jobs/${editJobId}` : '/jobs', {
        method: editJobId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          location: { type: 'Point', coordinates: selectedLocation.coordinates },
          images: imageUrls,
          price: Number(budget) || 0,
          preferredProviderId: preferredProviderId || null,
        }),
      });

      setSuccess('Service parameters updated securely.');
      setTimeout(() => navigate('/customer/my-jobs'), 600);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-['Inter'] flex justify-center">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-10">
        
        <header className="mb-8 border-b border-slate-100 pb-5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{editJobId ? 'Edit Assignment' : 'Post a Service'}</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            {preferredProviderName ? `Direct pipeline match for ${preferredProviderName}.` : 'Broadcast trade criteria to verified district providers.'}
          </p>

          {/* Wizard step tabs */}
          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={() => setCurrentStep(1)} className="flex items-center gap-2 outline-none border-none bg-transparent cursor-pointer">
              <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${currentStep === 1 ? 'bg-[#2F4DA0] text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {currentStep === 2 ? '✓' : '1'}
              </div>
              <span className={`text-xs font-bold ${currentStep === 1 ? 'text-slate-800' : 'text-slate-400'}`}>Job Definition</span>
            </button>
            <div className="flex-1 mx-4 h-0.5 bg-slate-100" />
            <button type="button" disabled={!title.trim() || !category || !description.trim()} onClick={() => setCurrentStep(2)} className="flex items-center gap-2 outline-none border-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${currentStep === 2 ? 'bg-[#2F4DA0] text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
              <span className={`text-xs font-bold ${currentStep === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Region & Budget</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            
            {/* STEP 1: GENERAL JOB SCOPE */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Job Title *</label>
                  <input type="text" className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 transition-all font-medium" placeholder="e.g., Bedroom electrical wiring failure" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Service Category *</label>
                  <div className="relative">
                    <select className="w-full h-11 pl-4 pr-10 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 appearance-none font-medium transition-all cursor-pointer bg-white" value={category} onChange={(e) => setCategory(e.target.value)} required>
                      <option value="" disabled>Choose core trade field</option>
                      {SERVICE_CATEGORY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <span className="absolute inset-y-0 right-3.5 material-symbols-outlined text-slate-400 flex items-center pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Detailed Description *</label>
                  <textarea className="w-full p-4 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 resize-none leading-relaxed font-medium transition-all" rows={4} placeholder="Describe the problem context safely so our matching algorithm can notify specific technicians..." value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <button type="button" disabled={!title.trim() || !category || !description.trim()} onClick={() => setCurrentStep(2)} className="w-full h-12 bg-[#2F4DA0] text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none">
                  Next: Setup Budget & Location
                </button>
              </div>
            )}

            {/* STEP 2: PRICING AND COORDINATE GEOFENCING */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Estimated Budget (LKR)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xs font-bold text-slate-400">LKR</span>
                    <input type="number" className="w-full h-11 pl-12 pr-4 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 font-medium transition-all" placeholder="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
                  </div>
                  
                  {/* Premium Sri Lankan Pricing Preset cards */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {budgetPresets.map((val) => (
                      <button key={val} type="button" onClick={() => setBudget(val)} className={`py-2 text-xs font-bold border rounded-lg transition-all cursor-pointer ${budget === val ? 'border-[#2F4DA0] bg-blue-50 text-[#2F4DA0] shadow-2xs' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                        {Number(val).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Service Location Pin *</label>
                  <div className="relative">
                    <input type="text" className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 font-medium transition-all" placeholder="Search town or area in Sri Lanka..." value={address} onChange={(e) => { setAddress(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
                    <span className="absolute left-4 material-symbols-outlined text-slate-400 text-lg top-1/2 -translate-y-1/2">location_on</span>
                    
                    {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
                      <div className="absolute left-0 right-0 top-full mt-2 border border-slate-200 bg-white rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {suggestionsLoading && <div className="p-3 text-xs font-semibold text-slate-400 italic">Fetching maps data...</div>}
                        {suggestions.map((loc) => (
                          <button key={`${loc.label}-${loc.coordinates.join(',')}`} type="button" onMouseDown={() => applyLocation(loc)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 flex flex-col cursor-pointer">
                            <span className="text-xs font-bold text-slate-800 truncate">{loc.label}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">District: {loc.district}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Leaflet map integration container box overlay */}
                  <div className="rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Node Anchor Coordinates</span>
                      <span className="font-mono text-slate-700 font-extrabold">{selectedLocation.coordinates[1].toFixed(5)}, {selectedLocation.coordinates[0].toFixed(5)}</span>
                    </div>
                    <LocationMap coordinates={selectedLocation.coordinates} onSelect={handleMapSelect} />
                  </div>
                </div>

                {/* Media Gallery Uploads */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Job Attachments</label>
                  <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImageFiles(e.target.files)} />
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/60 transition-all cursor-pointer outline-none">
                    <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">add_photo_alternate</span>
                    <span className="text-xs font-bold text-slate-500">Upload situational project captures</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{serviceImages.length} of {MAX_SERVICE_IMAGES} attached</span>
                  </button>
                  
                  {serviceImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {serviceImages.map((img) => (
                        <div key={img.id} className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden group bg-slate-50">
                          <img src={img.previewUrl} className="w-full h-full object-cover" alt="" />
                          <button type="button" onClick={() => removeImage(img.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center border-none cursor-pointer hover:bg-red-600 transition-colors">
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                {success && <p className="text-xs font-bold text-emerald-600">{success}</p>}

                {/* Action tray row controls */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <button type="button" onClick={() => setCurrentStep(1)} className="h-11 border border-slate-200 text-slate-600 font-bold text-xs tracking-wider uppercase rounded-xl hover:bg-slate-50 cursor-pointer bg-white">Back</button>
                  <button type="submit" disabled={busy || !budget} className="col-span-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-widest uppercase rounded-xl shadow-md transition-all disabled:opacity-50 border-none cursor-pointer">
                    {busy ? 'Uploading Data...' : editJobId ? 'Update Service Request' : 'Broadcast Request Now'}
                  </button>
                </div>
              </div>
            )}

          </form>
        )}
      </div>
    </div>
  );
}