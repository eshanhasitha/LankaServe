export const languageStorageKey = 'lankaserve.web.language';

export const languageOptions = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'si', label: 'SI', name: 'සිංහල' },
  { code: 'ta', label: 'TA', name: 'தமிழ்' },
] as const;

export type LanguageCode = (typeof languageOptions)[number]['code'];

export const categoryImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA76zUe3a81JWsAC1YMQ24ri1CWEHXxcR9lL3ZXRrWn3SazJJA4LgbOQSPptwlGU9D8HTMGOfF8WKMQzRzDf7Mp3eR-rILqFOPs4z6buJC7G4mptHB_NxDO4EnMXQIL3yZBd5AhHop4YguvSNUJefgOWLflxqRjXypbP5PVA8_80VBYu8Z0yOzxX7klZupfPPfjyDJGMRHqJxiDiXJyMCn5sdaBp0dkpqlTLB8bGnFuHpumesBTFSPmlBryLEyJUpmdIJ5boV-3UUoG',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAOB0JvtM3r9ypYyeZtVHtIRtK3Y5OzkjfBp6VWDlS5FumstT2Uunsg4XN9DXHs32OuF1-dkcnd7rSN7umhEGAvH7_g5OvKUkbtcUqnku2a0ahkQZwN_HLDoXdRLvUAt6A0da0gaf2kgz3pJndPnCHyl24FoPXNjVgphjAXD9e8bLqs91pqnqM2fK-nD9eBLA26DFFUUcZIbPJb2S2aJW_aMppveq0jkAjV4viki_tQGHt8UdS2bYovmeziFW0e-_i0KVH7AM2uOMa7',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAdnZ2kR0cc5090psm9UXA_nTa5nPFgGDS76ijdNuS2UU7wkDL60vVyRLEBnCziEvazzkQh_ZzaLuhhzFQ5sIUlQN4fnwKNj6hcX1RI0SqEAs2lZi3Ii84NcYCbOA-RqBcf_VMVVv_kiVlwlr1uv4ZCLqEXazmin3wJ8lextPYSKIZqGS5tKf8_vmCMboCF9UW-ekuN9VuGrsQm8-svIH5GoQ9V9DsClamwRIKNBonzhe_eKB1ttfU_tZJ97fSqSo60X5YqEdl2QAsA',
];

export const stepIcons = ['edit_note', 'groups', 'qr_code_scanner'];

export const testimonialImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD9QzE0Jvak75QWGfXm-lBbpe_FwiY3cxb8EfbeVRx-B-kdyuQA2RV0uHv3pSiAVtiBLj_vHdtVe5BQTfw3g_E3adzrVhTm_YvevOV7anhUI4vTCzkp6hTX1NP9gCTwvFXVGg75W_B6v6l7km_ZvSBY-Lfi62sxa5T5SCyqL7ltadQFAgdEBFbpP5wwdOq0C76DH8Rcst_zsrEbPyeKci6CJHVNPi7X1-WK2p5gFDfHNPU9miLSU_GUlFMELnvF_r7uRpPfQne0Xx1b',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD4x-p5N2ThHKeOHAvHUFlH4Mu6prsGBoLPhqhdbF5piZ3E6E5UVyqrh3KlkTTJ58QjJbhTGCzJYYbcAinzYVJzaLLP_A3XPsDrbt64ciEJw4YJGf92Un15twgu87ekpudrc6JUE1CQ27KoZG48UxM-QJB50RxriLbDerNSL1uB1-Ozvr5IH6GANYIroW_ABFzmziQ96PRU9HT4Ie68IETU0lWkAiK_WgjOjbbahysvqo9NBscN4TW77Ne_DAMOw_3JQG0egr-nOSYW',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH0G_hzyTN9TJw3rvZRjyHeZXzRx0d4IhseccNIiTqQ3Tkmk63Fu1J1AWnO4u4UaU_D0YglaTDwJDUyw0juJypGVAZ6pm3BzrNSp1p3bZikqwvllMvJGb6Ie1QWY4G-kRFkCYJKWWsr3ktdidH3yZQOYP_BBaf4HoDM4gLnwlVxdVLFAZR7nOX_asMPP9KYI4fHLUHhMp9NhDTcriMvVzj92_6MO6tflfGwI1FUPYeCL-J1RexNvse9SJggOOi5VACNsjaSw6XbYm',
];

