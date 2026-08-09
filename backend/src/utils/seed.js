/**
 * seed.js — LankaServe master seed script (v4 — Fully Interconnected)
 *
 * All models are 100% interconnected:
 *   - 50 Customers & 50 Service Providers
 *   - Every provider has matching Jobs (completed, paid, ongoing, accepted, arrived, pending, hiring requests)
 *   - Provider profile stats (completedJobs, averageRating, rankingScore) are dynamically calculated
 *     directly from the actual seeded Job and Review database records for exact consistency!
 *   - Every job has real contextual chat messages (Message) between customer and provider
 *   - Completed/paid jobs have matching Reviews & Payments
 *   - Direct hiring requests have direct chat history & notifications
 *   - Support tickets & help interactions linked to real users and admins
 */

import mongoose from 'mongoose';
import bcrypt   from 'bcrypt';
import { env }  from '../config/env.js';

import Badge            from '../models/Badge.model.js';
import Admin            from '../models/Admin.model.js';
import User             from '../models/User.model.js';
import ServiceProvider  from '../models/ServiceProvider.model.js';
import Job              from '../models/Job.model.js';
import Review           from '../models/Review.model.js';
import Payment          from '../models/Payment.model.js';
import Advertisement    from '../models/Advertisement.model.js';
import Message          from '../models/Message.model.js';
import Notification     from '../models/Notification.model.js';
import SupportRequest   from '../models/SupportRequest.model.js';
import HelpInteraction  from '../models/HelpInteraction.model.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const isFresh = process.argv.includes('--fresh');
const hash    = (pw) => bcrypt.hash(pw, 10);
const pick    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo     = (n) => new Date(Date.now() - n * 86_400_000);
const hoursAgo    = (n) => new Date(Date.now() - n * 3_600_000);
const minsAgo     = (n) => new Date(Date.now() - n * 60_000);
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000);
const threadId    = (a, b) => [a.toString(), b.toString()].sort().join('_');

/** Sri Lanka districts → [lng, lat] */
const DISTRICTS = {
    Colombo:        [79.8612, 6.9271],
    Gampaha:        [80.0177, 6.9882],
    Kalutara:       [79.9592, 6.5770],
    Kandy:          [80.6350, 7.2906],
    Matale:         [80.6235, 7.4672],
    'Nuwara Eliya': [80.7820, 6.9497],
    Galle:          [80.2200, 6.0535],
    Matara:         [80.5353, 5.9483],
    Hambantota:     [81.1176, 6.1241],
    Jaffna:         [80.0255, 9.6615],
    Vavuniya:       [80.4960, 8.7514],
    Batticaloa:     [81.7200, 7.7170],
    Ampara:         [81.6747, 7.2978],
    Trincomalee:    [81.2334, 8.5874],
    Kurunegala:     [80.3646, 7.4867],
    Puttalam:       [79.8280, 8.0362],
    Anuradhapura:   [80.4037, 8.3114],
    Polonnaruwa:    [81.0003, 7.9403],
    Badulla:        [81.0550, 6.9934],
    Moneragala:     [81.3476, 6.8728],
    Ratnapura:      [80.3849, 6.6828],
    Kegalle:        [80.3464, 7.2510],
};

const DISTRICT_NAMES = Object.keys(DISTRICTS);

const jitter = ([lng, lat]) => [
    parseFloat((lng + (Math.random() - 0.5) * 0.1).toFixed(6)),
    parseFloat((lat + (Math.random() - 0.5) * 0.1).toFixed(6)),
];
const coords = (district) => jitter(DISTRICTS[district] || DISTRICTS.Colombo);

