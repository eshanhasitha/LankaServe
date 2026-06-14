import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export const providerLanguageStorageKey = 'lankaserve.web.language';
export const providerLanguageOptions = [
  { code: 'en', label: 'EN' },
  { code: 'si', label: 'SI' },
  { code: 'ta', label: 'TA' },
] as const;

export type ProviderLanguageCode = (typeof providerLanguageOptions)[number]['code'];

type TranslationMap = Record<string, { si: string; ta: string }>;

type ProviderI18nContextValue = {
  language: ProviderLanguageCode;
  setLanguage: (language: ProviderLanguageCode) => void;
  t: (text: string) => string;
};

const noopContext: ProviderI18nContextValue = {
  language: 'en',
  setLanguage: () => undefined,
  t: (text) => text,
};

const ProviderI18nContext = createContext<ProviderI18nContextValue>(noopContext);

const copy: TranslationMap = {
  Dashboard: { si: 'උපකරණ පුවරුව', ta: 'டாஷ்போர்டு' },
  'Provider Dashboard': { si: 'සපයන්නාගේ උපකරණ පුවරුව', ta: 'வழங்குநர் டாஷ்போர்டு' },
  'Browse Jobs': { si: 'රැකියා බලන්න', ta: 'வேலைகளை பார்க்க' },
  'Job Requests': { si: 'රැකියා ඉල්ලීම්', ta: 'வேலை கோரிக்கைகள்' },
  'My Jobs': { si: 'මගේ රැකියා', ta: 'என் வேலைகள்' },
  Earnings: { si: 'ආදායම්', ta: 'வருமானம்' },
  Badges: { si: 'ලාංඡන', ta: 'பேட்ஜ்கள்' },
  Messages: { si: 'පණිවිඩ', ta: 'செய்திகள்' },
  Analytics: { si: 'විශ්ලේෂණ', ta: 'பகுப்பாய்வு' },
  Notifications: { si: 'දැනුම්දීම්', ta: 'அறிவிப்புகள்' },
  'Help Center': { si: 'උදව් මධ්‍යස්ථානය', ta: 'உதவி மையம்' },
  Settings: { si: 'සැකසුම්', ta: 'அமைப்புகள்' },
  Logout: { si: 'පිටවන්න', ta: 'வெளியேறு' },
  Provider: { si: 'සපයන්නා', ta: 'வழங்குநர்' },
  'Open navigation menu': { si: 'සංචාලන මෙනුව විවෘත කරන්න', ta: 'வழிசெலுத்தல் மெனுவை திற' },
  'Close navigation menu': { si: 'සංචාලන මෙනුව වසන්න', ta: 'வழிசெலுத்தல் மெனுவை மூடு' },
  'Open profile settings': { si: 'පැතිකඩ සැකසුම් විවෘත කරන්න', ta: 'சுயவிவர அமைப்புகளை திற' },

  'Search milestones, badges...': { si: 'සන්ධිස්ථාන, ලාංඡන සොයන්න...', ta: 'மைல்கற்கள், பேட்ஜ்களை தேடுங்கள்...' },
  'Search earnings, invoices...': { si: 'ආදායම්, ඉන්වොයිසි සොයන්න...', ta: 'வருமானம், ரசீதுகளை தேடுங்கள்...' },
  'Search settings...': { si: 'සැකසුම් සොයන්න...', ta: 'அமைப்புகளை தேடுங்கள்...' },
  'Search analytics data...': { si: 'විශ්ලේෂණ දත්ත සොයන්න...', ta: 'பகுப்பாய்வு தரவை தேடுங்கள்...' },
  'Search notifications, tasks...': { si: 'දැනුම්දීම්, කාර්යයන් සොයන්න...', ta: 'அறிவிப்புகள், பணிகளை தேடுங்கள்...' },
  'Search my jobs, history...': { si: 'මගේ රැකියා, ඉතිහාසය සොයන්න...', ta: 'என் வேலைகள், வரலாற்றை தேடுங்கள்...' },
  'Search requests...': { si: 'ඉල්ලීම් සොයන්න...', ta: 'கோரிக்கைகளை தேடுங்கள்...' },
  'Search requests, locations...': { si: 'ඉල්ලීම්, ස්ථාන සොයන්න...', ta: 'கோரிக்கைகள், இடங்களை தேடுங்கள்...' },
  'Search dashboard, messages...': { si: 'උපකරණ පුවරුව, පණිවිඩ සොයන්න...', ta: 'டாஷ்போர்டு, செய்திகளை தேடுங்கள்...' },
  'Search provider tools...': { si: 'සපයන්නාගේ මෙවලම් සොයන්න...', ta: 'வழங்குநர் கருவிகளை தேடுங்கள்...' },

  'Welcome back, here\'s what\'s happening with your services today.': {
    si: 'ආයුබෝවන්, අද ඔබගේ සේවාවල සිදුවන දේ මෙන්න.',
    ta: 'மீண்டும் வரவேற்கிறோம், இன்று உங்கள் சேவைகளில் நடப்பவை இதோ.',
  },
  'Total Earnings': { si: 'මුළු ආදායම', ta: 'மொத்த வருமானம்' },
  'Completed Jobs': { si: 'සම්පූර්ණ කළ රැකියා', ta: 'முடித்த வேலைகள்' },
  'Average Rating': { si: 'සාමාන්‍ය ඇගයීම', ta: 'சராசரி மதிப்பீடு' },
  'Success Rate': { si: 'සාර්ථකතා අනුපාතය', ta: 'வெற்றி விகிதம்' },
  'Lifetime revenue from services': { si: 'සේවාවලින් ජීවිත කාලය තුළ ලැබූ ආදායම', ta: 'சேவைகளில் இருந்து ஆயுள் முழு வருமானம்' },
  'Last added': { si: 'අවසන් වරට එක් කළේ', ta: 'கடைசியாக சேர்க்கப்பட்டது' },
  'Updated recently': { si: 'මෑතකදී යාවත්කාලීන කරන ලදී', ta: 'சமீபத்தில் புதுப்பிக்கப்பட்டது' },
  'Based on customer reviews': { si: 'පාරිභෝගික විචාර මත පදනම්ව', ta: 'வாடிக்கையாளர் மதிப்புரைகளை அடிப்படையாகக் கொண்டு' },
  Pending: { si: 'බලාපොරොත්තුවෙන්', ta: 'நிலுவையில்' },
  Ongoing: { si: 'ක්‍රියාත්මක', ta: 'நடைபெறுகிறது' },
  Completed: { si: 'සම්පූර්ණ', ta: 'முடிந்தது' },
  Cancelled: { si: 'අවලංගු', ta: 'ரத்து செய்யப்பட்டது' },
  Accepted: { si: 'පිළිගත්', ta: 'ஏற்றுக்கொண்டது' },
  Assigned: { si: 'පවරා ඇත', ta: 'நியமிக்கப்பட்டது' },
  Available: { si: 'ලබාගත හැක', ta: 'கிடைக்கும்' },
  Unavailable: { si: 'ලබාගත නොහැක', ta: 'கிடைக்காது' },
  Active: { si: 'සක්‍රීය', ta: 'செயலில்' },
  Unknown: { si: 'නොදනී', ta: 'தெரியவில்லை' },
  New: { si: 'නව', ta: 'புதிய' },
  'In Progress': { si: 'ක්‍රියාත්මකයි', ta: 'நடைபெறுகிறது' },
  'Earnings Performance': { si: 'ආදායම් කාර්ය සාධනය', ta: 'வருமான செயல்திறன்' },
  'Monthly revenue trend (last 6 months)': { si: 'මාසික ආදායම් ප්‍රවණතාව (අවසන් මාස 6)', ta: 'மாதாந்திர வருமான போக்கு (கடைசி 6 மாதங்கள்)' },
  'Live Data': { si: 'සජීවී දත්ත', ta: 'நேரடி தரவு' },
  'Your Badges': { si: 'ඔබේ ලාංඡන', ta: 'உங்கள் பேட்ஜ்கள்' },
  'View All': { si: 'සියල්ල බලන්න', ta: 'அனைத்தையும் காண்க' },
  'Suggested Job Requests': { si: 'යෝජිත රැකියා ඉල්ලීම්', ta: 'பரிந்துரைக்கப்பட்ட வேலை கோரிக்கைகள்' },
  'No suggested jobs available right now.': { si: 'මේ මොහොතේ යෝජිත රැකියා නොමැත.', ta: 'இப்போது பரிந்துரைக்கப்பட்ட வேலைகள் இல்லை.' },
  'Browse All': { si: 'සියල්ල බලන්න', ta: 'அனைத்தையும் பார்க்க' },
  'View Job': { si: 'රැකියාව බලන්න', ta: 'வேலையைப் பார்க்க' },
  'Accept Job': { si: 'රැකියාව පිළිගන්න', ta: 'வேலையை ஏற்க' },
  'View Details': { si: 'විස්තර බලන්න', ta: 'விவரங்களைப் பார்க்க' },
  'Fixed Budget': { si: 'ස්ථිර මුදල', ta: 'நிலையான பட்ஜெட்' },
  'Starting Price': { si: 'ආරම්භක මිල', ta: 'தொடக்க விலை' },
  'Hourly Rate': { si: 'පැයක ගාස්තුව', ta: 'மணிநேர கட்டணம்' },

  'No jobs available in this tab.': { si: 'මෙම ටැබය තුළ රැකියා නැත.', ta: 'இந்த தாவலில் வேலைகள் இல்லை.' },
  'No open job requests available right now.': { si: 'මේ මොහොතේ විවෘත රැකියා ඉල්ලීම් නොමැත.', ta: 'இப்போது திறந்த வேலை கோரிக்கைகள் இல்லை.' },
  'Available Requests': { si: 'ලබාගත හැකි ඉල්ලීම්', ta: 'கிடைக்கும் கோரிக்கைகள்' },
  Suggested: { si: 'යෝජිත', ta: 'பரிந்துரை' },
  Customer: { si: 'පාරිභෝගිකයා', ta: 'வாடிக்கையாளர்' },
  Location: { si: 'ස්ථානය', ta: 'இடம்' },
  Budget: { si: 'මුදල', ta: 'பட்ஜெட்' },
  Distance: { si: 'දුර', ta: 'தூரம்' },
  Reject: { si: 'ප්‍රතික්ෂේප කරන්න', ta: 'நிராகரி' },
  Accept: { si: 'පිළිගන්න', ta: 'ஏற்க' },

  'Track and manage your active service jobs.': { si: 'ඔබගේ සක්‍රීය සේවා රැකියා අනුගමනය කර කළමනාකරණය කරන්න.', ta: 'உங்கள் செயலில் உள்ள சேவை வேலைகளை கண்காணித்து நிர்வகிக்கவும்.' },
  'No jobs found for this tab.': { si: 'මෙම ටැබය සඳහා රැකියා නැත.', ta: 'இந்த தாவலில் வேலைகள் இல்லை.' },
  Status: { si: 'තත්ත්වය', ta: 'நிலை' },
  'Provider assigned': { si: 'සපයන්නා පවරා ඇත', ta: 'வழங்குநர் நியமிக்கப்பட்டார்' },
  'Job completed': { si: 'රැකියාව සම්පූර්ණයි', ta: 'வேலை முடிந்தது' },
  Finished: { si: 'අවසන් කළේ', ta: 'முடிந்தது' },

  'Job Details': { si: 'රැකියා විස්තර', ta: 'வேலை விவரங்கள்' },
  'Job Progress': { si: 'රැකියා ප්‍රගතිය', ta: 'வேலை முன்னேற்றம்' },
  'Job Posted': { si: 'රැකියාව පළ කරන ලදී', ta: 'வேலை பதிவிடப்பட்டது' },
  'Provider Assigned': { si: 'සපයන්නා පවරා ඇත', ta: 'வழங்குநர் நியமிக்கப்பட்டார்' },
  'Job in Progress': { si: 'රැකියාව ක්‍රියාත්මකයි', ta: 'வேலை நடைபெறுகிறது' },
  'Job Completed': { si: 'රැකියාව සම්පූර්ණයි', ta: 'வேலை முடிந்தது' },
  'Awaiting confirmation': { si: 'තහවුරු කිරීම බලාපොරොත්තුවෙන්', ta: 'உறுதிப்படுத்தலை காத்திருக்கிறது' },
  'Provider is on site': { si: 'සපයන්නා ස්ථානයේ සිටී', ta: 'வழங்குநர் இடத்தில் உள்ளார்' },
  'Show this code to the customer upon arrival': { si: 'පැමිණි විට මෙම කේතය පාරිභෝගිකයාට පෙන්වන්න', ta: 'வருகையின் போது இந்த குறியீட்டை வாடிக்கையாளரிடம் காட்டுங்கள்' },
  'Scan for verification': { si: 'සත්‍යාපනය සඳහා ස්කෑන් කරන්න', ta: 'சரிபார்ப்புக்கு ஸ்கேன் செய்யவும்' },
  'Refresh Code': { si: 'කේතය නැවුම් කරන්න', ta: 'குறியீட்டை புதுப்பி' },
  'Confirm Job Completion': { si: 'රැකියාව සම්පූර්ණ බව තහවුරු කරන්න', ta: 'வேலை முடிந்ததை உறுதிசெய்' },
  'Service Category': { si: 'සේවා වර්ගය', ta: 'சேவை வகை' },
  Category: { si: 'වර්ගය', ta: 'வகை' },
  Address: { si: 'ලිපිනය', ta: 'முகவரி' },
  'Total Quote': { si: 'මුළු මිල ගණන්', ta: 'மொத்த மதிப்பு' },
  'Estimated Duration': { si: 'ඇස්තමේන්තු කාලය', ta: 'மதிப்பிடப்பட்ட காலம்' },
  Urgency: { si: 'හදිසි බව', ta: 'அவசரம்' },
  'Payment Summary': { si: 'ගෙවීම් සාරාංශය', ta: 'கட்டண சுருக்கம்' },
  'Uploaded Images': { si: 'උඩුගත කළ පින්තූර', ta: 'பதிவேற்றிய படங்கள்' },
  'No images uploaded for this job.': { si: 'මෙම රැකියාව සඳහා පින්තූර උඩුගත කර නැත.', ta: 'இந்த வேலைக்கு படங்கள் பதிவேற்றப்படவில்லை.' },

  'Stay updated with your latest activities and job updates.': { si: 'ඔබගේ නවතම ක්‍රියාකාරකම් සහ රැකියා යාවත්කාලීන ගැන දැනුවත් වන්න.', ta: 'உங்கள் சமீபத்திய செயல்பாடுகள் மற்றும் வேலை புதுப்பிப்புகளை அறியுங்கள்.' },
  'Mark all as read': { si: 'සියල්ල කියවූ බව සලකන්න', ta: 'அனைத்தையும் படித்ததாக குறி' },
  All: { si: 'සියල්ල', ta: 'அனைத்தும்' },
  Jobs: { si: 'රැකියා', ta: 'வேலைகள்' },
  Payments: { si: 'ගෙවීම්', ta: 'கட்டணங்கள்' },
  Reviews: { si: 'විචාර', ta: 'மதிப்புரைகள்' },
  System: { si: 'පද්ධතිය', ta: 'அமைப்பு' },
  'No notifications available.': { si: 'දැනුම්දීම් නොමැත.', ta: 'அறிவிப்புகள் இல்லை.' },
  'Completion Confirmation Required': { si: 'සම්පූර්ණ කිරීමේ තහවුරු කිරීම අවශ්‍යයි', ta: 'முடிவு உறுதிப்படுத்தல் தேவை' },
  'Job Started': { si: 'රැකියාව ආරම්භ කළා', ta: 'வேலை தொடங்கியது' },

  'My Earnings': { si: 'මගේ ආදායම්', ta: 'என் வருமானம்' },
  'Total Lifetime Earnings': { si: 'ජීවිත කාලය තුළ මුළු ආදායම', ta: 'மொத்த ஆயுள் வருமானம்' },
  'Monthly Performance': { si: 'මාසික කාර්ය සාධනය', ta: 'மாதாந்திர செயல்திறன்' },
  Details: { si: 'විස්තර', ta: 'விவரங்கள்' },
  'Current Month': { si: 'වත්මන් මාසය', ta: 'தற்போதைய மாதம்' },
  'Earnings History': { si: 'ආදායම් ඉතිහාසය', ta: 'வருமான வரலாறு' },
  'No earnings yet.': { si: 'තවම ආදායම් නැත.', ta: 'இன்னும் வருமானம் இல்லை.' },

  'Achievements & Badges': { si: 'ජයග්‍රහණ සහ ලාංඡන', ta: 'சாதனைகள் மற்றும் பேட்ஜ்கள்' },
  '8 Badges Earned': { si: 'ලාංඡන 8ක් ලබා ඇත', ta: '8 பேட்ஜ்கள் பெற்றுள்ளீர்கள்' },
  'Keep providing excellent service to earn more!': { si: 'තවත් ලබා ගැනීමට විශිෂ්ට සේවාව දිගටම සපයන්න!', ta: 'மேலும் பெற சிறந்த சேவையைத் தொடருங்கள்!' },
  'Top Rated Provider': { si: 'ඉහළ ඇගයීම් ලැබූ සපයන්නා', ta: 'சிறந்த மதிப்பீடு பெற்ற வழங்குநர்' },
  'Quick Responder': { si: 'ඉක්මන් ප්‍රතිචාරකයා', ta: 'விரைவான பதிலளிப்பவர்' },
  'Verified Hero': { si: 'සත්‍යාපිත වීරයා', ta: 'சரிபார்க்கப்பட்ட ஹீரோ' },
  'Punctual Pro': { si: 'වේලාවට පැමිණෙන වෘත්තිකයා', ta: 'நேர்த்தியான நிபுணர்' },
  'QR Master': { si: 'QR විශේෂඥයා', ta: 'QR நிபுணர்' },
  'Elite Expert': { si: 'විශේෂඥ මට්ටම', ta: 'சிறப்பு நிபுணர்' },
  Awarded: { si: 'ප්‍රදානය කළේ', ta: 'வழங்கப்பட்டது' },
  'Complete 500 jobs to unlock this prestigious badge.': { si: 'මෙම ගෞරවනීය ලාංඡනය විවෘත කිරීමට රැකියා 500ක් සම්පූර්ණ කරන්න.', ta: 'இந்த சிறப்பு பேட்ஜைத் திறக்க 500 வேலைகளை முடிக்கவும்.' },

  'Performance insights for your provider account.': { si: 'ඔබගේ සපයන්නා ගිණුම සඳහා කාර්ය සාධන අවබෝධ.', ta: 'உங்கள் வழங்குநர் கணக்கிற்கான செயல்திறன் புரிதல்கள்.' },
  Revenue: { si: 'ආදායම', ta: 'வருமானம்' },
  Rating: { si: 'ඇගයීම', ta: 'மதிப்பீடு' },
  'Response Time': { si: 'ප්‍රතිචාර කාලය', ta: 'பதில் நேரம்' },
  'This Month': { si: 'මෙම මාසය', ta: 'இந்த மாதம்' },
  'Last Month': { si: 'පසුගිය මාසය', ta: 'கடந்த மாதம்' },
  'No analytics data available.': { si: 'විශ්ලේෂණ දත්ත නොමැත.', ta: 'பகுப்பாய்வு தரவு இல்லை.' },

  'Account Settings': { si: 'ගිණුම් සැකසුම්', ta: 'கணக்கு அமைப்புகள்' },
  'Manage your account preferences and security settings.': { si: 'ඔබගේ ගිණුම් කැමැත්ත සහ ආරක්ෂක සැකසුම් කළමනාකරණය කරන්න.', ta: 'உங்கள் கணக்கு விருப்பங்கள் மற்றும் பாதுகாப்பு அமைப்புகளை நிர்வகிக்கவும்.' },
  Profile: { si: 'පැතිකඩ', ta: 'சுயவிவரம்' },
  Security: { si: 'ආරක්ෂාව', ta: 'பாதுகாப்பு' },
  'Services & Availability': { si: 'සේවා සහ ලබාගත හැකියාව', ta: 'சேவைகள் மற்றும் கிடைக்கும் நிலை' },
  Verification: { si: 'සත්‍යාපනය', ta: 'சரிபார்ப்பு' },
  'Trust Level': { si: 'විශ්වාස මට්ටම', ta: 'நம்பிக்கை நிலை' },
  'Verification Status': { si: 'සත්‍යාපන තත්ත්වය', ta: 'சரிபார்ப்பு நிலை' },
  'Complete verification to get the "Verified Provider" badge.': {
    si: '"සත්‍යාපිත සපයන්නා" ලාංඡනය ලබා ගැනීමට සත්‍යාපනය සම්පූර්ණ කරන්න.',
    ta: '"சரிபார்க்கப்பட்ட வழங்குநர்" பேட்ஜைப் பெற சரிபார்ப்பை முடிக்கவும்.',
  },
  'Submit Verification': { si: 'සත්‍යාපනය යවන්න', ta: 'சரிபார்ப்பை சமர்ப்பி' },
  'Profile Information': { si: 'පැතිකඩ තොරතුරු', ta: 'சுயவிவர தகவல்' },
  'Complete your profile to increase trust among customers.': { si: 'පාරිභෝගිකයන් අතර විශ්වාසය වැඩි කිරීමට ඔබගේ පැතිකඩ සම්පූර්ණ කරන්න.', ta: 'வாடிக்கையாளர்களிடையே நம்பிக்கையை உயர்த்த உங்கள் சுயவிவரத்தை பூர்த்தி செய்யுங்கள்.' },
  Remove: { si: 'ඉවත් කරන්න', ta: 'அகற்று' },
  'Recommended: Square JPG or PNG, minimum 400x400 pixels.': { si: 'නිර්දේශිතයි: චතුරස්‍ර JPG හෝ PNG, අවම 400x400 pixels.', ta: 'பரிந்துரை: சதுர JPG அல்லது PNG, குறைந்தது 400x400 pixels.' },
  English: { si: 'ඉංග්‍රීසි', ta: 'ஆங்கிலம்' },
  Sinhala: { si: 'සිංහල', ta: 'சிங்களம்' },
  Tamil: { si: 'දෙමළ', ta: 'தமிழ்' },
  'Type your city or district in Sri Lanka': { si: 'ශ්‍රී ලංකාවේ ඔබේ නගරය හෝ දිස්ත්‍රික්කය ටයිප් කරන්න', ta: 'இலங்கையில் உங்கள் நகரம் அல்லது மாவட்டத்தை தட்டச்சு செய்யவும்' },
  'Tell us about your preferences...': { si: 'ඔබේ කැමැත්ත ගැන අපට කියන්න...', ta: 'உங்கள் விருப்பங்களைப் பற்றி சொல்லுங்கள்...' },
  Cancel: { si: 'අවලංගු කරන්න', ta: 'ரத்து செய்' },
  'Notification Preferences': { si: 'දැනුම්දීම් කැමැත්ත', ta: 'அறிவிப்பு விருப்பங்கள்' },
  'Change Password': { si: 'මුරපදය වෙනස් කරන්න', ta: 'கடவுச்சொல்லை மாற்று' },

  'Contact Support': { si: 'උදව් සඳහා සම්බන්ධ වන්න', ta: 'ஆதரவுடன் தொடர்பு கொள்ளுங்கள்' },
  Subject: { si: 'විෂය', ta: 'தலைப்பு' },
  Message: { si: 'පණිවිඩය', ta: 'செய்தி' },
  Attachments: { si: 'ඇමුණුම්', ta: 'இணைப்புகள்' },
  'Describe your issue in detail...': { si: 'ඔබගේ ගැටලුව විස්තරාත්මකව ලියන්න...', ta: 'உங்கள் பிரச்சினையை விரிவாக விவரிக்கவும்...' },
  'My Support Requests': { si: 'මගේ සහාය ඉල්ලීම්', ta: 'என் ஆதரவு கோரிக்கைகள்' },
  'Refresh requests': { si: 'ඉල්ලීම් නැවත පූරණය', ta: 'கோரிக்கைகளை புதுப்பி' },
  'Loading support requests...': { si: 'සහාය ඉල්ලීම් පූරණය වෙමින්...', ta: 'ஆதரவு கோரிக்கைகள் ஏற்றப்படுகிறது...' },
  'No support requests submitted yet.': { si: 'තවම සහාය ඉල්ලීම් යවා නැත.', ta: 'இன்னும் ஆதரவு கோரிக்கைகள் சமர்ப்பிக்கப்படவில்லை.' },
  'Submit Ticket': { si: 'ටිකට්පත යවන්න', ta: 'டிக்கெட்டை சமர்ப்பி' },
  'Frequently Asked Questions': { si: 'නිතර අසන ප්‍රශ්න', ta: 'அடிக்கடி கேட்கப்படும் கேள்விகள்' },
  'View All FAQ': { si: 'සියලු FAQ බලන්න', ta: 'அனைத்து FAQ-ஐ காண்க' },
  'Find answers or get support for your LankaServe account.': { si: 'ඔබගේ LankaServe ගිණුම සඳහා පිළිතුරු සොයන්න හෝ සහාය ලබාගන්න.', ta: 'உங்கள் LankaServe கணக்குக்கான பதில்களை கண்டறியவும் அல்லது ஆதரவு பெறவும்.' },
  'Search help articles...': { si: 'උදව් ලිපි සොයන්න...', ta: 'உதவி கட்டுரைகளை தேடுங்கள்...' },

  'Search conversations...': { si: 'සංවාද සොයන්න...', ta: 'உரையாடல்களை தேடுங்கள்...' },
  'No conversations yet.': { si: 'තවම සංවාද නැත.', ta: 'இன்னும் உரையாடல்கள் இல்லை.' },
  Today: { si: 'අද', ta: 'இன்று' },
  Send: { si: 'යවන්න', ta: 'அனுப்பு' },
  'Type a message...': { si: 'පණිවිඩයක් ටයිප් කරන්න...', ta: 'செய்தியை தட்டச்சு செய்யவும்...' },
  'Select a conversation to start messaging.': { si: 'පණිවිඩ යැවීම ආරම්භ කිරීමට සංවාදයක් තෝරන්න.', ta: 'செய்தி தொடங்க உரையாடலைத் தேர்ந்தெடுக்கவும்.' },
  Online: { si: 'සබැඳි', ta: 'ஆன்லைன்' },

  Electrical: { si: 'විදුලි', ta: 'மின்சாரம்' },
  Plumbing: { si: 'ජලනල', ta: 'குழாய் பணி' },
  Cleaning: { si: 'පිරිසිදු කිරීම', ta: 'சுத்தம்' },
  'AC Technician': { si: 'AC තාක්ෂණික', ta: 'AC தொழில்நுட்ப நிபுணர்' },
  Painting: { si: 'පින්තාරු කිරීම', ta: 'பெயிண்டிங்' },
  General: { si: 'සාමාන්‍ය', ta: 'பொது' },
  'AC Repair': { si: 'AC අලුත්වැඩියා', ta: 'AC பழுது' },
};