export const testimonialReviews = [
  { quote: 'The QR verification gave me peace of mind as a solo resident. The electrician was punctual and professional. Best service in Colombo!', name: 'Anura Perera', city: 'Colombo 07' },
  { quote: 'LankaServe is a game-changer. I found a plumber in 10 minutes for an emergency leak on a Sunday. Highly recommended for busy professionals.', name: 'Lakshani Silva', city: 'Kandy City' },
  { quote: 'I love the dual confirmation feature. It ensures that the work is completed to my standards before I pay. Fair and transparent.', name: 'Damith Jayawardena', city: 'Galle Fort' },
];

const en = {
  nav: { home: 'Home', services: 'Services', howItWorks: 'How It Works', about: 'About', login: 'Login', signUp: 'Sign Up' },
  hero: {
    titleStart: 'Find Trusted',
    titleAccent: 'Skilled Service',
    titleEnd: 'Providers Near You',
    summary: 'The most reliable platform in Sri Lanka to connect with verified electricians, plumbers, and more. Quality service, guaranteed security.',
    search: 'What service do you need?',
    findServices: 'Find Services',
    becomeProvider: 'Become a Provider',
    verifiedCount: 'Verified Professional Providers',
  },
  categories: {
    title: 'Popular Categories',
    viewMore: 'View more',
    items: [
      { title: 'Electrician', description: 'Expert wiring, repairs, and installations for residential and commercial properties.' },
      { title: 'Plumber', description: 'Fix leaks, install fixtures, and maintain water systems with certified experts.' },
      { title: 'Carpenter', description: 'Custom furniture, repairs, and woodwork solutions for your home or office.' },
    ],
  },
  how: {
    title: 'How LankaServe Works',
    steps: [
      { title: 'Post a Request', description: 'Describe the task you need help with and set your budget. It only takes a minute.' },
      { title: 'Connect with Providers', description: 'Review quotes from verified local experts. Check their ratings and pick the best match.' },
      { title: 'Secure QR Verification', description: "Ensure security with on-site QR scanning to confirm the provider's identity and job start." },
    ],
  },
  qr: {
    badge: 'Secure On-Site Validation',
    title: 'Advanced QR-Based Verification System',
    summary: "Safety is our top priority. Our unique QR system ensures that the person walking into your home is exactly who they claim to be. Scan the provider's app upon arrival to unlock job details and secure the session.",
    checks: ['Identity verification in seconds', 'Encrypted data transmission', 'Real-time location tracking for emergency help'],
  },
  approval: {
    badge: 'Dual Approval System',
    title: "No Payment Released Until You're Happy",
    summary: 'Our dual-confirmation system protects both the customer and the service provider. Once the task is done, both parties must confirm completion on their respective apps before the funds are released.',
    learn: 'Learn about our Guarantee',
    customer: 'Customer',
    provider: 'Provider',
    confirmed: 'Confirmed',
    released: 'Payment Released',
  },
  testimonials: {
    title: 'What Our Customers Say',
    subtitle: 'Trusted by thousands of families across Sri Lanka.',
    items: [
      { quote: 'The QR verification gave me peace of mind as a solo resident. The electrician was punctual and professional. Best service in Colombo!', name: 'Anura Perera', city: 'Colombo 07' },
      { quote: 'LankaServe is a game-changer. I found a plumber in 10 minutes for an emergency leak on a Sunday. Highly recommended for busy professionals.', name: 'Lakshani Silva', city: 'Kandy City' },
      { quote: 'I love the dual confirmation feature. It ensures that the work is completed to my standards before I pay. Fair and transparent.', name: 'Damith Jayawardena', city: 'Galle Fort' },
    ],
  },
  footer: {
    description: 'Connecting skilled Sri Lankan professionals with customers who value quality and security. Your trusted partner for every household task.',
    quickLinks: 'Quick Links',
    support: 'Support',
    contact: 'Contact',
    links: ['Find a Pro', 'Become a Pro', 'How it works', 'Service areas'],
    supportLinks: ['Help Center', 'Safety Guide', 'Contact Us', 'Terms of Use'],
    github: 'GitHub',
    whatsapp: 'WhatsApp',
    copyright: '© 2024 LankaServe. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    cookies: 'Cookies Settings',
  },
};

