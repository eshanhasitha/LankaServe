import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="scroll-smooth bg-white text-slate-900">
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="bg-blue-900 text-white p-2 rounded-lg">
                <span className="material-symbols-outlined block">handshake</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-blue-900">LankaServe</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a className="font-medium hover:text-blue-900 transition-colors" href="#home">Home</a>
              <a className="font-medium hover:text-blue-900 transition-colors" href="#categories">Services</a>
              <a className="font-medium hover:text-blue-900 transition-colors" href="#how-it-works">How It Works</a>
              <a className="font-medium hover:text-blue-900 transition-colors" href="#about">About</a>
              <div className="flex items-center gap-1 cursor-pointer hover:text-blue-900 transition-colors">
                <span className="material-symbols-outlined text-xl">language</span>
                <span className="font-medium">EN</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link className="px-5 py-2.5 font-semibold text-blue-900 border-2 border-blue-900 rounded-lg hover:bg-blue-900 hover:text-white! transition-all" to="/login">Login</Link>
              <Link className="px-5 py-2.5 font-semibold bg-blue-900 text-white! border-2 border-blue-900 rounded-lg hover:bg-blue-800 hover:border-blue-800 transition-all" to="/register">Sign Up</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-32" id="home">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1]">
                Find Trusted <span className="text-blue-900">Skilled Service</span> Providers Near You
              </h1>
              <p className="text-lg text-slate-600 max-w-lg">
                The most reliable platform in Sri Lanka to connect with verified electricians, plumbers, and more. Quality service, guaranteed security.
              </p>
              <div className="relative max-w-md group flex items-center">
                <span className="absolute left-4 flex items-center pointer-events-none z-10 text-slate-500 group-focus-within:text-blue-900">
                  <span className="material-symbols-outlined text-2xl">search</span>
                </span>
                <input className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none" placeholder="What service do you need?" type="text" />
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-2 px-8 py-4 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20" type="button">
                  Find Services <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <Link className="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20" to="/register">
                  Become a Provider <span className="material-symbols-outlined">person_add</span>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-slate-200 overflow-hidden shadow-2xl">
                <img alt="Service Worker Representative" className="w-full h-full object-cover mix-blend-multiply opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVp5BaHZEV4pEoJzibIAsvqjRucQLPBfJaLn9tlk8mIOe68siP2VU8RYSj8hO7U4GNS6Jd19ojZFnOnmj7EgpGHcHUtSgpxHRW0b-VtQK7Fuq9O2C_qLFStcWDkNRAPQ9FTqxGGwFLfFXq3DR8hU-ZLJpczSq9XYqhuo_Sify5e0bhSzE8pYkZ042tKWVf_97QiFFctGvHuq7_wc6Shr5qOjkTjCCby4rapR_Ka_kn5MvjFh1TE6tpoHN0uUyVdhSHp0BEYr_l6zB0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-8xl text-slate-400 opacity-50">engineering</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="material-symbols-outlined text-green-600">verified</span>
                  </div>
                  <span className="font-bold text-2xl">2.5k+</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">Verified Professional Providers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white" id="categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Popular Categories</h2>
            <div className="h-1.5 w-20 bg-blue-900 mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="h-56 bg-slate-100 overflow-hidden relative">
                <img alt="Electrician Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA76zUe3a81JWsAC1YMQ24ri1CWEHXxcR9lL3ZXRrWn3SazJJA4LgbOQSPptwlGU9D8HTMGOfF8WKMQzRzDf7Mp3eR-rILqFOPs4z6buJC7G4mptHB_NxDO4EnMXQIL3yZBd5AhHop4YguvSNUJefgOWLflxqRjXypbP5PVA8_80VBYu8Z0yOzxX7klZupfPPfjyDJGMRHqJxiDiXJyMCn5sdaBp0dkpqlTLB8bGnFuHpumesBTFSPmlBryLEyJUpmdIJ5boV-3UUoG" />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-3">Electrician</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">Expert wiring, repairs, and installations for residential and commercial properties.</p>
                <a className="inline-flex items-center font-bold text-blue-900 group-hover:translate-x-2 transition-transform" href="#categories">
                  View more <span className="material-symbols-outlined ml-1">arrow_forward</span>
                </a>
              </div>
            </div>
            <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="h-56 bg-slate-100 overflow-hidden relative">
                <img alt="Plumber Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOB0JvtM3r9ypYyeZtVHtIRtK3Y5OzkjfBp6VWDlS5FumstT2Uunsg4XN9DXHs32OuF1-dkcnd7rSN7umhEGAvH7_g5OvKUkbtcUqnku2a0ahkQZwN_HLDoXdRLvUAt6A0da0gaf2kgz3pJndPnCHyl24FoPXNjVgphjAXD9e8bLqs91pqnqM2fK-nD9eBLA26DFFUUcZIbPJb2S2aJW_aMppveq0jkAjV4viki_tQGHt8UdS2bYovmeziFW0e-_i0KVH7AM2uOMa7" />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-3">Plumber</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">Fix leaks, install fixtures, and maintain water systems with certified experts.</p>
                <a className="inline-flex items-center font-bold text-blue-900 group-hover:translate-x-2 transition-transform" href="#categories">
                  View more <span className="material-symbols-outlined ml-1">arrow_forward</span>
                </a>
              </div>
            </div>
            <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="h-56 bg-slate-100 overflow-hidden relative">
                <img alt="Carpenter Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdnZ2kR0cc5090psm9UXA_nTa5nPFgGDS76ijdNuS2UU7wkDL60vVyRLEBnCziEvazzkQh_ZzaLuhhzFQ5sIUlQN4fnwKNj6hcX1RI0SqEAs2lZi3Ii84NcYCbOA-RqBcf_VMVVv_kiVlwlr1uv4ZCLqEXazmin3wJ8lextPYSKIZqGS5tKf8_vmCMboCF9UW-ekuN9VuGrsQm8-svIH5GoQ9V9DsClamwRIKNBonzhe_eKB1ttfU_tZJ97fSqSo60X5YqEdl2QAsA" />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-3">Carpenter</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">Custom furniture, repairs, and woodwork solutions for your home or office.</p>
                <a className="inline-flex items-center font-bold text-blue-900 group-hover:translate-x-2 transition-transform" href="#categories">
                  View more <span className="material-symbols-outlined ml-1">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50 overflow-hidden" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl font-extrabold mb-12 text-slate-900">How LankaServe Works</h2>
              <div className="relative">
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200" />
                <div className="relative flex items-start gap-8 mb-12">
                  <div className="shrink-0 w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center z-10 shadow-lg shadow-blue-900/30">
                    <span className="material-symbols-outlined">edit_note</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Post a Request</h3>
                    <p className="text-slate-600">Describe the task you need help with and set your budget. It only takes a minute.</p>
                  </div>
                </div>
                <div className="relative flex items-start gap-8 mb-12">
                  <div className="shrink-0 w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center z-10 shadow-lg shadow-blue-900/30">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Connect with Providers</h3>
                    <p className="text-slate-600">Review quotes from verified local experts. Check their ratings and pick the best match.</p>
                  </div>
                </div>
                <div className="relative flex items-start gap-8">
                  <div className="shrink-0 w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center z-10 shadow-lg shadow-blue-900/30">
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Secure QR Verification</h3>
                    <p className="text-slate-600">Ensure security with on-site QR scanning to confirm the provider&apos;s identity and job start.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
                <img alt="Process Illustration" className="rounded-2xl w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvRYkHtmFDemOpKi3BhMKKGvMCK8DgLdaQL8apH5LtV4D8nJelOPMIPGPDtmIOAs4mHrTtgDZ6KcH86aymg8Qsg3pmmWPIOF2vXpIcQ0GxJBbDT8bQUllp0C4D9xlgeKoja-_4txXlIn1MkT3o3KnJymi-bhL3sQFKFRf19wCTQ9BTE1Zp3DmPIWZU9Hrgsqp50rzceBrld8aWwtHDZPCv4PKLvlfBwyuZM1TP0uTkydS6DTRLRMIvcad6vKqyDTZ2SZffGqbmsbld" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-video bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden">
                <img alt="QR Scan Demo" className="w-full h-full object-cover opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZSm-S2LOz7VSmvzUpfqVvx3cHq_OgM8M_sx9mAhItChGevTV3ksifG-fq-yJ_YXThGxu8MiFrWeldOpDKaCeJIUuQHxrFcPyzusvpc8VnC7Ja9ki5sZW-DPzhSPYrVDDB5XJyNvvWgQksdbx4CXQ2Sc9KTY302ZtGjjt-aPpTXfz9euOidIl5XNbKE4-9tiXE4fojgtomXoUVoVqZKjsWosaDz9FgFBOqUTbud8hOUSk73vL6eMeWnS0-nRMKM-wIWSukg8KaHMvq" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-2xl shadow-2xl animate-pulse">
                    <span className="material-symbols-outlined text-blue-900 text-8xl">qr_code_2</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-900 rounded-full text-sm font-bold mb-6">
                <span className="material-symbols-outlined text-sm mr-2">security</span> Secure On-Site Validation
              </div>
              <h2 className="text-4xl font-extrabold mb-6 leading-tight">Advanced QR-Based Verification System</h2>
              <p className="text-lg text-slate-600 mb-8">
                Safety is our top priority. Our unique QR system ensures that the person walking into your home is exactly who they claim to be. Scan the provider&apos;s app upon arrival to unlock job details and secure the session.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-emerald-500">check_circle</span><span className="font-medium">Identity verification in seconds</span></li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-emerald-500">check_circle</span><span className="font-medium">Encrypted data transmission</span></li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-emerald-500">check_circle</span><span className="font-medium">Real-time location tracking for emergency help</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold mb-6">
                <span className="material-symbols-outlined text-sm mr-2">verified_user</span> Dual Approval System
              </div>
              <h2 className="text-4xl font-extrabold mb-6 leading-tight">No Payment Released Until You&apos;re Happy</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Our dual-confirmation system protects both the customer and the service provider. Once the task is done, both parties must confirm completion on their respective apps before the funds are released.
              </p>
              <button className="font-bold text-blue-900 flex items-center hover:gap-2 transition-all" type="button">
                Learn about our Guarantee <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </button>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <span className="material-symbols-outlined text-4xl text-blue-900 mb-2">person</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer</p>
                    <p className="font-bold mt-1">Confirmed</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">construction</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Provider</p>
                    <p className="font-bold mt-1">Confirmed</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-center p-4 bg-blue-900 rounded-xl text-white font-bold">
                  <span className="material-symbols-outlined mr-2">lock_open</span> Payment Released
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white overflow-hidden" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-extrabold mb-4">What Our Customers Say</h2>
              <p className="text-slate-600">Trusted by thousands of families across Sri Lanka.</p>
            </div>
            <div className="flex gap-4">
              <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors" type="button"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors" type="button"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              ['The QR verification gave me peace of mind as a solo resident. The electrician was punctual and professional. Best service in Colombo!', 'Anura Perera', 'Colombo 07', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9QzE0Jvak75QWGfXm-lBbpe_FwiY3cxb8EfbeVRx-B-kdyuQA2RV0uHv3pSiAVtiBLj_vHdtVe5BQTfw3g_E3adzrVhTm_YvevOV7anhUI4vTCzkp6hTX1NP9gCTwvFXVGg75W_B6v6l7km_ZvSBY-Lfi62sxa5T5SCyqL7ltadQFAgdEBFbpP5wwdOq0C76DH8Rcst_zsrEbPyeKci6CJHVNPi7X1-WK2p5gFDfHNPU9miLSU_GUlFMELnvF_r7uRpPfQne0Xx1b'],
              ['LankaServe is a game-changer. I found a plumber in 10 minutes for an emergency leak on a Sunday. Highly recommended for busy professionals.', 'Lakshani Silva', 'Kandy City', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4x-p5N2ThHKeOHAvHUFlH4Mu6prsGBoLPhqhdbF5piZ3E6E5UVyqrh3KlkTTJ58QjJbhTGCzJYYbcAinzYVJzaLLP_A3XPsDrbt64ciEJw4YJGf92Un15twgu87ekpudrc6JUE1CQ27KoZG48UxM-QJB50RxriLbDerNSL1uB1-Ozvr5IH6GANYIroW_ABFzmziQ96PRU9HT4Ie68IETU0lWkAiK_WgjOjbbahysvqo9NBscN4TW77Ne_DAMOw_3JQG0egr-nOSYW'],
              ['I love the dual confirmation feature. It ensures that the work is completed to my standards before I pay. Fair and transparent.', 'Damith Jayawardena', 'Galle Fort', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH0G_hzyTN9TJw3rvZRjyHeZXzRx0d4IhseccNIiTqQ3Tkmk63Fu1J1AWnO4u4UaU_D0YglaTDwJDUyw0juJypGVAZ6pm3BzrNSp1p3bZikqwvllMvJGb6Ie1QWY4G-kRFkCYJKWWsr3ktdidH3yZQOYP_BBaf4HoDM4gLnwlVxdVLFAZR7nOX_asMPP9KYI4fHLUHhMp9NhDTcriMvVzj92_6MO6tflfGwI1FUPYeCL-J1RexNvse9SJggOOi5VACNsjaSw6XbYm'],
            ].map(([quote, name, city, img]) => (
              <div key={name} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex text-yellow-400 mb-6">
                  <span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span>
                </div>
                <p className="text-slate-700 italic mb-8 leading-relaxed">&quot;{quote}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Customer" className="w-full h-full object-cover" src={img} />
                  </div>
                  <div>
                    <p className="font-bold">{name}</p>
                    <p className="text-sm text-slate-500">{city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-blue-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 mb-20">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-white text-blue-900 p-2 rounded-lg">
                  <span className="material-symbols-outlined block">handshake</span>
                </div>
                <span className="text-2xl font-bold tracking-tight">LankaServe</span>
              </div>
              <p className="text-blue-100 max-w-sm leading-relaxed">
                Connecting skilled Sri Lankan professionals with customers who value quality and security. Your trusted partner for every household task.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-4 text-blue-100">
                <li><a className="hover:text-white transition-colors" href="#categories">Find a Pro</a></li>
                <li><a className="hover:text-white transition-colors" href="#categories">Become a Pro</a></li>
                <li><a className="hover:text-white transition-colors" href="#how-it-works">How it works</a></li>
                <li><a className="hover:text-white transition-colors" href="#about">Service areas</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">Support</h4>
              <ul className="space-y-4 text-blue-100">
                <li><a className="hover:text-white transition-colors" href="#about">Help Center</a></li>
                <li><a className="hover:text-white transition-colors" href="#about">Safety Guide</a></li>
                <li><a className="hover:text-white transition-colors" href="#about">Contact Us</a></li>
                <li><a className="hover:text-white transition-colors" href="#about">Terms of Use</a></li>
              </ul>
            </div>
            <div className="lg:col-span-1">
              <h4 className="font-bold text-lg mb-6">Newsletter</h4>
              <p className="text-blue-100 text-sm mb-4">Stay updated with latest offers and tips.</p>
              <div className="flex gap-2">
                <input className="bg-white/10 border border-white/20 rounded-lg w-full px-4 py-2.5 text-white placeholder:text-blue-200 outline-none focus:ring-1 focus:ring-white/40" placeholder="Email" type="email" />
                <button className="bg-emerald-500 px-4 py-2 rounded-lg font-bold hover:bg-emerald-600" type="button">Join</button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-200">
            <p>© 2024 LankaServe. All rights reserved.</p>
            <div className="flex gap-8">
              <a className="hover:text-white" href="#about">Privacy Policy</a>
              <a className="hover:text-white" href="#about">Terms of Service</a>
              <a className="hover:text-white" href="#about">Cookies Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