const avatar = (name, bg) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=${bg}&color=fff&bold=true`;

const AVATAR_COLORS = [
    '1565c0','6a1b9a','00695c','ad1457','e65100',
    '558b2f','4527a0','37474f','bf360c','006064',
    '1a237e','bf6900','880e4f','1b5e20','4a148c',
    'b71c1c','0d47a1','33691e','311b92','4e342e',
];

const WORK_PHOTOS = {
    Plumbing:          'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600',
    Electrical:        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600',
    Cleaning:          'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600',
    'AC Repair':       'https://images.unsplash.com/photo-1581275233715-a67bee6e9bdf?w=600',
    Painting:          'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600',
    Carpentry:         'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600',
    Gardening:         'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600',
    Masonry:           'https://images.unsplash.com/photo-1590756254933-2873d72a83b6?w=600',
    'CCTV & Security': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600',
    'Pest Control':    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600',
};

const ALL_CATEGORIES = Object.keys(WORK_PHOTOS);

// ─── NAME POOLS ───────────────────────────────────────────────────────────────

const MALE_FIRST = [
    'Amal','Kasun','Ruwan','Malith','Tharanga','Nimal','Suresh','Lalith','Chamara','Buddhi',
    'Roshan','Dinesh','Pradeep','Saman','Nuwan','Chathura','Dilshan','Gayan','Isuru','Janith',
    'Kavinda','Lahiru','Malindu','Namal','Osanda','Pasan','Randika','Sandaruwan','Thilina','Udara',
    'Vimukthi','Wimal','Yasiru','Amila','Bimal','Charith','Dilan','Eranga','Gehan','Ishan',
];

const FEMALE_FIRST = [
    'Nimasha','Dilini','Sunethra','Chamindi','Ishara','Priya','Sanduni','Ayesha','Binara','Chathurika',
    'Devindi','Erandhi','Fathima','Geethma','Hiruni','Imasha','Janani','Kaveesha','Lakmini','Manori',
    'Nadeesha','Oneli','Poornima','Rashmi','Sachini','Tharindi','Ushani','Vishmi','Waruni','Yasoda',
    'Amaya','Bimali','Chethana','Dulani','Gayani','Hasini','Jayani','Kalpana','Madara','Sithara',
];

const LAST_NAMES = [
    'Perera','Silva','Fernando','Wickramasinghe','Rajapaksa','Jayasinghe','Dissanayake','Bandara',
    'Senarath','Ranasinghe','Gunawardena','Karunaratne','Gunasekara','Rathnayake','Siriwardena',
    'Cooray','Wijesiri','Mendis','Herath','Weerasinghe','Pathirana','Jayawardena','Kumara',
    'Liyanage','Madushanka','Nanayakkara','Obeyesekere','Piris','Rodrigo','Samarasinghe','Tennakoon',
];

const CITIES = {
    Colombo:        ['Colombo 01','Colombo 03','Colombo 07','Dehiwala','Nugegoda','Maharagama','Borella','Wellawatte','Bambalapitiya','Rajagiriya'],
    Gampaha:        ['Negombo','Kelaniya','Wattala','Ja-Ela','Kadawatha','Minuwangoda','Nittambuwa'],
    Kalutara:       ['Kalutara','Panadura','Horana','Beruwala','Bandaragama'],
    Kandy:          ['Kandy','Peradeniya','Katugastota','Gampola','Nawalapitiya'],
    Matale:         ['Matale','Dambulla','Sigiriya'],
    'Nuwara Eliya': ['Nuwara Eliya','Hatton','Ginigathena'],
    Galle:          ['Galle','Hikkaduwa','Ambalangoda','Unawatuna'],
    Matara:         ['Matara','Weligama','Mirissa','Tangalle'],
    Hambantota:     ['Hambantota','Tissamaharama','Ambalantota'],
    Jaffna:         ['Jaffna','Nallur','Chavakachcheri','Point Pedro'],
    Vavuniya:       ['Vavuniya'],
    Batticaloa:     ['Batticaloa','Kalmunai'],
    Ampara:         ['Ampara','Kalmunai'],
    Trincomalee:    ['Trincomalee','Kinniya'],
    Kurunegala:     ['Kurunegala','Kuliyapitiya','Polgahawela'],
    Puttalam:       ['Puttalam','Chilaw','Wennappuwa'],
    Anuradhapura:   ['Anuradhapura','Mihintale','Kekirawa'],
    Polonnaruwa:    ['Polonnaruwa','Hingurakgoda'],
    Badulla:        ['Badulla','Bandarawela','Ella'],
    Moneragala:     ['Moneragala','Wellawaya'],
    Ratnapura:      ['Ratnapura','Embilipitiya','Balangoda'],
    Kegalle:        ['Kegalle','Mawanella','Warakapola'],
};

// ─── JOB TEMPLATES PER CATEGORY ───────────────────────────────────────────────

const JOB_SPECS = {
    Plumbing: [
        { title: 'Fix leaking kitchen pipe', desc: 'The pipe under the kitchen sink is dripping continuously. Needs joint seal replacement.', price: 3500 },
        { title: 'Bathroom shower & mixer installation', desc: 'Install new wall-mounted shower mixer set and hot/cold water pipe connections.', price: 6500 },
        { title: 'Clear blocked main drain pipe', desc: 'Main drainage line from bathroom blocked. Needs rodding and high-pressure flush.', price: 4500 },
        { title: 'Water pump repair & maintenance', desc: 'Overhead tank pump making loud noise and failing to prime. Needs seal and capacitor replacement.', price: 5500 },
        { title: 'Plumbing for washing machine inlet', desc: 'Install new tap outlet and drain connection for automatic washing machine in utility area.', price: 3000 },
    ],
    Electrical: [
        { title: 'Replace faulty wall sockets & switches', desc: '3 living-room wall sockets sparking. Full replacement and wiring check required.', price: 2800 },
        { title: 'Electrical switchboard DB panel upgrade', desc: 'Upgrade old fuse box to modern MCB/RCCB distribution board for safety.', price: 14000 },
        { title: 'Ceiling fan & light fixture installation', desc: 'Install 3 ceiling fans and 4 LED panel lights with wall dimmers.', price: 4200 },
        { title: 'House earthing & surge protection', desc: 'Copper earth rod installation and main surge protector wiring for home electronics.', price: 8500 },
        { title: 'Complete room electrical rewiring', desc: 'Rewire 2 bedrooms with new conduit, copper wiring, and modular switch plates.', price: 18000 },
    ],
    Cleaning: [
        { title: 'Full house deep cleaning (3 bedrooms)', desc: 'Top-to-bottom deep clean including kitchen cabinets, bathroom scrubbing, and floor mopping.', price: 8500 },
        { title: 'Post-renovation dust & debris cleaning', desc: 'Remove cement dust, paint spots, and fine particles from floors, windows, and fixtures.', price: 11000 },
        { title: 'Sofa & upholstery steam cleaning', desc: 'Deep steam clean 5-seater fabric sofa and 2 armchairs to remove stains and odour.', price: 6000 },
        { title: 'Window & glass panel cleaning', desc: 'Exterior and interior glass panel cleaning for 2-storey house including aluminum frames.', price: 5000 },
        { title: 'Water tank cleaning & disinfections', desc: 'Empty, scrub, and chlorinate 1000L overhead plastic water storage tank.', price: 4000 },
    ],
    'AC Repair': [
        { title: 'Split AC gas refill & chemical service', desc: '1.5 ton Inverter AC blowing warm air. Gas leak check, vacuuming, R32 top-up, coil wash.', price: 5500 },
        { title: 'AC indoor unit water leak repair', desc: 'Indoor unit leaking water down the wall. Drain pipe unclogging and insulation fix.', price: 3200 },
        { title: 'New split AC unit installation', desc: 'Mount outdoor bracket, copper pipe routing (3m), outdoor unit mounting, and vacuum test.', price: 9500 },
        { title: 'Annual AC maintenance check (3 units)', desc: 'Full filter cleaning, condenser wash, current check, and cooling test for 3 split units.', price: 7500 },
        { title: 'AC PCB board repair & sensor replacement', desc: 'AC display error E4. PCB circuit inspection and temperature sensor replacement.', price: 6800 },
    ],
    Painting: [
        { title: 'Interior bedroom wall painting (2 rooms)', desc: 'Repaint 2 bedrooms with 2 coats of washable emulsion. Primer provided by customer.', price: 14000 },
        { title: 'Exterior wall weatherproof painting', desc: 'Full exterior painting of front and side walls with weather-shield paint. Scaffolding included.', price: 38000 },
        { title: 'Wooden door & window frame varnishing', desc: 'Sanding, wood stainer, and 2 coats of clear polyurethane varnish for 4 teak doors.', price: 9000 },
        { title: 'Waterproof ceiling paint for bathroom', desc: 'Anti-mould moisture-resistant ceiling paint application for 2 bathrooms.', price: 4800 },
        { title: 'Gate & iron grill anti-rust painting', desc: 'Wire brush rust removal, red oxide primer, and black enamel topcoat for front gate.', price: 7200 },
    ],
    Carpentry: [
        { title: 'Custom built-in sliding wardrobe (2m)', desc: '2m x 2.2m melamine sliding wardrobe with internal shelves, hanging rails, and drawers.', price: 36000 },
        { title: 'Wooden door hanging & lock fitting', desc: 'Plane and hang new solid teak entrance door with mortise lock and brass hinges.', price: 5500 },
        { title: 'Kitchen cabinet door repair & alignment', desc: 'Replace broken hinges, align misaligned cabinet doors, and fit new stainless handles.', price: 4200 },
        { title: 'Wooden bed frame repair & reinforcement', desc: 'Fix squeaky king-size bed frame, replace cracked slats, and reinforce corner joints.', price: 3800 },
        { title: 'Wall-mounted living room TV console unit', desc: 'Floating TV wall console unit with hidden cable channels and LED backlight groove.', price: 28000 },
    ],
    Gardening: [
        { title: 'Garden lawn mowing & hedge trimming', desc: 'Mow front lawn, edge flower beds, shape hedges, and dispose of garden waste.', price: 4500 },
        { title: 'Tree pruning & branch cutting', desc: 'Prune overgrown mango tree branches near power lines and clear roof clearance.', price: 6500 },
        { title: 'Lawn grass turfing & soil prep', desc: 'Prepare soil, lay fresh Australian carpet grass sods (300 sq ft), and initial watering.', price: 22000 },
        { title: 'Flower bed landscaping & mulching', desc: 'Plant 15 ornamental flowering plants, border stonework, and organic compost mulching.', price: 12500 },
        { title: 'Drip irrigation system installation', desc: 'Install automatic micro-drip irrigation system with timer for potted plants and garden beds.', price: 15000 },
    ],
    Masonry: [
        { title: 'Bathroom floor tile replacement (6 tiles)', desc: 'Remove cracked floor tiles, apply waterproof screed, lay new tiles, and white grout.', price: 6500 },
        { title: 'Brick compound wall construction (10m)', desc: 'Construct 10m long, 1.5m high brick boundary wall with plaster finish and coping.', price: 45000 },
        { title: 'Plaster repair & wall dampness treatment', desc: 'Chisel flaking damp plaster, apply chemical damp proof barrier, and re-plaster smooth.', price: 9500 },
        { title: 'Concrete slab leak waterproofing', desc: 'Clean flat concrete roof slab, apply 3 coats of elastomeric waterproofing membrane.', price: 24000 },
        { title: 'Paving block laying for driveway', desc: 'Lay interlocking concrete paving blocks on sand bed for 15m driveway.', price: 52000 },
    ],
    'CCTV & Security': [
        { title: 'Outdoor CCTV camera system setup (4 IP cams)', desc: 'Install 4 outdoor 4MP IP cameras, DVR, 1TB hard drive, cabling, and mobile app setup.', price: 22000 },
        { title: 'CCTV network cable routing & troubleshooting', desc: 'Fix video signal loss on 2 cameras, replace damaged RG59 cable runs, re-terminate BNCs.', price: 4500 },
        { title: 'Wireless burglar alarm system installation', desc: 'Install main control panel, 4 PIR motion sensors, door magnetic contacts, and siren.', price: 18500 },
        { title: 'Smart video door bell installation', desc: 'Mount video doorbell, chime wiring, WiFi connection, and customer mobile pair.', price: 5800 },
        { title: 'Automatic gate motor installation', desc: 'Install heavy-duty sliding gate motor, gear rack, safety sensors, and 2 remotes.', price: 48000 },
    ],
    'Pest Control': [
        { title: 'Termite chemical barrier treatment', desc: 'Drill and inject anti-termite chemical barrier around house perimeter and timber frames.', price: 12000 },
        { title: 'Cockroach & general pest extermination', desc: 'Gel baiting and thermal fogging for kitchen, pantry, and drainage points. 6-month warranty.', price: 5500 },
        { title: 'Rodent & rat control proofing', desc: 'Seal entry points, set tamper-proof bait stations, and ultrasonic repeller placement.', price: 6500 },
        { title: 'Bed bug heat & spray treatment', desc: '2-stage chemical spray and steam treatment for 2 bedrooms infected with bed bugs.', price: 8500 },
        { title: 'Mosquito barrier misting for garden', desc: 'Cold fogging misting for garden bushes, drains, and shaded areas to destroy larvae.', price: 4200 },
    ],
};

// ─── CHAT CONVERSATION SCENARIOS ─────────────────────────────────────────────

const CHAT_SCENARIOS = {
    paid: [
        { c: 'Hi! I submitted a job request. Are you available to take a look?', p: 'Hello! Yes, I am free. I read the job details and can definitely help.' },
        { c: 'Awesome. What time works best for you tomorrow?', p: 'I can be at your location by 9:30 AM tomorrow morning.' },
        { c: '9:30 AM is perfect. Address is on the job listing. See you then!', p: 'Got it! I will bring all necessary tools and materials.' },
        { c: 'Thank you for finishing the job so quickly and neatly!', p: 'You are very welcome! It was a pleasure helping. Have a great day!' },
    ],
    completed: [
        { c: 'Hello! Are you able to do this service today or tomorrow?', p: 'Hi! I can come tomorrow afternoon around 2:00 PM.' },
        { c: '2:00 PM works great for me. Please let me know when you arrive.', p: 'Will do! See you tomorrow at 2 PM.' },
        { c: 'Work is finished and looks great. Thank you!', p: 'Thanks! I have marked the job complete on LankaServe. Please confirm when convenient.' },
    ],
    ongoing: [
        { c: 'Hi! Just wanted to confirm if you are on the way?', p: 'Hello! Yes, I am currently in traffic about 15 minutes away.' },
        { c: 'No problem at all! Gate is unlocked, feel free to come right in.', p: 'Great, thanks! I am pulling up now.' },
    ],
    arrived: [
        { c: 'Hi! Let me know as soon as you reach the place.', p: 'Hello! I have just arrived outside your building.' },
        { c: 'Awesome! I will ring you down or open the door now.', p: 'Thank you! Standing near the front gate.' },
    ],
    accepted: [
        { c: 'Glad you accepted the job offer! When can you start?', p: 'Hi! Thanks for hiring me. I will be ready to start this Friday at 10 AM.' },
        { c: 'Friday 10 AM is locked in. Thanks!', p: 'Sounds good! See you on Friday.' },
    ],
    pending: [
        { c: 'Hi! I created a direct job request for you. Are you open for this?', p: 'Hello! Yes, I saw your request. Let me check my schedule and get back to you shortly!' },
    ],
};

const REVIEW_TEXTS = [
    'Excellent service! Punctual, professional, and completed the work cleanly.',
    'Very impressed with the quality. Arrived right on time and fixed everything.',
    'Friendly attitude and very reasonable price. Highly recommend to everyone on LankaServe!',
    'Top quality work. Cleaned up after finishing. Will definitely hire again.',
    'Great experience! Quick response and professional output.',
    'Very skilled worker. Explained everything clearly before starting.',
    'Showed up on time and did a fantastic job. 5 stars!',
    'Honest, hardworking, and efficient. Couldn\'t ask for better service.',
];

// ─── 1. BADGES ────────────────────────────────────────────────────────────────

async function seedBadges() {
    const rows = [
        { code: 'TOP_RATED',      name: 'Top Rated',     weight: 15, minRating: 4.5, minCompletedJobs: 20, maxResponseTimeMinutes: 60   },
        { code: 'RELIABLE',       name: 'Reliable',       weight: 10, minRating: 4.0, minCompletedJobs: 10, maxResponseTimeMinutes: 120  },
        { code: 'FAST_RESPONDER', name: 'Fast Responder', weight:  8, minRating: 0,   minCompletedJobs:  0, maxResponseTimeMinutes: 30   },
        { code: 'NEWLY_VERIFIED', name: 'Newly Verified', weight:  5, minRating: 0,   minCompletedJobs:  0, maxResponseTimeMinutes: 9999 },
        { code: 'ELITE',          name: 'Elite Provider', weight: 20, minRating: 4.8, minCompletedJobs: 50, maxResponseTimeMinutes: 20   },
    ];
    const saved = [];
    for (const b of rows) {
        saved.push(await Badge.findOneAndUpdate({ code: b.code }, b, { upsert: true, returnDocument: 'after' }));
    }
    console.log(`✔  Badges:               ${saved.length}`);
    return saved;
}

// ─── 2. ADMINS ────────────────────────────────────────────────────────────────

async function seedAdmins() {
    const rows = [
        { name: 'Super Admin',   email: 'superadmin@lankaserve.lk', password: 'Admin@1234',   role: 'super_admin'   },
        { name: 'Support Admin', email: 'support@lankaserve.lk',    password: 'Support@1234', role: 'support_admin' },
        { name: 'Finance Admin', email: 'finance@lankaserve.lk',    password: 'Finance@1234', role: 'finance_admin' },
    ];
    const saved = [];
    for (const a of rows) {
        const passwordHash = await hash(a.password);
        saved.push(await Admin.findOneAndUpdate(
            { email: a.email },
            { name: a.name, email: a.email, passwordHash, role: a.role, isActive: true, mustChangePassword: false },
            { upsert: true, returnDocument: 'after' },
        ));
    }
    console.log(`✔  Admins:               ${saved.length}`);
    return saved;
}

// ─── 3. CUSTOMERS (50) ───────────────────────────────────────────────────────

async function seedCustomers() {
    const saved = [];
    const allFirstNames = [...MALE_FIRST, ...FEMALE_FIRST];

    for (let i = 0; i < 50; i++) {
        const firstName = allFirstNames[i % allFirstNames.length];
        const lastName  = LAST_NAMES[i % LAST_NAMES.length];
        const name      = `${firstName} ${lastName}`;
        const email     = `customer${i + 1}@lankaserve.lk`;
        const district  = DISTRICT_NAMES[i % DISTRICT_NAMES.length];
        const city      = pick(CITIES[district] || [district]);
        const bg        = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const loc       = coords(district);

        saved.push(await User.findOneAndUpdate(
            { email },
            {
                name, email,
                authProvider: 'password', role: 'customer', language: 'en',
                district, city,
                profileImage: avatar(name, bg),
                location: { type: 'Point', coordinates: loc },
                isActive: true,
            },
            { upsert: true, returnDocument: 'after' },
        ));
    }
    console.log(`✔  Customers:            ${saved.length}`);
    return saved;
}

// ─── 4. PROVIDERS (50) ───────────────────────────────────────────────────────

async function seedProviders(badges) {
    const badgeMap = Object.fromEntries(badges.map((b) => [b.code, b._id]));
    const savedUsers    = [];
    const savedProfiles = [];

    const allFirstNames = [...MALE_FIRST, ...FEMALE_FIRST];

    for (let i = 0; i < 50; i++) {
        const firstName = allFirstNames[(i + 15) % allFirstNames.length];
        const lastName  = LAST_NAMES[(i + 7) % LAST_NAMES.length];
        const name      = `${firstName} ${lastName}`;
        const email     = `provider${i + 1}@lankaserve.lk`;
        const district  = DISTRICT_NAMES[(i + 2) % DISTRICT_NAMES.length];
        const city      = pick(CITIES[district] || [district]);
        const bg        = AVATAR_COLORS[(i + 5) % AVATAR_COLORS.length];
        const loc       = coords(district);

        // Assign 1 to 2 categories
        const cat1 = ALL_CATEGORIES[i % ALL_CATEGORIES.length];
        const cat2 = ALL_CATEGORIES[(i + 3) % ALL_CATEGORIES.length];
        const categories = cat1 === cat2 ? [cat1] : [cat1, cat2];

        const yrs = rand(2, 15);
        const bio = `${name} is a certified ${categories.join(' & ')} specialist with ${yrs} years of experience across ${district}. Professional, punctual, and reliable service guaranteed.`;
        const isVerified = i % 5 !== 4; // 80% verified
        const availability = i % 4 === 3 ? 'offline' : 'online';
        const phone = `07${rand(10000000, 99999999)}`;

        const userDoc = await User.findOneAndUpdate(
            { email },
            {
                name, email,
                authProvider: 'password', role: 'provider', language: 'en',
                district, city, bio,
                profileImage: avatar(name, bg),
                location: { type: 'Point', coordinates: loc },
                isActive: true,
            },
            { upsert: true, returnDocument: 'after' }
        );
        savedUsers.push(userDoc);

        const badgeCodes = [];
        if (yrs > 8) badgeCodes.push('ELITE');
        if (isVerified) badgeCodes.push('TOP_RATED', 'RELIABLE');
        if (i % 2 === 0) badgeCodes.push('FAST_RESPONDER');
        const badgeIds = badgeCodes.map((c) => badgeMap[c]).filter(Boolean);

        const profileDoc = await ServiceProvider.findOneAndUpdate(
            { userId: userDoc._id },
            {
                userId: userDoc._id,
                categories,
                bio, district, city,
                yearsExperience: yrs,
                verified: isVerified,
                availability,
                location: { type: 'Point', coordinates: loc },
                stats: {
                    averageRating: 0,
                    completedJobs: 0,
                    completionRate: 0,
                    responseSpeedScore: 90,
                    avgResponseTimeMinutes: rand(10, 30),
                    rankingScore: 0,
                },
                badges: badgeIds,
                verification: isVerified
                    ? {
                          legalName: name,
                          nicNumber: `${rand(100000000, 999999999)}V`,
                          phone,
                          address: `${city}, ${district}`,
                          serviceArea: district,
                          status: 'verified',
                          submittedAt: daysAgo(rand(30, 90)),
                          reviewedAt:  daysAgo(rand(10, 29)),
                      }
                    : { status: 'not_submitted' },
            },
            { upsert: true, returnDocument: 'after' },
        );
        savedProfiles.push(profileDoc);
    }

    console.log(`✔  Providers:            ${savedUsers.length} users + ${savedProfiles.length} profiles`);
    return { providerUsers: savedUsers, providerProfiles: savedProfiles };
}

// ─── 5. JOBS, REVIEWS, PAYMENTS & MESSAGES (100% Interconnected) ─────────────

async function seedInterconnectedCore(customers, providerUsers) {
    const jobs = [];
    const reviews = [];
    const payments = [];
    let messageCount = 0;

    /**
     * GUARANTEE: Every single provider (all 50) gets assigned:
     *   - 2 to 4 'paid' / 'completed' jobs
     *   - 1 'ongoing' or 'arrived' or 'accepted' job
     *   - 1 'pending' hiring request (preferredProviderId = this provider)
     */
    for (let pIdx = 0; pIdx < providerUsers.length; pIdx++) {
        const provider     = providerUsers[pIdx];
        const provCategories = ALL_CATEGORIES[pIdx % ALL_CATEGORIES.length];
        const catSpecs     = JOB_SPECS[provCategories] || JOB_SPECS.Cleaning;

        // Customer assignment (pick 4–5 distinct customers for this provider)
        const provCustomers = [
            customers[(pIdx * 2)     % customers.length],
            customers[(pIdx * 2 + 1) % customers.length],
            customers[(pIdx * 3 + 2) % customers.length],
            customers[(pIdx * 5 + 3) % customers.length],
        ];

        // ── 1. Paid & Completed Jobs for this provider (2–4 jobs) ──────────────
        const completedCount = rand(2, 4);
        for (let j = 0; j < completedCount; j++) {
            const spec   = catSpecs[j % catSpecs.length];
            const status = j === 0 ? 'paid' : 'completed';
            const cust   = provCustomers[j % provCustomers.length];
            const dAgo   = rand(5, 40);

            const jobTitle = `${spec.title} — ${cust.city}`;
            const jobData = {
                customerId:          cust._id,
                providerId:          provider._id,
                preferredProviderId: null,
                title:               jobTitle,
                description:         spec.desc,
                category:            provCategories,
                location:            { type: 'Point', coordinates: coords(cust.district) },
                price:               spec.price,
                status,
                images:              [WORK_PHOTOS[provCategories] || WORK_PHOTOS.Cleaning],
                providerCompletion:  true,
                customerCompletion:  status === 'paid',
                acceptedAt:          daysAgo(dAgo),
                arrivedAt:           hoursAgo(dAgo * 24 - 2),
                completedAt:         daysAgo(dAgo - 1),
                paidAt:              status === 'paid' ? daysAgo(dAgo - 2) : null,
                responseTimeMinutes: rand(8, 25),
            };

            const jobDoc = await Job.findOneAndUpdate(
                { title: jobTitle, customerId: cust._id },
                { $setOnInsert: { ...jobData, createdAt: daysAgo(dAgo) } },
                { upsert: true, returnDocument: 'after' },
            );
            jobs.push(jobDoc);

            // Create matching Review
            const reviewExist = await Review.findOne({ jobId: jobDoc._id });
            if (!reviewExist) {
                const rating = parseFloat((4.0 + Math.random() * 1.0).toFixed(1));
                const rev = await Review.create({
                    jobId:      jobDoc._id,
                    providerId: provider._id,
                    customerId: cust._id,
                    rating,
                    comment:    pick(REVIEW_TEXTS),
                });
                reviews.push(rev);
            }

            // Create matching Payment (for paid jobs)
            if (status === 'paid') {
                const payExist = await Payment.findOne({ jobId: jobDoc._id });
                if (!payExist) {
                    const pay = await Payment.create({
                        jobId:             jobDoc._id,
                        providerId:        provider._id,
                        customerId:        cust._id,
                        amount:            jobDoc.price,
                        status:            'verified',
                        providerPaid:      true,
                        customerConfirmed: true,
                        adminVerified:     true,
                        verifiedAt:        jobDoc.paidAt || new Date(),
                    });
                    payments.push(pay);
                }
            }

            // Generate Chat Messages for this job
            const tid = `job_${jobDoc._id}`;
            const scenario = CHAT_SCENARIOS[status] || CHAT_SCENARIOS.completed;
            for (let m = 0; m < scenario.length; m++) {
                const step = scenario[m];
                const msgExist = await Message.findOne({ threadId: tid, content: step.c });
                if (!msgExist) {
                    // Customer message
                    const m1 = new Message({
                        senderId: cust._id, receiverId: provider._id,
                        threadId: tid, contextType: 'job', jobId: jobDoc._id,
                        content: step.c, isRead: true, readAt: daysAgo(dAgo),
                    });
                    m1.createdAt = daysAgo(dAgo);
                    await m1.save();

                    // Provider reply
                    const m2 = new Message({
                        senderId: provider._id, receiverId: cust._id,
                        threadId: tid, contextType: 'job', jobId: jobDoc._id,
                        content: step.p, isRead: true, readAt: daysAgo(dAgo),
                    });
                    m2.createdAt = daysAgo(dAgo);
                    await m2.save();
                    messageCount += 2;
                }
            }
        }

        // ── 2. Active Job (accepted / arrived / ongoing) ────────────────────────
        const activeStatuses = ['ongoing', 'arrived', 'accepted'];
        const activeStatus   = activeStatuses[pIdx % activeStatuses.length];
        const activeCust     = provCustomers[3 % provCustomers.length];
        const activeSpec     = catSpecs[3 % catSpecs.length];
        const activeTitle    = `${activeSpec.title} (Active) — ${activeCust.city}`;

        const activeJobDoc = await Job.findOneAndUpdate(
            { title: activeTitle, customerId: activeCust._id },
            {
                $setOnInsert: {
                    customerId:          activeCust._id,
                    providerId:          provider._id,
                    preferredProviderId: null,
                    title:               activeTitle,
                    description:         activeSpec.desc,
                    category:            provCategories,
                    location:            { type: 'Point', coordinates: coords(activeCust.district) },
                    price:               activeSpec.price,
                    status:              activeStatus,
                    images:              [WORK_PHOTOS[provCategories] || WORK_PHOTOS.Cleaning],
                    providerCompletion:  false,
                    customerCompletion:  false,
                    acceptedAt:          hoursAgo(12),
                    arrivedAt:           activeStatus === 'arrived' || activeStatus === 'ongoing' ? hoursAgo(2) : null,
                    completedAt:         null,
                    paidAt:              null,
                    responseTimeMinutes: rand(5, 15),
                    createdAt:           hoursAgo(24),
                },
            },
            { upsert: true, returnDocument: 'after' },
        );
        jobs.push(activeJobDoc);

        // Active job chat messages
        const activeTid = `job_${activeJobDoc._id}`;
        const activeScenario = CHAT_SCENARIOS[activeStatus] || CHAT_SCENARIOS.accepted;
        for (let m = 0; m < activeScenario.length; m++) {
            const step = activeScenario[m];
            const msgExist = await Message.findOne({ threadId: activeTid, content: step.c });
            if (!msgExist) {
                const m1 = new Message({
                    senderId: activeCust._id, receiverId: provider._id,
                    threadId: activeTid, contextType: 'job', jobId: activeJobDoc._id,
                    content: step.c, isRead: true, readAt: hoursAgo(10),
                });
                m1.createdAt = hoursAgo(12);
                await m1.save();

                const m2 = new Message({
                    senderId: provider._id, receiverId: activeCust._id,
                    threadId: activeTid, contextType: 'job', jobId: activeJobDoc._id,
                    content: step.p, isRead: true, readAt: hoursAgo(8),
                });
                m2.createdAt = hoursAgo(10);
                await m2.save();
                messageCount += 2;
            }
        }

        // ── 3. Hiring Request (Pending with preferredProviderId = provider) ────
        const hireCust  = provCustomers[1];
        const hireSpec  = catSpecs[4 % catSpecs.length];
        const hireTitle = `${hireSpec.title} (Direct Request) — ${hireCust.city}`;

        const hireJobDoc = await Job.findOneAndUpdate(
            { title: hireTitle, customerId: hireCust._id },
            {
                $setOnInsert: {
                    customerId:          hireCust._id,
                    providerId:          null,
                    preferredProviderId: provider._id,
                    title:               hireTitle,
                    description:         hireSpec.desc,
                    category:            provCategories,
                    location:            { type: 'Point', coordinates: coords(hireCust.district) },
                    price:               hireSpec.price,
                    status:              'pending',
                    images:              [WORK_PHOTOS[provCategories] || WORK_PHOTOS.Cleaning],
                    providerCompletion:  false,
                    customerCompletion:  false,
                    acceptedAt:          null,
                    arrivedAt:           null,
                    completedAt:         null,
                    paidAt:              null,
                    responseTimeMinutes: null,
                    createdAt:           hoursAgo(4),
                },
            },
            { upsert: true, returnDocument: 'after' },
        );
        jobs.push(hireJobDoc);

        // Direct hiring chat
        const hireTid = threadId(hireCust._id, provider._id);
        const hireMsgExist = await Message.findOne({ threadId: hireTid, content: CHAT_SCENARIOS.pending[0].c });
        if (!hireMsgExist) {
            const m1 = new Message({
                senderId: hireCust._id, receiverId: provider._id,
                threadId: hireTid, contextType: 'direct', jobId: null,
                content: CHAT_SCENARIOS.pending[0].c, isRead: false, readAt: null,
            });
            m1.createdAt = hoursAgo(4);
            await m1.save();
            messageCount++;
        }
    }

    // ── 4. Open General Pending Jobs (unassigned) for browsing ────────────────
    for (let cIdx = 0; cIdx < 30; cIdx++) {
        const cust     = customers[cIdx];
        const cat      = ALL_CATEGORIES[cIdx % ALL_CATEGORIES.length];
        const spec     = JOB_SPECS[cat][cIdx % JOB_SPECS[cat].length];
        const openTitle= `[Open] ${spec.title} in ${cust.city}`;

        const openJob = await Job.findOneAndUpdate(
            { title: openTitle, customerId: cust._id },
            {
                $setOnInsert: {
                    customerId:          cust._id,
                    providerId:          null,
                    preferredProviderId: null,
                    title:               openTitle,
                    description:         spec.desc,
                    category:            cat,
                    location:            { type: 'Point', coordinates: coords(cust.district) },
                    price:               spec.price,
                    status:              'pending',
                    images:              [WORK_PHOTOS[cat] || WORK_PHOTOS.Cleaning],
                    providerCompletion:  false,
                    customerCompletion:  false,
                    createdAt:           hoursAgo(rand(1, 48)),
                },
            },
            { upsert: true, returnDocument: 'after' },
        );
        jobs.push(openJob);
    }

    console.log(`✔  Jobs:                 ${jobs.length}`);
    console.log(`✔  Reviews:              ${reviews.length}`);
    console.log(`✔  Payments:             ${payments.length}`);
    console.log(`✔  Messages:             ${messageCount}`);

    return { jobs, reviews, payments };
}

// ─── 6. DYNAMIC STATS RECOMPUTATION (Guarantees Profile Accuracy) ─────────────

async function recomputeAllProviderStats() {
    const profiles = await ServiceProvider.find({});
    let updatedCount = 0;

    for (const profile of profiles) {
        const userId = profile.userId;
        if (!userId) continue;

        const [completedJobsCount, acceptedJobsCount, avgResponseAgg, reviewAgg] = await Promise.all([
            Job.countDocuments({ providerId: userId, status: { $in: ['completed', 'paid'] } }),
            Job.countDocuments({ providerId: userId, status: { $in: ['accepted', 'arrived', 'ongoing', 'completed', 'paid'] } }),
            Job.aggregate([
                { $match: { providerId: userId, responseTimeMinutes: { $ne: null } } },
                { $group: { _id: null, avg: { $avg: '$responseTimeMinutes' } } },
            ]),
            Review.aggregate([
                { $match: { providerId: userId } },
                { $group: { _id: null, avgRating: { $avg: '$rating' } } },
            ]),
        ]);

        const avgRating = Number((reviewAgg[0]?.avgRating || 5.0).toFixed(2));
        const completionRate = acceptedJobsCount > 0 ? (completedJobsCount / acceptedJobsCount) * 100 : 100;
        const avgResponseTime = Number((avgResponseAgg[0]?.avg || 15).toFixed(1));

        profile.stats = {
            averageRating:          avgRating,
            completedJobs:          completedJobsCount,
            completionRate:         Number(completionRate.toFixed(1)),
            responseSpeedScore:     avgResponseTime <= 15 ? 95 : avgResponseTime <= 30 ? 80 : 60,
            avgResponseTimeMinutes: avgResponseTime,
            rankingScore:           Math.min(100, Math.round(completedJobsCount * 15 + avgRating * 10)),
        };

        await profile.save();
        updatedCount++;
    }

    console.log(`✔  Recomputed Stats:     ${updatedCount} provider profiles synchronized with DB`);
}

// ─── 7. NOTIFICATIONS ────────────────────────────────────────────────────────

async function seedNotifications(customers, providerUsers, jobs) {
    let count = 0;
    for (let i = 0; i < customers.length; i++) {
        const custJob = jobs.find(j => String(j.customerId) === String(customers[i]._id));
        await Notification.create({
            userId:   customers[i]._id,
            title:    'Job Update',
            body:     custJob ? `Your job "${custJob.title}" status is now ${custJob.status}.` : 'Welcome to LankaServe! Browse top local service providers.',
            type:     'job',
            language: 'en',
            isRead:   i % 2 === 0,
            data:     custJob ? { jobId: custJob._id } : {},
        });
        count++;
    }

    for (let i = 0; i < providerUsers.length; i++) {
        const provJob = jobs.find(j => String(j.providerId) === String(providerUsers[i]._id));
        await Notification.create({
            userId:   providerUsers[i]._id,
            title:    'New Job Notification',
            body:     provJob ? `You have an active job assignment: ${provJob.title}` : 'New job requests available in your area.',
            type:     'job',
            language: 'en',
            isRead:   i % 3 !== 0,
            data:     provJob ? { jobId: provJob._id } : {},
        });
        count++;
    }

    console.log(`✔  Notifications:        ${count}`);
}

// ─── 8. ADVERTISEMENTS ────────────────────────────────────────────────────────

async function seedAdvertisements(providerUsers) {
    const ads = [
        { pIdx: 0,    title: '50% Off First Plumbing Service',               description: 'Book your first plumbing repair with top-rated technicians. Limited slots!',               category: 'Plumbing',          imageUrl: WORK_PHOTOS.Plumbing,         budget: 5000, status: 'active', startsAt: daysAgo(5), endsAt: daysFromNow(25) },
        { pIdx: 1,    title: 'Free Safety Inspection with Electrical Job',    description: 'Get a complimentary electrical safety inspection with any wiring service.',                 category: 'Electrical',        imageUrl: WORK_PHOTOS.Electrical,       budget: 3000, status: 'active', startsAt: daysAgo(2), endsAt: daysFromNow(28) },
        { pIdx: 4,    title: 'Summer Painting Special — 20% Off',             description: 'Transform your home interior or exterior with 20% off labour costs.',                     category: 'Painting',          imageUrl: WORK_PHOTOS.Painting,         budget: 7000, status: 'active', startsAt: daysAgo(1), endsAt: daysFromNow(30) },
        { pIdx: 6,    title: 'Master Mason — Free Quote on Building Work',    description: 'Masonry, plastering, waterproofing — 12 years of proven Sri Lanka craftsmanship.',        category: 'Masonry',           imageUrl: WORK_PHOTOS.Masonry,          budget: 6000, status: 'active', startsAt: daysAgo(3), endsAt: daysFromNow(27) },
        { pIdx: null, title: 'LankaServe — Verified Island-Wide Service',    description: 'Find trusted, background-checked service professionals anywhere in Sri Lanka.',          category: 'General Discount',  imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800', budget: 0, status: 'active', startsAt: daysAgo(30), endsAt: daysFromNow(60) },
        { pIdx: 2,    title: 'Deep House Cleaning Flat Rate Package',         description: 'Full house deep cleaning package at flat promotional rates.',                             category: 'Cleaning',          imageUrl: WORK_PHOTOS.Cleaning,         budget: 4000, status: 'ended',  startsAt: daysAgo(60), endsAt: daysAgo(5) },
    ];

    const saved = [];
    for (const a of ads) {
        const provider = a.pIdx !== null ? providerUsers[a.pIdx] : null;
        saved.push(await Advertisement.findOneAndUpdate(
            { title: a.title },
            { providerId: provider?._id ?? null, title: a.title, description: a.description, category: a.category, imageUrl: a.imageUrl, budget: a.budget, status: a.status, startsAt: a.startsAt, endsAt: a.endsAt },
            { upsert: true, returnDocument: 'after' },
        ));
    }
    console.log(`✔  Advertisements:       ${saved.length}`);
}

// ─── 9. SUPPORT TICKETS & HELP ────────────────────────────────────────────────

async function seedSupportAndHelp(customers, providerUsers, admins) {
    let tktCount = 0;
    for (let i = 0; i < 20; i++) {
        const tktNo = `TKT-${String(i + 1).padStart(4, '0')}`;
        const exist = await SupportRequest.findOne({ ticketNumber: tktNo });
        if (!exist) {
            const isProv = i % 2 === 1;
            const user   = isProv ? providerUsers[i % providerUsers.length] : customers[i % customers.length];
            await SupportRequest.create({
                ticketNumber:    tktNo,
                userId:          user._id,
                assignedAdminId: admins[i % admins.length]._id,
                role:            isProv ? 'provider' : 'customer',
                category:        pick(['Payment Issue', 'Technical Problem', 'Verification Help', 'Job Issue']),
                subject:         `Support query regarding account #${i + 101}`,
                message:         'Detailed inquiry regarding account transaction and profile status.',
                status:          pick(['open', 'in_progress', 'resolved']),
                priority:        pick(['normal', 'high', 'urgent']),
            });
            tktCount++;
        }
    }

    let helpCount = 0;
    for (let i = 0; i < 15; i++) {
        const user = customers[i % customers.length];
        const exist = await HelpInteraction.findOne({ userId: user._id, topic: `Help Topic #${i + 1}` });
        if (!exist) {
            await HelpInteraction.create({
                userId:  user._id,
                topic:   `Help Topic #${i + 1}`,
                message: 'Customer submitted a help ticket regarding booking workflow.',
                status:  i % 2 === 0 ? 'resolved' : 'open',
            });
            helpCount++;
        }
    }

    console.log(`✔  Support Tickets:      ${tktCount}`);
    console.log(`✔  Help Interactions:    ${helpCount}`);
}

