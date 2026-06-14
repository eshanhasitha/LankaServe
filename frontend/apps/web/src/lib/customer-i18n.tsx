import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export const customerLanguageStorageKey = 'lankaserve.web.language';
export const customerLanguageOptions = [
  { code: 'en', label: 'EN' },
  { code: 'si', label: 'SI' },
  { code: 'ta', label: 'TA' },
] as const;

export type CustomerLanguageCode = (typeof customerLanguageOptions)[number]['code'];

type TranslationMap = Record<string, { si: string; ta: string }>;

type CustomerI18nContextValue = {
  language: CustomerLanguageCode;
  setLanguage: (language: CustomerLanguageCode) => void;
  t: (text: string) => string;
};

const noopContext: CustomerI18nContextValue = {
  language: 'en',
  setLanguage: () => undefined,
  t: (text) => text,
};

const CustomerI18nContext = createContext<CustomerI18nContextValue>(noopContext);

const copy: TranslationMap = {
  Dashboard: { si: 'උපකරණ පුවරුව', ta: 'டாஷ்போர்டு' },
  'Post Service': { si: 'සේවාවක් පළ කරන්න', ta: 'சேவையைப் பதிவிடு' },
  'Post a Service': { si: 'සේවාවක් පළ කරන්න', ta: 'சேவையைப் பதிவிடு' },
  'Post a Job': { si: 'රැකියාවක් පළ කරන්න', ta: 'வேலையைப் பதிவிடு' },
  'My Jobs': { si: 'මගේ රැකියා', ta: 'என் வேலைகள்' },
  'Search Providers': { si: 'සේවා සපයන්නන් සොයන්න', ta: 'சேவை வழங்குநர்களை தேடு' },
  'Find Providers': { si: 'සේවා සපයන්නන් සොයන්න', ta: 'சேவை வழங்குநர்களை தேடு' },
  Heatmap: { si: 'තාප සිතියම', ta: 'வெப்ப வரைபடம்' },
  Messages: { si: 'පණිවිඩ', ta: 'செய்திகள்' },
  Notifications: { si: 'දැනුම්දීම්', ta: 'அறிவிப்புகள்' },
  'Help Center': { si: 'උදව් මධ්‍යස්ථානය', ta: 'உதவி மையம்' },
  Settings: { si: 'සැකසුම්', ta: 'அமைப்புகள்' },
  Logout: { si: 'පිටවන්න', ta: 'வெளியேறு' },
  'Close navigation menu': { si: 'සංචාලන මෙනුව වසන්න', ta: 'வழிசெலுத்தல் மெனுவை மூடு' },
  'Open navigation menu': { si: 'සංචාලන මෙනුව විවෘත කරන්න', ta: 'வழிசெலுத்தல் மெனுவை திற' },
  'Open profile settings': { si: 'පැතිකඩ සැකසුම් විවෘත කරන්න', ta: 'சுயவிவர அமைப்புகளை திற' },
  'Search your jobs...': { si: 'ඔබේ රැකියා සොයන්න...', ta: 'உங்கள் வேலைகளை தேடுங்கள்...' },
  'Search settings...': { si: 'සැකසුම් සොයන්න...', ta: 'அமைப்புகளை தேடுங்கள்...' },
  'Enter Location': { si: 'ස්ථානය ඇතුළත් කරන්න', ta: 'இடத்தை உள்ளிடவும்' },
  'Search services, providers...': { si: 'සේවා, සපයන්නන් සොයන්න...', ta: 'சேவைகள், வழங்குநர்களை தேடுங்கள்...' },

  'Welcome Back,': { si: 'ආයුබෝවන්,', ta: 'மீண்டும் வரவேற்கிறோம்,' },
  'Track your ongoing and past service requests.': { si: 'ඔබගේ පවතින සහ පෙර සේවා ඉල්ලීම් අනුගමනය කරන්න.', ta: 'உங்கள் நடைபெறும் மற்றும் முந்தைய சேவை கோரிக்கைகளை கண்காணிக்கவும்.' },
  'Create a new request for any help you need.': { si: 'ඔබට අවශ්‍ය ඕනෑම උදව්වක් සඳහා නව ඉල්ලීමක් සාදන්න.', ta: 'உங்களுக்கு தேவையான எந்த உதவிக்கும் புதிய கோரிக்கையை உருவாக்கவும்.' },
  'Browse our directory of verified professionals.': { si: 'සත්‍යාපිත වෘත්තිකයන්ගේ ලැයිස්තුව බලන්න.', ta: 'சரிபார்க்கப்பட்ட நிபுணர்களின் பட்டியலைப் பாருங்கள்.' },
  'Active Jobs': { si: 'සක්‍රීය රැකියා', ta: 'செயலில் உள்ள வேலைகள்' },
  'View All': { si: 'සියල්ල බලන්න', ta: 'அனைத்தையும் காண்க' },
  'Provider Assigned': { si: 'සපයන්නා පවරා ඇත', ta: 'வழங்குநர் நியமிக்கப்பட்டார்' },
  'Awaiting Provider': { si: 'සපයන්නා බලාපොරොත්තුවෙන්', ta: 'வழங்குநரை காத்திருக்கிறது' },
  'View Details': { si: 'විස්තර බලන්න', ta: 'விவரங்களைப் பார்க்க' },
  'No active jobs yet.': { si: 'තවම සක්‍රීය රැකියා නැත.', ta: 'இன்னும் செயலில் உள்ள வேலைகள் இல்லை.' },
  'Suggested Providers': { si: 'යෝජිත සපයන්නන්', ta: 'பரிந்துரைக்கப்பட்ட வழங்குநர்கள்' },
  'Matched to categories from your job requests.': { si: 'ඔබගේ රැකියා ඉල්ලීම්වල වර්ගවලට ගැළපේ.', ta: 'உங்கள் வேலை கோரிக்கைகளின் வகைகளுடன் பொருந்துகிறது.' },
  Rating: { si: 'ඇගයීම', ta: 'மதிப்பீடு' },
  Location: { si: 'ස්ථානය', ta: 'இடம்' },
  Distance: { si: 'දුර', ta: 'தூரம்' },

  'Job Title': { si: 'රැකියා මාතෘකාව', ta: 'வேலை தலைப்பு' },
  'Service Category': { si: 'සේවා වර්ගය', ta: 'சேவை வகை' },
  Category: { si: 'වර්ගය', ta: 'வகை' },
  Description: { si: 'විස්තරය', ta: 'விளக்கம்' },
  'Estimated Budget (LKR)': { si: 'ඇස්තමේන්තු මුදල (LKR)', ta: 'மதிப்பிடப்பட்ட பட்ஜெட் (LKR)' },
  'Budget (LKR)': { si: 'මුදල (LKR)', ta: 'பட்ஜெட் (LKR)' },
  'Service Location': { si: 'සේවා ස්ථානය', ta: 'சேவை இடம்' },
  'Upload Images (Optional)': { si: 'පින්තූර උඩුගත කරන්න (අත්‍යවශ්‍ය නොවේ)', ta: 'படங்களை பதிவேற்று (விருப்பம்)' },
  'Click or drag images to upload': { si: 'උඩුගත කිරීමට පින්තූර ක්ලික් කරන්න හෝ ඇදගෙන එන්න', ta: 'படங்களை பதிவேற்ற கிளிக் செய்யவும் அல்லது இழுத்து விடவும்' },
  'Up to 5 images, max 5MB each': { si: 'පින්තූර 5ක් දක්වා, එකකට 5MB උපරිම', ta: '5 படங்கள் வரை, ஒவ்வொன்றும் அதிகபட்சம் 5MB' },
  Clear: { si: 'හිස් කරන්න', ta: 'அழி' },
  'Submit Request': { si: 'ඉල්ලීම යවන්න', ta: 'கோரிக்கையை சமர்ப்பி' },
  'Your request will be visible to nearby verified providers.': { si: 'ඔබේ ඉල්ලීම අසල සත්‍යාපිත සපයන්නන්ට පෙනේ.', ta: 'உங்கள் கோரிக்கை அருகிலுள்ள சரிபார்க்கப்பட்ட வழங்குநர்களுக்குக் காணப்படும்.' },
  'Select a category': { si: 'වර්ගයක් තෝරන්න', ta: 'ஒரு வகையைத் தேர்ந்தெடுக்கவும்' },
  Electrical: { si: 'විදුලි', ta: 'மின்சாரம்' },
  Plumbing: { si: 'ජලනල', ta: 'குழாய் பணி' },
  Cleaning: { si: 'පිරිසිදු කිරීම', ta: 'சுத்தம்' },
  'AC Technician': { si: 'AC තාක්ෂණික', ta: 'AC தொழில்நுட்ப நிபுணர்' },
  Painting: { si: 'පින්තාරු කිරීම', ta: 'பெயிண்டிங்' },
  General: { si: 'සාමාන්‍ය', ta: 'பொது' },
  'e.g., Fix leaking kitchen sink': { si: 'උදා., කාන්දු වන කුස්සියේ සිංක් එක අලුත්වැඩියා කිරීම', ta: 'எ.கா., கசிவான சமையலறை சிங்கை சரி செய்தல்' },
  'Describe the problem or requirement in detail...': { si: 'ගැටලුව හෝ අවශ්‍යතාවය විස්තරාත්මකව ලියන්න...', ta: 'பிரச்சினை அல்லது தேவையை விரிவாக விவரிக்கவும்...' },
  'Type a Sri Lankan city, town, or district': { si: 'ශ්‍රී ලංකාවේ නගරයක්, ගමක් හෝ දිස්ත්‍රික්කයක් ටයිප් කරන්න', ta: 'இலங்கையின் நகரம், ஊர் அல்லது மாவட்டத்தை தட்டச்சு செய்யவும்' },
  'Searching Sri Lanka locations...': { si: 'ශ්‍රී ලංකා ස්ථාන සොයමින්...', ta: 'இலங்கை இடங்களைத் தேடுகிறது...' },
  'Real Map Preview': { si: 'සැබෑ සිතියම් පෙරදසුන', ta: 'உண்மையான வரைபட முன்னோட்டம்' },
  'Search a Sri Lanka location or click on the map to drop the service pin.': { si: 'ශ්‍රී ලංකා ස්ථානයක් සොයන්න හෝ සේවා පින් එක තැබීමට සිතියම ක්ලික් කරන්න.', ta: 'இலங்கை இடத்தைத் தேடவும் அல்லது சேவை முள் வைக்க வரைபடத்தில் கிளிக் செய்யவும்.' },

  Accepted: { si: 'පිළිගත්', ta: 'ஏற்றுக்கொண்டது' },
  Ongoing: { si: 'ක්‍රියාත්මක', ta: 'நடைபெறுகிறது' },
  Completed: { si: 'සම්පූර්ණ', ta: 'முடிந்தது' },
  Cancelled: { si: 'අවලංගු', ta: 'ரத்து செய்யப்பட்டது' },
  Assigned: { si: 'පවරා ඇත', ta: 'நியமிக்கப்பட்டது' },
  Reviewing: { si: 'සමාලෝචනය කරමින්', ta: 'மதிப்பாய்வு செய்கிறது' },
  'Track and manage your active service requests.': { si: 'ඔබගේ සක්‍රීය සේවා ඉල්ලීම් අනුගමනය කර කළමනාකරණය කරන්න.', ta: 'உங்கள் செயலில் உள்ள சேவை கோரிக்கைகளை கண்காணித்து நிர்வகிக்கவும்.' },
  'No jobs found for this tab.': { si: 'මෙම ටැබය සඳහා රැකියා නැත.', ta: 'இந்த தாவலில் வேலைகள் இல்லை.' },
  'No jobs available in this tab.': { si: 'මෙම ටැබය තුළ රැකියා නැත.', ta: 'இந்த தாவலில் வேலைகள் இல்லை.' },
  User: { si: 'පරිශීලක', ta: 'பயனர்' },

  Filters: { si: 'පෙරහන්', ta: 'வடிப்பான்கள்' },
  'Refine provider results': { si: 'සපයන්නන්ගේ ප්‍රතිඵල සකසන්න', ta: 'வழங்குநர் முடிவுகளைச் சீரமைக்கவும்' },
  'All Categories': { si: 'සියලු වර්ග', ta: 'அனைத்து வகைகள்' },
  'Minimum Rating': { si: 'අවම ඇගයීම', ta: 'குறைந்தபட்ச மதிப்பீடு' },
  'Min Rating': { si: 'අවම ඇගයීම', ta: 'குறைந்தபட்ச மதிப்பீடு' },
  Experience: { si: 'අත්දැකීම්', ta: 'அனுபவம்' },
  'Quick Filters': { si: 'ඉක්මන් පෙරහන්', ta: 'விரைவு வடிப்பான்கள்' },
  'Available now': { si: 'දැන් ලබා ගත හැක', ta: 'இப்போது கிடைக்கும்' },
  'Available Now': { si: 'දැන් ලබා ගත හැක', ta: 'இப்போது கிடைக்கும்' },
  'Verified providers': { si: 'සත්‍යාපිත සපයන්නන්', ta: 'சரிபார்க்கப்பட்ட வழங்குநர்கள்' },
  'Top rated': { si: 'ඉහළ ඇගයීම්', ta: 'சிறந்த மதிப்பீடு' },
  'Apply Filters': { si: 'පෙරහන් යොදන්න', ta: 'வடிப்பான்களைப் பயன்படுத்து' },
  'Clear All': { si: 'සියල්ල හිස් කරන්න', ta: 'அனைத்தையும் அழி' },
  'Search providers by name or skill...': { si: 'නම හෝ කුසලතාව අනුව සපයන්නන් සොයන්න...', ta: 'பெயர் அல்லது திறமையால் வழங்குநர்களைத் தேடுங்கள்...' },
  'No providers match the selected filters.': { si: 'තෝරාගත් පෙරහන්වලට ගැළපෙන සපයන්නන් නැත.', ta: 'தேர்ந்தெடுத்த வடிப்பான்களுக்கு வழங்குநர்கள் பொருந்தவில்லை.' },
  'View Profile': { si: 'පැතිකඩ බලන්න', ta: 'சுயவிவரத்தைப் பார்க்க' },
  Contact: { si: 'සම්බන්ධ වන්න', ta: 'தொடர்பு கொள்ள' },

  'Service Heatmap': { si: 'සේවා තාප සිතියම', ta: 'சேவை வெப்ப வரைபடம்' },
  'Explore nearby providers and service coverage in your area.': { si: 'ඔබේ ප්‍රදේශයේ අසල සපයන්නන් සහ සේවා ආවරණය බලන්න.', ta: 'உங்கள் பகுதியில் அருகிலுள்ள வழங்குநர்கள் மற்றும் சேவை கவரேஜை ஆராயுங்கள்.' },
  'Filter the providers shown on the heatmap.': { si: 'තාප සිතියමේ පෙන්වන සපයන්නන් පෙරහන් කරන්න.', ta: 'வெப்ப வரைபடத்தில் காணப்படும் வழங்குநர்களை வடிகட்டவும்.' },
  'Provider locations are rendered from saved backend coordinates.': { si: 'සපයන්නන්ගේ ස්ථාන සුරැකි backend ඛණ්ඩාංකවලින් පෙන්වයි.', ta: 'வழங்குநர் இடங்கள் சேமிக்கப்பட்ட backend ஒருங்கிணைப்புகளிலிருந்து காட்டப்படுகின்றன.' },
  'Recommended Nearby': { si: 'අසල නිර්දේශිත', ta: 'அருகிலுள்ள பரிந்துரைகள்' },
  'Sorted by the current API result and active filters.': { si: 'වත්මන් API ප්‍රතිඵල සහ සක්‍රීය පෙරහන් අනුව අනුපිළිවෙලට ඇත.', ta: 'தற்போதைய API முடிவுகள் மற்றும் செயலில் உள்ள வடிப்பான்களால் வரிசைப்படுத்தப்பட்டது.' },
  'providers visible': { si: 'සපයන්නන් පෙනේ', ta: 'வழங்குநர்கள் தெரிகிறார்கள்' },

  'Job Details': { si: 'රැකියා විස්තර', ta: 'வேலை விவரங்கள்' },
  'Assigned Provider': { si: 'පවරා ඇති සපයන්නා', ta: 'நியமிக்கப்பட்ட வழங்குநர்' },
  'Job Progress': { si: 'රැකියා ප්‍රගතිය', ta: 'வேலை முன்னேற்றம்' },
  'Job Posted': { si: 'රැකියාව පළ කරන ලදී', ta: 'வேலை பதிவிடப்பட்டது' },
  'Job in Progress': { si: 'රැකියාව ක්‍රියාත්මකයි', ta: 'வேலை நடைபெறுகிறது' },
  'Job Completed': { si: 'රැකියාව සම්පූර්ණයි', ta: 'வேலை முடிந்தது' },
  'Awaiting confirmation': { si: 'තහවුරු කිරීම බලාපොරොත්තුවෙන්', ta: 'உறுதிப்படுத்தலை காத்திருக்கிறது' },
  'Provider is on site': { si: 'සපයන්නා ස්ථානයේ සිටී', ta: 'வழங்குநர் இடத்தில் உள்ளார்' },
  'QR Verification Required': { si: 'QR සත්‍යාපනය අවශ්‍යයි', ta: 'QR சரிபார்ப்பு தேவை' },
  'Scan QR to Confirm Arrival': { si: 'පැමිණීම තහවුරු කිරීමට QR ස්කෑන් කරන්න', ta: 'வருகையை உறுதிப்படுத்த QR ஸ்கேன் செய்யவும்' },
  'Confirm Job Completion': { si: 'රැකියාව සම්පූර්ණ බව තහවුරු කරන්න', ta: 'வேலை முடிந்ததை உறுதிசெய்' },
  'Total Quote': { si: 'මුළු මිල ගණන්', ta: 'மொத்த மதிப்பு' },
  'Estimated Duration': { si: 'ඇස්තමේන්තු කාලය', ta: 'மதிப்பிடப்பட்ட காலம்' },
  Urgency: { si: 'හදිසි බව', ta: 'அவசரம்' },
  Address: { si: 'ලිපිනය', ta: 'முகவரி' },
  'Provider Status': { si: 'සපයන්නාගේ තත්ත්වය', ta: 'வழங்குநர் நிலை' },
  'Your Confirmation': { si: 'ඔබගේ තහවුරු කිරීම', ta: 'உங்கள் உறுதிப்படுத்தல்' },
  'Payment Summary': { si: 'ගෙවීම් සාරාංශය', ta: 'கட்டண சுருக்கம்' },
  'Labor Cost': { si: 'කම්කරු වියදම', ta: 'தொழிலாளர் செலவு' },
  'Materials (Est.)': { si: 'ද්‍රව්‍ය (ඇස්.)', ta: 'பொருட்கள் (மதி.)' },
  'Service Fee': { si: 'සේවා ගාස්තුව', ta: 'சேவை கட்டணம்' },
  'Total Amount': { si: 'මුළු මුදල', ta: 'மொத்த தொகை' },
  'Scan Provider QR': { si: 'සපයන්නාගේ QR ස්කෑන් කරන්න', ta: 'வழங்குநர் QR ஐ ஸ்கேன் செய்யவும்' },
  'Point the camera at the provider\'s QR code to confirm arrival.': { si: 'පැමිණීම තහවුරු කිරීමට කැමරාව සපයන්නාගේ QR කේතයට යොමු කරන්න.', ta: 'வருகையை உறுதிப்படுத்த கேமராவை வழங்குநரின் QR குறியீட்டில் நோக்கவும்.' },
  'Paste QR token manually': { si: 'QR token එක අතින් අලවන්න', ta: 'QR token ஐ கைமுறையாக ஒட்டவும்' },
  'Paste provider QR token': { si: 'සපයන්නාගේ QR token එක අලවන්න', ta: 'வழங்குநர் QR token ஐ ஒட்டவும்' },
  'Arrival Confirmed': { si: 'පැමිණීම තහවුරුයි', ta: 'வருகை உறுதி செய்யப்பட்டது' },
  'Arrival verification complete': { si: 'පැමිණීමේ සත්‍යාපනය සම්පූර්ණයි', ta: 'வருகை சரிபார்ப்பு முடிந்தது' },
  'Scan provider QR to confirm arrival': { si: 'පැමිණීම තහවුරු කිරීමට සපයන්නාගේ QR ස්කෑන් කරන්න', ta: 'வருகையை உறுதிப்படுத்த வழங்குநர் QR ஐ ஸ்கேன் செய்யவும்' },
  'Your Rating': { si: 'ඔබගේ ඇගයීම', ta: 'உங்கள் மதிப்பீடு' },
  'Write a short review about the provider\'s work quality, communication, and punctuality.': { si: 'සපයන්නාගේ වැඩ තත්ත්වය, සන්නිවේදනය සහ කාලපාලනය ගැන කෙටි විචාරයක් ලියන්න.', ta: 'வழங்குநரின் வேலை தரம், தொடர்பு மற்றும் நேர்த்தி குறித்து சுருக்கமான மதிப்புரை எழுதவும்.' },
  'Your review has been submitted.': { si: 'ඔබගේ විචාරය යවා ඇත.', ta: 'உங்கள் மதிப்புரை சமர்ப்பிக்கப்பட்டது.' },

  'Provider Profile': { si: 'සපයන්නාගේ පැතිකඩ', ta: 'வழங்குநர் சுயவிவரம்' },
  About: { si: 'ගැන', ta: 'பற்றி' },
  'Customer Reviews': { si: 'පාරිභෝගික විචාර', ta: 'வாடிக்கையாளர் மதிப்புரைகள்' },
  'Rating Breakdown': { si: 'ඇගයීම් විස්තරය', ta: 'மதிப்பீட்டு பிரிவு' },
  Availability: { si: 'ලබාගත හැකියාව', ta: 'கிடைக்கும் நிலை' },
  Status: { si: 'තත්ත්වය', ta: 'நிலை' },
  'Quick Actions': { si: 'ඉක්මන් ක්‍රියා', ta: 'விரைவு செயல்கள்' },
  Share: { si: 'බෙදාගන්න', ta: 'பகிர்' },
  Report: { si: 'වාර්තා කරන්න', ta: 'புகார்' },
  'Completed Jobs': { si: 'සම්පූර්ණ කළ රැකියා', ta: 'முடித்த வேலைகள்' },
  'Avg Rating': { si: 'සාමාන්‍ය ඇගයීම', ta: 'சராசரி மதிப்பீடு' },
  'Response Time': { si: 'ප්‍රතිචාර කාලය', ta: 'பதில் நேரம்' },

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
  'How to Post a Service': { si: 'සේවාවක් පළ කරන ආකාරය', ta: 'சேவையை எவ்வாறு பதிவிடுவது' },
  'Step-by-step guide to list your skills and start earning.': { si: 'ඔබේ කුසලතා ලැයිස්තුගත කර ආදායම් ආරම්භ කිරීමට පියවරෙන් පියවර මාර්ගෝපදේශය.', ta: 'உங்கள் திறன்களை பட்டியலிட்டு வருமானம் தொடங்க படிப்படியான வழிகாட்டி.' },
  'Account & Security': { si: 'ගිණුම සහ ආරක්ෂාව', ta: 'கணக்கு மற்றும் பாதுகாப்பு' },
  'Secure your profile and manage login preferences.': { si: 'ඔබේ පැතිකඩ ආරක්ෂා කර පිවිසුම් කැමැත්ත කළමනාකරණය කරන්න.', ta: 'உங்கள் சுயவிவரத்தை பாதுகாத்து உள்நுழைவு விருப்பங்களை நிர்வகிக்கவும்.' },
  'Trust & Verification': { si: 'විශ්වාසය සහ සත්‍යාපනය', ta: 'நம்பிக்கை மற்றும் சரிபார்ப்பு' },
  'Everything you need to know about getting verified.': { si: 'සත්‍යාපිත වීම ගැන ඔබ දැනගත යුතු සියල්ල.', ta: 'சரிபார்க்கப்படுவது குறித்து நீங்கள் அறிய வேண்டிய அனைத்தும்.' },
  'How does job verification work?': { si: 'රැකියා සත්‍යාපනය ක්‍රියා කරන්නේ කෙසේද?', ta: 'வேலை சரிபார்ப்பு எப்படி செயல்படுகிறது?' },
  'The provider scans your QR code on site, which confirms identity and starts the secure job session.': { si: 'සපයන්නා ස්ථානයේදී ඔබේ QR කේතය ස්කෑන් කරයි. එමගින් හැඳුනුම්පත තහවුරු වී ආරක්ෂිත රැකියා සැසිය ආරම්භ වේ.', ta: 'வழங்குநர் இடத்தில் உங்கள் QR குறியீட்டை ஸ்கேன் செய்கிறார். அது அடையாளத்தை உறுதிசெய்து பாதுகாப்பான வேலை அமர்வை தொடங்குகிறது.' },
  'When is payment released to providers?': { si: 'සපයන්නන්ට ගෙවීම නිකුත් කරන්නේ කවදාද?', ta: 'வழங்குநர்களுக்கு கட்டணம் எப்போது விடுவிக்கப்படுகிறது?' },
  'Payment is released only after both customer and provider confirm the job is completed.': { si: 'පාරිභෝගිකයා සහ සපයන්නා දෙදෙනාම රැකියාව සම්පූර්ණ බව තහවුරු කළ පසු පමණක් ගෙවීම නිකුත් වේ.', ta: 'வாடிக்கையாளர் மற்றும் வழங்குநர் இருவரும் வேலை முடிந்ததை உறுதிசெய்த பிறகே கட்டணம் விடுவிக்கப்படும்.' },
  'What should I do if a dispute arises?': { si: 'විවාදයක් ඇති වුවහොත් මම කළ යුත්තේ කුමක්ද?', ta: 'தகராறு ஏற்பட்டால் நான் என்ன செய்ய வேண்டும்?' },
  'Open a support ticket with job details and evidence. Our support team reviews and resolves disputes.': { si: 'රැකියා විස්තර සහ සාක්ෂි සමඟ සහාය ටිකට්පතක් විවෘත කරන්න. අපගේ සහාය කණ්ඩායම විවාද සමාලෝචනය කර විසඳයි.', ta: 'வேலை விவரங்கள் மற்றும் ஆதாரங்களுடன் ஆதரவு டிக்கெட்டைத் திறக்கவும். எங்கள் ஆதரவு குழு தகராறுகளை பரிசீலித்து தீர்க்கும்.' },
  'Can I cancel a service request after booking?': { si: 'වෙන් කිරීමෙන් පසු සේවා ඉල්ලීම අවලංගු කළ හැකිද?', ta: 'முன்பதிவுக்குப் பிறகு சேவை கோரிக்கையை ரத்து செய்ய முடியுமா?' },
  'Yes. Cancellation is possible based on job status and cancellation policy shown in your job details.': { si: 'ඔව්. ඔබගේ රැකියා විස්තරවල පෙන්වන රැකියා තත්ත්වය සහ අවලංගු කිරීමේ ප්‍රතිපත්තිය අනුව අවලංගු කළ හැක.', ta: 'ஆம். உங்கள் வேலை விவரங்களில் காட்டப்படும் வேலை நிலை மற்றும் ரத்து கொள்கையின் அடிப்படையில் ரத்து செய்ய முடியும்.' },

  'Search conversations...': { si: 'සංවාද සොයන්න...', ta: 'உரையாடல்களை தேடுங்கள்...' },
  'No conversations yet.': { si: 'තවම සංවාද නැත.', ta: 'இன்னும் உரையாடல்கள் இல்லை.' },
  Today: { si: 'අද', ta: 'இன்று' },
  Send: { si: 'යවන්න', ta: 'அனுப்பு' },
  'Type a message...': { si: 'පණිවිඩයක් ටයිප් කරන්න...', ta: 'செய்தியை தட்டச்சு செய்யவும்...' },
  'Select a conversation to start messaging.': { si: 'පණිවිඩ යැවීම ආරම්භ කිරීමට සංවාදයක් තෝරන්න.', ta: 'செய்தி தொடங்க உரையாடலைத் தேர்ந்தெடுக்கவும்.' },

  'Stay updated with your latest activities and job updates.': { si: 'ඔබගේ නවතම ක්‍රියාකාරකම් සහ රැකියා යාවත්කාලීන ගැන දැනුවත් වන්න.', ta: 'உங்கள் சமீபத்திய செயல்பாடுகள் மற்றும் வேலை புதுப்பிப்புகளை அறியுங்கள்.' },
  'No notifications available.': { si: 'දැනුම්දීම් නොමැත.', ta: 'அறிவிப்புகள் இல்லை.' },

  'Account Settings': { si: 'ගිණුම් සැකසුම්', ta: 'கணக்கு அமைப்புகள்' },
  'Manage your account preferences and security settings.': { si: 'ඔබගේ ගිණුම් කැමැත්ත සහ ආරක්ෂක සැකසුම් කළමනාකරණය කරන්න.', ta: 'உங்கள் கணக்கு விருப்பங்கள் மற்றும் பாதுகாப்பு அமைப்புகளை நிர்வகிக்கவும்.' },
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
  'View Job': { si: 'රැකියාව බලන්න', ta: 'வேலையைப் பார்க்க' },
  Customer: { si: 'පාරිභෝගිකයා', ta: 'வாடிக்கையாளர்' },
  Budget: { si: 'අයවැය', ta: 'பட்ஜெட்' },
  Available: { si: 'ලබා ගත හැක', ta: 'கிடைக்கும்' },
  Unavailable: { si: 'ලබා ගත නොහැක', ta: 'கிடைக்கவில்லை' },
  Verification: { si: 'සත්‍යාපනය', ta: 'சரிபார்ப்பு' },
  Pending: { si: 'බලාපොරොත්තුවෙන්', ta: 'நிலுவையில்' },
  'Based on customer reviews': { si: 'පාරිභෝගික සමාලෝචන මත පදනම්ව', ta: 'வாடிக்கையாளர் மதிப்புரைகளின் அடிப்படையில்' },
};