export const landingCopy = {
  en,
  si: {
    nav: { home: 'මුල් පිටුව', services: 'සේවා', howItWorks: 'ක්‍රියා කරන ආකාරය', about: 'අප ගැන', login: 'පිවිසෙන්න', signUp: 'ලියාපදිංචි වන්න' },
    hero: {
      titleStart: 'ඔබ ළඟම',
      titleAccent: 'විශ්වාසදායක සේවා',
      titleEnd: 'සපයන්නන් සොයා ගන්න',
      summary: 'සහතික කළ විදුලි කාර්මිකයන්, ජලනළ කාර්මිකයන් සහ තවත් සේවා සපයන්නන් සමඟ සම්බන්ධ වීමට ශ්‍රී ලංකාවේ විශ්වාසදායකම වේදිකාව. ගුණාත්මක සේවාව සහ ආරක්ෂාව සහතිකයි.',
      search: 'ඔබට අවශ්‍ය සේවාව කුමක්ද?',
      findServices: 'සේවා සොයන්න',
      becomeProvider: 'සේවා සපයන්නෙකු වන්න',
      verifiedCount: 'සහතික කළ වෘත්තීය සේවා සපයන්නන්',
    },
    categories: {
      title: 'ජනප්‍රිය කාණ්ඩ',
      viewMore: 'තව බලන්න',
      items: [
        { title: 'විදුලි කාර්මික', description: 'නිවාස සහ ව්‍යාපාරික ස්ථාන සඳහා වයරින්, අලුත්වැඩියා සහ ස්ථාපන සේවා.' },
        { title: 'ජලනළ කාර්මික', description: 'කාන්දුවීම්, උපාංග ස්ථාපනය සහ ජල පද්ධති නඩත්තුව සඳහා සහතික කළ විශේෂඥයින්.' },
        { title: 'වඩු කාර්මික', description: 'නිවසට හෝ කාර්යාලයට ගැලපෙන ගෘහ භාණ්ඩ, අලුත්වැඩියා සහ ලී වැඩ විසඳුම්.' },
      ],
    },
    how: {
      title: 'LankaServe ක්‍රියා කරන ආකාරය',
      steps: [
        { title: 'ඉල්ලීමක් පළ කරන්න', description: 'ඔබට අවශ්‍ය කාර්යය විස්තර කර අයවැය සඳහන් කරන්න. මිනිත්තුවකින් කළ හැක.' },
        { title: 'සේවා සපයන්නන් සමඟ සම්බන්ධ වන්න', description: 'සහතික කළ දේශීය විශේෂඥයින්ගේ මිල ගණන්, ශ්‍රේණිගත කිරීම් සහ පැතිකඩ බලන්න.' },
        { title: 'ආරක්ෂිත QR සත්‍යාපනය', description: 'සේවා සපයන්නාගේ අනන්‍යතාවය සහ වැඩ ආරම්භය තහවුරු කිරීමට ස්ථානයේදීම QR ස්කෑන් කරන්න.' },
      ],
    },
    qr: {
      badge: 'ආරක්ෂිත ස්ථානීය තහවුරු කිරීම',
      title: 'උසස් QR සත්‍යාපන පද්ධතිය',
      summary: 'ඔබගේ ආරක්ෂාව අපගේ ප්‍රමුඛතාවයි. අපගේ QR පද්ධතිය ඔබගේ නිවසට පැමිණෙන පුද්ගලයා සැබෑ සේවා සපයන්නාද යන්න තහවුරු කරයි.',
      checks: ['තත්පර කිහිපයකින් අනන්‍යතාවය තහවුරු කිරීම', 'සංකේතනය කළ දත්ත හුවමාරුව', 'හදිසි අවශ්‍යතාවලට සජීවී ස්ථාන තොරතුරු'],
    },
    approval: {
      badge: 'දෙපාර්ශව තහවුරු කිරීම',
      title: 'ඔබ සතුටු වන තුරු ගෙවීම නිදහස් නොවේ',
      summary: 'කාර්යය අවසන් වූ පසු ගෙවීම නිදහස් වීමට පාරිභෝගිකයා සහ සේවා සපයන්නා දෙදෙනාම තම යෙදුම්වලින් සම්පූර්ණ කිරීම තහවුරු කළ යුතුය.',
      learn: 'අපගේ සහතිකය ගැන ඉගෙන ගන්න',
      customer: 'පාරිභෝගිකයා',
      provider: 'සේවා සපයන්නා',
      confirmed: 'තහවුරුයි',
      released: 'ගෙවීම නිදහස් කළා',
    },
    testimonials: {
      title: 'අපගේ පාරිභෝගික අදහස්',
      subtitle: 'ශ්‍රී ලංකාව පුරා පවුල් දහස් ගණනක් විශ්වාස කරන සේවාව.',
      items: [
        { quote: 'QR තහවුරු කිරීම නිසා මට විශාල විශ්වාසයක් ලැබුණා. විදුලි කාර්මිකයා වෙලාවට පැමිණ වෘත්තීය ලෙස වැඩ කළා.', name: 'අනුර පෙරේරා', city: 'කොළඹ 07' },
        { quote: 'ඉරිදා හදිසි කාන්දුවකට මිනිත්තු 10කින් ජලනළ කාර්මිකයෙක් හමුවුණා. LankaServe ඉතා ප්‍රයෝජනවත්.', name: 'ලක්ෂානි සිල්වා', city: 'මහනුවර' },
        { quote: 'දෙපාර්ශව තහවුරු කිරීම මට ඉතා ප්‍රයෝජනවත්. වැඩේ හොඳින් අවසන් වූ පසු පමණක් ගෙවීම යනවා.', name: 'දමිත් ජයවර්ධන', city: 'ගාල්ල' },
      ],
    },
    footer: {
      description: 'ගුණාත්මකභාවය සහ ආරක්ෂාව අගය කරන පාරිභෝගිකයින් සමඟ ශ්‍රී ලාංකීය දක්ෂ වෘත්තීයවේදීන් සම්බන්ධ කරන ඔබගේ විශ්වාසදායක වේදිකාව.',
      quickLinks: 'ඉක්මන් සබැඳි',
      support: 'සහාය',
      contact: 'සම්බන්ධ වන්න',
      links: ['වෘත්තීයයෙකු සොයන්න', 'වෘත්තීයයෙකු වන්න', 'ක්‍රියා කරන ආකාරය', 'සේවා ප්‍රදේශ'],
      supportLinks: ['උදව් මධ්‍යස්ථානය', 'ආරක්ෂක මාර්ගෝපදේශය', 'අප අමතන්න', 'භාවිත නියම'],
      github: 'GitHub',
      whatsapp: 'WhatsApp',
      copyright: '© 2024 LankaServe. සියලු හිමිකම් ඇවිරිණි.',
      privacy: 'පෞද්ගලිකත්ව ප්‍රතිපත්තිය',
      terms: 'සේවා නියම',
      cookies: 'කුකී සැකසුම්',
    },
  },
  ta: {
    nav: { home: 'முகப்பு', services: 'சேவைகள்', howItWorks: 'எப்படி செயல்படும்', about: 'பற்றி', login: 'உள்நுழை', signUp: 'பதிவு' },
    hero: {
      titleStart: 'உங்கள் அருகிலுள்ள',
      titleAccent: 'நம்பகமான சேவை',
      titleEnd: 'வழங்குநர்களைக் கண்டறியுங்கள்',
      summary: 'சான்றளிக்கப்பட்ட மின்சார நிபுணர்கள், பிளம்பர்கள் மற்றும் பலரை தொடர்பு கொள்ள இலங்கையின் நம்பகமான தளம். தரமான சேவை மற்றும் உறுதியான பாதுகாப்பு.',
      search: 'உங்களுக்கு எந்த சேவை தேவை?',
      findServices: 'சேவைகள் தேடு',
      becomeProvider: 'சேவை வழங்குநராகுங்கள்',
      verifiedCount: 'சான்றளிக்கப்பட்ட தொழில்முறை சேவை வழங்குநர்கள்',
    },
    categories: {
      title: 'பிரபலமான வகைகள்',
      viewMore: 'மேலும் பார்க்க',
      items: [
        { title: 'மின்சார நிபுணர்', description: 'வீடு மற்றும் வணிக இடங்களுக்கு வயரிங், பழுது நீக்கம் மற்றும் நிறுவல் சேவைகள்.' },
        { title: 'பிளம்பர்', description: 'கசிவு சரிசெய்தல், பொருத்துதல் நிறுவல் மற்றும் நீர் அமைப்பு பராமரிப்பு.' },
        { title: 'தச்சர்', description: 'உங்கள் வீடு அல்லது அலுவலகத்திற்கான தனிப்பயன் மரச்சாமான்கள், பழுது மற்றும் மரப்பணி தீர்வுகள்.' },
      ],
    },
    how: {
      title: 'LankaServe எப்படி செயல்படும்',
      steps: [
        { title: 'கோரிக்கை இடுங்கள்', description: 'தேவையான பணியை விவரித்து உங்கள் பட்ஜெட்டை அமைக்கவும். ஒரு நிமிடமே போதும்.' },
        { title: 'சேவை வழங்குநர்களுடன் இணைக', description: 'சான்றளிக்கப்பட்ட உள்ளூர் நிபுணர்களின் மதிப்பீடுகள், கட்டணங்கள் மற்றும் சுயவிவரங்களைப் பார்க்கவும்.' },
        { title: 'பாதுகாப்பான QR சரிபார்ப்பு', description: 'வழங்குநரின் அடையாளத்தையும் பணி தொடக்கத்தையும் உறுதிப்படுத்த இடத்திலேயே QR ஸ்கேன் செய்யுங்கள்.' },
      ],
    },
    qr: {
      badge: 'பாதுகாப்பான இடத்திலேயே சரிபார்ப்பு',
      title: 'மேம்பட்ட QR சரிபார்ப்பு அமைப்பு',
      summary: 'உங்கள் பாதுகாப்பே எங்கள் முதன்மை. உங்கள் வீட்டுக்கு வருபவர் உண்மையான சேவை வழங்குநரே என்பதை எங்கள் QR அமைப்பு உறுதி செய்கிறது.',
      checks: ['சில விநாடிகளில் அடையாள சரிபார்ப்பு', 'குறியாக்கப்பட்ட தரவு பரிமாற்றம்', 'அவசர உதவிக்கான நேரடி இருப்பிட கண்காணிப்பு'],
    },
    approval: {
      badge: 'இரு தரப்பு ஒப்புதல் அமைப்பு',
      title: 'நீங்கள் திருப்தியடையும் வரை பணம் விடுவிக்கப்படாது',
      summary: 'பணி முடிந்ததும் வாடிக்கையாளரும் சேவை வழங்குநரும் தங்கள் செயலியில் நிறைவு உறுதிப்படுத்திய பிறகே பணம் விடுவிக்கப்படும்.',
      learn: 'எங்கள் உத்தரவாதத்தை அறியுங்கள்',
      customer: 'வாடிக்கையாளர்',
      provider: 'வழங்குநர்',
      confirmed: 'உறுதி செய்யப்பட்டது',
      released: 'பணம் விடுவிக்கப்பட்டது',
    },
    testimonials: {
      title: 'எங்கள் வாடிக்கையாளர்கள் சொல்வது',
      subtitle: 'இலங்கை முழுவதும் ஆயிரக்கணக்கான குடும்பங்கள் நம்பும் சேவை.',
      items: [
        { quote: 'QR சரிபார்ப்பு எனக்கு நிம்மதி கொடுத்தது. மின்சார நிபுணர் நேரத்திற்கு வந்து தொழில்முறையாகச் செய்தார்.', name: 'அனுர பெரேரா', city: 'கொழும்பு 07' },
        { quote: 'ஞாயிற்றுக்கிழமை அவசர கசிவுக்கு 10 நிமிடங்களில் பிளம்பர் கிடைத்தார். மிகவும் பரிந்துரைக்கிறேன்.', name: 'லக்ஷானி சில்வா', city: 'கண்டி' },
        { quote: 'இரு தரப்பு உறுதிப்படுத்தல் மிகவும் நியாயமானது. வேலை தரமாக முடிந்த பிறகே பணம் செல்கிறது.', name: 'தமித் ஜயவர்தன', city: 'காலி' },
      ],
    },
    footer: {
      description: 'தரம் மற்றும் பாதுகாப்பை மதிக்கும் வாடிக்கையாளர்களுடன் திறமையான இலங்கை தொழில்முறை நிபுணர்களை இணைக்கும் நம்பகமான தளம்.',
      quickLinks: 'விரைவு இணைப்புகள்',
      support: 'ஆதரவு',
      contact: 'தொடர்பு',
      links: ['நிபுணரைத் தேடு', 'நிபுணராகுங்கள்', 'எப்படி செயல்படும்', 'சேவை பகுதிகள்'],
      supportLinks: ['உதவி மையம்', 'பாதுகாப்பு வழிகாட்டி', 'எங்களை தொடர்பு கொள்ள', 'பயன்பாட்டு விதிமுறைகள்'],
      github: 'GitHub',
      whatsapp: 'WhatsApp',
      copyright: '© 2024 LankaServe. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      privacy: 'தனியுரிமைக் கொள்கை',
      terms: 'சேவை விதிமுறைகள்',
      cookies: 'குக்கீ அமைப்புகள்',
    },
  },
} satisfies Record<LanguageCode, typeof en>;

export function getInitialLandingLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(languageStorageKey);
  return languageOptions.some((option) => option.code === stored) ? (stored as LanguageCode) : 'en';
}