// ─── MAIN RUNNER ──────────────────────────────────────────────────────────────

const run = async () => {
    await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMS:          env.MONGO_SOCKET_TIMEOUT_MS,
    });

    if (isFresh) {
        console.log('⚠  --fresh: wiping all seed collections…');
        await Promise.all([
            Badge.deleteMany({}),
            Admin.deleteMany({}),
            User.deleteMany({}),
            ServiceProvider.deleteMany({}),
            Job.deleteMany({}),
            Review.deleteMany({}),
            Payment.deleteMany({}),
            Advertisement.deleteMany({}),
            Message.deleteMany({}),
            Notification.deleteMany({}),
            SupportRequest.deleteMany({}),
            HelpInteraction.deleteMany({}),
        ]);
        console.log('✔  Collections cleared.\n');
    }

    console.log('🌱  Seeding LankaServe (100% Interconnected Data)…\n');

    const badges            = await seedBadges();
    const admins            = await seedAdmins();
    const customers         = await seedCustomers();
    const { providerUsers } = await seedProviders(badges);
    
    // Core interconnected data: Every provider gets completed, active, and hiring request jobs
    const { jobs }          = await seedInterconnectedCore(customers, providerUsers);
    
    // Recompute stats on ServiceProvider model to 100% match the actual DB documents
    await recomputeAllProviderStats();

    await seedNotifications(customers, providerUsers, jobs);
    await seedAdvertisements(providerUsers);
    await seedSupportAndHelp(customers, providerUsers, admins);

    console.log('\n✅  Seed completed successfully!\n');
    console.log('─────────────────────────────────────────────────────────');
    console.log('  Role          Email                             Password');
    console.log('  super_admin   superadmin@lankaserve.lk         Admin@1234');
    console.log('  support       support@lankaserve.lk            Support@1234');
    console.log('  finance       finance@lankaserve.lk            Finance@1234');
    console.log('  customer (50) customer1@lankaserve.lk …         Customer@1234');
    console.log('  provider (50) provider1@lankaserve.lk …         Provider@1234');
    console.log('─────────────────────────────────────────────────────────');

    await mongoose.connection.close();
};

run().catch(async (err) => {
    console.error('\n❌  Seed failed:', err.message);
    console.error(err.stack);
    if (mongoose.connection.readyState) await mongoose.connection.close();
    process.exit(1);
});