const reverseCopy: Record<string, string> = Object.entries(copy).reduce((acc, [english, translations]) => {
  acc[english] = english;
  acc[translations.si] = english;
  acc[translations.ta] = english;
  return acc;
}, {} as Record<string, string>);

function getInitialLanguage(): ProviderLanguageCode {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(providerLanguageStorageKey);
  return providerLanguageOptions.some((option) => option.code === stored) ? (stored as ProviderLanguageCode) : 'en';
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function translateCore(value: string, language: ProviderLanguageCode) {
  const normalized = normalizeText(value);
  if (!normalized) return value;
  const english = reverseCopy[normalized] || normalized;
  if (language === 'en') return english;
  return copy[english]?.[language] || english;
}

function translateValue(value: string, language: ProviderLanguageCode) {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return value;
  const [, leading, core, trailing] = match;
  return `${leading}${translateCore(core, language)}${trailing}`;
}

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest('[data-i18n-skip], script, style, textarea, input'));
}

function translateAttributes(root: HTMLElement, language: ProviderLanguageCode) {
  const attributes = ['placeholder', 'aria-label', 'title'] as const;
  attributes.forEach((attribute) => {
    root.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
      if (element.closest('[data-i18n-skip]')) return;
      const originalKey = `providerI18n${attribute.replace(/(^|-)(\w)/g, (_, __, letter) => letter.toUpperCase())}`;
      const dataset = element.dataset as Record<string, string | undefined>;
      const current = element.getAttribute(attribute) || '';
      if (!dataset[originalKey]) dataset[originalKey] = reverseCopy[normalizeText(current)] || current;
      const translated = translateValue(dataset[originalKey] || current, language);
      if (current !== translated) element.setAttribute(attribute, translated);
    });
  });
}