const reverseCopy: Record<string, string> = Object.entries(copy).reduce((acc, [english, translations]) => {
  acc[english] = english;
  acc[translations.si] = english;
  acc[translations.ta] = english;
  return acc;
}, {} as Record<string, string>);

function getInitialLanguage(): CustomerLanguageCode {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(customerLanguageStorageKey);
  return customerLanguageOptions.some((option) => option.code === stored) ? (stored as CustomerLanguageCode) : 'en';
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function translateCore(value: string, language: CustomerLanguageCode) {
  const normalized = normalizeText(value);
  if (!normalized) return value;
  const english = reverseCopy[normalized] || normalized;
  if (language === 'en') return english;
  return copy[english]?.[language] || english;
}

function translateValue(value: string, language: CustomerLanguageCode) {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return value;
  const [, leading, core, trailing] = match;
  const translated = translateCore(core, language);
  return `${leading}${translated}${trailing}`;
}

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest('[data-i18n-skip], script, style, textarea, input'));
}

function translateAttributes(root: HTMLElement, language: CustomerLanguageCode) {
  const attributes = ['placeholder', 'aria-label', 'title'] as const;
  attributes.forEach((attribute) => {
    root.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
      if (element.closest('[data-i18n-skip]')) return;
      const originalKey = `customerI18n${attribute.replace(/(^|-)(\w)/g, (_, __, letter) => letter.toUpperCase())}`;
      const dataset = element.dataset as Record<string, string | undefined>;
      const current = element.getAttribute(attribute) || '';
      if (!dataset[originalKey]) dataset[originalKey] = reverseCopy[normalizeText(current)] || current;
      const translated = translateValue(dataset[originalKey] || current, language);
      if (current !== translated) element.setAttribute(attribute, translated);
    });
  });
}

function translateDom(root: HTMLElement, language: CustomerLanguageCode) {
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

export function CustomerLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<CustomerLanguageCode>(getInitialLanguage);

  const setLanguage = (nextLanguage: CustomerLanguageCode) => {
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    window.localStorage.setItem(customerLanguageStorageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-customer-i18n-root]');
    if (!root) return undefined;

    let frameId = 0;
    const applyTranslations = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => translateDom(root, language));
    };

    applyTranslations();
    const observer = new MutationObserver(applyTranslations);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo<CustomerI18nContextValue>(() => ({
    language,
    setLanguage,
    t: (text: string) => translateCore(text, language),
  }), [language]);

  return <CustomerI18nContext.Provider value={value}>{children}</CustomerI18nContext.Provider>;
}

export function useCustomerI18n() {
  return useContext(CustomerI18nContext);
}

export function CustomerLanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useCustomerI18n();

  return (
    <div className={`items-center gap-1 text-sm font-semibold ${className}`} data-i18n-skip>
      {customerLanguageOptions.map((option, index) => (
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