function translateDom(root: HTMLElement, language: ProviderLanguageCode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return normalizeText(node.textContent || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => {
    const nextValue = translateValue(node.textContent || '', language);
    if (node.textContent !== nextValue) node.textContent = nextValue;
  });
  translateAttributes(root, language);
}

export function ProviderLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<ProviderLanguageCode>(getInitialLanguage);

  const setLanguage = (nextLanguage: ProviderLanguageCode) => {
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    window.localStorage.setItem(providerLanguageStorageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-provider-i18n-root]');
    if (!root) return undefined;

    let frameId = 0;
    const applyTranslations = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => translateDom(root, language));
    };

    applyTranslations();
    const observer = new MutationObserver(applyTranslations);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title'],
    });

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo<ProviderI18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (text: string) => translateCore(text, language),
    }),
    [language],
  );

  return <ProviderI18nContext.Provider value={value}>{children}</ProviderI18nContext.Provider>;
}

export function useProviderI18n() {
  return useContext(ProviderI18nContext);
}

export function ProviderLanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useProviderI18n();

  return (
    <div className={`items-center gap-1 text-sm font-semibold ${className}`} data-i18n-skip>
      {providerLanguageOptions.map((option, index) => (
        <span className="flex items-center gap-1" key={option.code}>
          {index > 0 ? <span className="text-slate-300">|</span> : null}
          <button
            className={`rounded-md px-1.5 py-1 transition-colors ${
              language === option.code ? 'text-[#1E3A8A]' : 'text-slate-400 hover:text-[#2F4DA0]'
            }`}
            onClick={() => setLanguage(option.code)}
            type="button"
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
