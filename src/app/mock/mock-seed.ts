// Deterministic sample data for the local "mock" backend (config.json `env: "mock"`).
// All names, phone numbers and businesses are synthetic. Area names are public Hyderabad localities.
// Dates are generated relative to the day the app is loaded so the default "today" filters always show data.
import { AttendanceStatus, BusinessType, ClusterType, UserType } from 'app/shared/models/enums';
import { PageIds } from 'app/shared/constants/page-ids';

export const MOCK_ADMIN_UID = 'mockAdminUid0000000000000001';
export const MOCK_SSO_TOKEN = 'mock-sso-custom-token';

export interface MockCustomer {
  id: string;
  businessName: string;
  customerName: string;
  mobileNumber: string;
  businessType: number;
  businessStatus: number;
  isActive: number;
  lastOrderDays: number;
  latitude: number;
  longitude: number;
  address: string;
  areaName: string;
  pincode: string;
  salesPersonId: string;
  dealerId: string;
  /** Ids of the MOCK_COMPANIES whose products the shop stocks. */
  companies?: string[];
}

/** Companies offered by the Tasks tab "Company" filter. `share` is the chance that a shop stocks the company. */
export const MOCK_COMPANIES = [
  { id: 'CMP_PARLE', name: 'Parle', share: 0.81 },
  { id: 'CMP_COLGATE', name: 'Colgate', share: 0.58 },
  { id: 'CMP_EMAMI', name: 'Emami', share: 0.46 },
  { id: 'CMP_MTR', name: 'MTR', share: 0.39 },
  { id: 'CMP_MYSORE_SANDAL', name: 'Mysore Sandal', share: 0.28 },
  { id: 'CMP_ITC', name: 'ITC', share: 0.6 },
  { id: 'CMP_VICCO', name: 'Vicco', share: 0.28 },
];

/** Companies a shop stocks. Keyed on the customer id, so the main seed sequence (and every id) stays unchanged. */
export function mockCompaniesFor(customerId: string): string[] {
  const r = keyedRandom(`companies|${customerId}`);
  return MOCK_COMPANIES.filter((company) => r.chance(company.share)).map((company) => company.id);
}

/**
 * Weekdays (0 = Sunday ... 6 = Saturday) on which a company delivers to shops around this point. Distributor routes
 * cover neighbourhoods, so every shop in the same ~300 m cell gets the same one or two days.
 */
export function mockDeliveryDays(companyId: string, latitude: number, longitude: number): number[] {
  const cell = `${Math.floor(latitude / 0.003)}_${Math.floor(longitude / 0.003)}`;
  const r = keyedRandom(`delivery|${companyId}|${cell}`);
  const days = new Set<number>([r.int(0, 6)]);
  if (r.chance(0.5)) days.add(r.int(0, 6));
  return [...days].sort((a, b) => a - b);
}

export interface MockSeed {
  firestore: Record<string, Record<string, any>>;
  rtdb: any;
  customers: MockCustomer[];
}

// ---------------------------------------------------------------------------------------------------------------
// Random helpers (seeded so every load produces the same data for the same day)
// ---------------------------------------------------------------------------------------------------------------
export function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
    hex: (len: number) => Array.from({ length: len }, () => Math.floor(next() * 16).toString(16)).join(''),
    alnum: (len: number) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      return Array.from({ length: len }, () => chars[Math.floor(next() * chars.length)]).join('');
    },
    digits: (len: number) => Array.from({ length: len }, () => Math.floor(next() * 10)).join(''),
  };
}
export type Random = ReturnType<typeof createRandom>;

/** FNV-1a 32-bit hash, used to derive stable per-record seeds and ids. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Random generator whose sequence only depends on `key` (stable across reloads and days). */
export function keyedRandom(key: string): Random {
  return createRandom(hashString(key));
}

export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function ymd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function atTime(date: Date, hours: number, minutes: number, seconds = 0) {
  const d = new Date(date);
  d.setHours(hours, minutes, seconds, 0);
  return d.getTime();
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ---------------------------------------------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------------------------------------------
const AREAS: { name: string; lat: number; lng: number; type: ClusterType; pincode: string }[] = [
  { name: 'Yousufguda', lat: 17.4375, lng: 78.428, type: ClusterType.General, pincode: '500045' },
  { name: 'Nizampet', lat: 17.5185, lng: 78.385, type: ClusterType.General, pincode: '500090' },
  { name: 'Madhapur', lat: 17.4486, lng: 78.3908, type: ClusterType.General, pincode: '500081' },
  { name: 'Kukatpally', lat: 17.4849, lng: 78.4138, type: ClusterType.General, pincode: '500072' },
  { name: 'Chandanagar', lat: 17.4936, lng: 78.327, type: ClusterType.General, pincode: '500050' },
  { name: 'Miyapur', lat: 17.4967, lng: 78.3563, type: ClusterType.General, pincode: '500049' },
  { name: 'Kondapur', lat: 17.46, lng: 78.3575, type: ClusterType.General, pincode: '500084' },
  { name: 'Kphb', lat: 17.493, lng: 78.399, type: ClusterType.General, pincode: '500085' },
  { name: 'Ecil', lat: 17.471, lng: 78.573, type: ClusterType.General, pincode: '500062' },
  { name: 'Dilsukhnagar', lat: 17.3688, lng: 78.5247, type: ClusterType.General, pincode: '500060' },
  { name: 'Jubliehills', lat: 17.4325, lng: 78.407, type: ClusterType.General, pincode: '500033' },
  { name: 'Alwal', lat: 17.503, lng: 78.51, type: ClusterType.General, pincode: '500010' },
  { name: 'Vanastalipuram', lat: 17.329, lng: 78.556, type: ClusterType.General, pincode: '500070' },
  { name: 'Musheerabad', lat: 17.414, lng: 78.5, type: ClusterType.General, pincode: '500020' },
  { name: 'Malkajgiri', lat: 17.447, lng: 78.534, type: ClusterType.General, pincode: '500047' },
  { name: 'Srnagar', lat: 17.443, lng: 78.443, type: ClusterType.General, pincode: '500038' },
  { name: 'Manikonda', lat: 17.404, lng: 78.386, type: ClusterType.General, pincode: '500089' },
  { name: 'Habsiguda', lat: 17.41, lng: 78.545, type: ClusterType.General, pincode: '500007' },
  { name: 'Malakpet', lat: 17.372, lng: 78.5, type: ClusterType.General, pincode: '500036' },
  { name: 'Khajaguda', lat: 17.417, lng: 78.373, type: ClusterType.General, pincode: '500008' },
  { name: 'Nacharam', lat: 17.428, lng: 78.56, type: ClusterType.General, pincode: '500076' },
  { name: 'Kompally', lat: 17.536, lng: 78.487, type: ClusterType.General, pincode: '500100' },
  { name: 'Bowenpally', lat: 17.473, lng: 78.485, type: ClusterType.General, pincode: '500011' },
  { name: 'Nagole', lat: 17.379, lng: 78.565, type: ClusterType.General, pincode: '500068' },
  { name: 'Narsingi', lat: 17.388, lng: 78.353, type: ClusterType.General, pincode: '500075' },
  { name: 'Gachibowli', lat: 17.44, lng: 78.348, type: ClusterType.General, pincode: '500032' },
  { name: 'Attapur', lat: 17.37, lng: 78.43, type: ClusterType.General, pincode: '500048' },
  { name: 'Golconda', lat: 17.383, lng: 78.401, type: ClusterType.General, pincode: '500008' },
  { name: 'Hayathnagar', lat: 17.327, lng: 78.604, type: ClusterType.General, pincode: '501505' },
  { name: 'Abids', lat: 17.392, lng: 78.476, type: ClusterType.General, pincode: '500001' },
  { name: 'Begum Bazar', lat: 17.38, lng: 78.472, type: ClusterType.WholeSaler, pincode: '500012' },
  { name: 'Gowliguda', lat: 17.387, lng: 78.484, type: ClusterType.WholeSaler, pincode: '500012' },
];

const FIRST_NAMES = [
  'Ravi', 'Suresh', 'Mahesh', 'Ramesh', 'Srinivas', 'Naveen', 'Praveen', 'Kiran', 'Anil', 'Sunil', 'Vamshi', 'Sai',
  'Harish', 'Rajesh', 'Venu', 'Prasad', 'Arjun', 'Karthik', 'Vinay', 'Manoj', 'Santosh', 'Rakesh', 'Ganesh', 'Shiva',
  'Naresh', 'Vijay', 'Ajay', 'Sandeep', 'Pavan', 'Raju', 'Lokesh', 'Bharath', 'Chandu', 'Tarun', 'Mohan', 'Nikhil',
];
const LAST_NAMES = [
  'Reddy', 'Rao', 'Kumar', 'Goud', 'Naidu', 'Yadav', 'Varma', 'Sharma', 'Chary', 'Babu', 'Prasad', 'Teja', 'Murthy',
  'Patel', 'Singh', 'Raju', 'Nayak', 'Shetty',
];
const SHOP_PREFIXES = [
  'Sri Lakshmi', 'Sri Venkateshwara', 'Sri Sai', 'Balaji', 'Durga', 'Annapurna', 'Sri Rama', 'Hanuman', 'Vijaya',
  'Ganesh', 'Kanaka Durga', 'Sai Krishna', 'Laxmi Narasimha', 'Sri Mahalakshmi', 'Om Sai', 'Siri', 'Navya', 'Tirumala',
];
const SHOP_SUFFIXES: Record<number, string[]> = {
  [BusinessType.Kirana]: ['Kirana & General Store', 'Kirana Store', 'General Store', 'Provision Stores'],
  [BusinessType.Restaurant]: ['Family Restaurant', 'Biryani House', 'Restaurant'],
  [BusinessType.TiffinCenters]: ['Tiffin Center', 'Tiffins', 'Breakfast Point'],
  [BusinessType.Bakery]: ['Bakery', 'Bakers & Sweets'],
  [BusinessType.SweetHouse]: ['Sweet House', 'Sweets'],
  [BusinessType.Supermarket]: ['Super Market', 'Mart'],
  [BusinessType.Medicals]: ['Medical & General Store', 'Medicals'],
  [BusinessType.Wholesale]: ['Wholesale Traders', 'Traders', 'Agencies'],
  [BusinessType.RiceTraders]: ['Rice Traders', 'Rice Depot'],
  [BusinessType.OilTraders]: ['Oil Traders', 'Oil Agencies'],
  [BusinessType.Caterers]: ['Caterers', 'Catering Services'],
  [BusinessType.PgHostel]: ['Mens PG', 'Ladies Hostel'],
};
const GENERAL_TYPES = [
  BusinessType.Kirana, BusinessType.Kirana, BusinessType.Kirana, BusinessType.Kirana, BusinessType.Kirana,
  BusinessType.Restaurant, BusinessType.TiffinCenters, BusinessType.Bakery, BusinessType.SweetHouse,
  BusinessType.Supermarket, BusinessType.Medicals, BusinessType.Caterers, BusinessType.PgHostel,
];
const WHOLESALE_TYPES = [BusinessType.Wholesale, BusinessType.RiceTraders, BusinessType.OilTraders];
const INTERACTION_OUTCOMES: { category: string; comments: string[] }[] = [
  { category: 'Order placed already', comments: ['Order placed', 'Placed order through app', 'Order placed for this week'] },
  { category: 'Will order in a Week', comments: ['Present customer have stock', 'Will order place tomorrow', 'Stock available, will order next week'] },
  { category: 'Not interested to buy', comments: ['Not interested', 'Buying from local distributor', 'Price is high'] },
  { category: 'Shop closed', comments: ['Shop closed', 'Owner not available'] },
  { category: 'Placed order now', comments: ['Placed order during visit', 'Order placed for oil and rice'] },
];
/** Small inline SVG "shop photos" used as interaction images (no network access needed). */
const SHOP_PHOTO_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085'];
function shopPhoto(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="222" viewBox="0 0 120 222">` +
    `<rect width="120" height="222" fill="#d9d4cc"/><rect y="150" width="120" height="72" fill="#8d8478"/>` +
    `<rect x="10" y="40" width="100" height="110" fill="#f4f1ec"/><rect x="6" y="28" width="108" height="22" fill="${color}"/>` +
    `<rect x="18" y="62" width="38" height="70" fill="#b8a98f"/><rect x="64" y="62" width="38" height="40" fill="#7fa7c4"/>` +
    `<rect x="64" y="108" width="38" height="24" fill="#c9bfae"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const SHOP_PHOTOS = SHOP_PHOTO_COLORS.map(shopPhoto);

const LEAVE_REASONS = ['Fever', 'Family function', 'Personal work', 'Going to native place', 'Medical checkup'];
const EARLY_LOGOUT_REASONS = ['Phone not working', 'Shop closed in the area', 'Feeling unwell', 'Bike puncture', 'Family emergency'];

// ---------------------------------------------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------------------------------------------
export function generateMockSeed(today = new Date()): MockSeed {
  const rnd = createRandom(20261021);
  const firestore: Record<string, Record<string, any>> = {
    SalesPerson: {},
    SalesPersonClusters: {},
    Users: {},
    Roles: {},
    pages: {},
    TasksReport: {},
    Tasks: {},
    Interactions: {},
    AttendanceReport: {},
    LeaveReport: {},
    Calendar: {},
    MessageQueueStatus: {},
  };
  const rtdb: any = { Crm: {}, Customer: {}, AppSettings: { common: { dealerNames: {} } } };
  const customers: MockCustomer[] = [];
  const usedMobiles = new Set<string>();

  const mobile = () => {
    let m = '';
    do {
      m = `${rnd.pick(['9', '8', '7', '6'])}000${rnd.digits(6)}`;
    } while (usedMobiles.has(m));
    usedMobiles.add(m);
    return m;
  };
  const personName = () => `${rnd.pick(FIRST_NAMES)} ${rnd.pick(LAST_NAMES)}`;

  // --- Dealers (RTDB AppSettings/common/dealerNames)
  const dealerId = 'DLRHYD0001';
  rtdb.AppSettings.common.dealerNames[dealerId] = { name: 'Qwipo Hyderabad', isActive: true };
  rtdb.AppSettings.common.dealerNames['DLRHYD0002'] = { name: 'Qwipo Secunderabad', isActive: true };

  // --- Permissions: pages, roles, admin user
  const pageIds = [...Object.values(PageIds), 'mtd_performance_report', 'preview_dialog'];
  const allPermissions: Record<string, any> = {};
  pageIds.forEach((pageId, index) => {
    firestore['pages'][`PAGE${pad(index + 1)}`] = { page_id: pageId, name: pageId.replace(/_/g, ' ') };
    allPermissions[pageId] = { view: true, create: true, edit: true, delete: true, import: true, export: true };
  });
  firestore['Roles']['ROLE_SALES_ADMIN'] = { name: 'Sales Admin', permissions: allPermissions };
  firestore['Users'][MOCK_ADMIN_UID] = {
    name: 'Sales Admin (Demo)',
    email: 'demo.admin@example.com',
    user_type: UserType.SupportMember,
    mobile_number: '9000000001',
    roles: ['ROLE_SALES_ADMIN'],
    extended_permissions: {},
  };
  rtdb.Crm[MOCK_ADMIN_UID] = { name: 'Sales Admin (Demo)', roleTypeId: 1, mobileNumber: '9000000001' };

  // --- Sales leads (Users.user_type 8) and sales managers (Users.user_type 2)
  const leads = Array.from({ length: 4 }, (_, i) => {
    const id = `LEAD${rnd.alnum(24)}`;
    const lead = { id, name: personName(), mobileNumber: mobile() };
    firestore['Users'][id] = { name: lead.name, user_type: UserType.SalesLead, mobile_number: lead.mobileNumber, roles: [], extended_permissions: {} };
    return lead;
  });
  const managers = Array.from({ length: 2 }, () => {
    const id = `MGR${rnd.alnum(25)}`;
    const manager = { id, name: personName(), mobileNumber: mobile() };
    firestore['Users'][id] = { name: manager.name, user_type: UserType.Dealer, mobile_number: manager.mobileNumber, roles: [], extended_permissions: {} };
    return manager;
  });

  // --- Areas (SalesPersonClusters) and customers (core DB)
  const half = 0.0045;
  const clusters = AREAS.map((area) => {
    const id = `AREA${rnd.alnum(10)}`;
    const coordinates = [
      { latitude: area.lat - half, longitude: area.lng - half },
      { latitude: area.lat - half, longitude: area.lng + half },
      { latitude: area.lat + half, longitude: area.lng + half },
      { latitude: area.lat + half, longitude: area.lng - half },
      { latitude: area.lat - half, longitude: area.lng - half },
    ];
    const typeList = area.type === ClusterType.WholeSaler ? WHOLESALE_TYPES : GENERAL_TYPES;
    const count = area.type === ClusterType.WholeSaler ? rnd.int(40, 70) : rnd.int(90, 190);
    const clusterCustomers: Record<string, { name: string }> = {};
    for (let i = 0; i < count; i++) {
      const businessType = rnd.pick(typeList);
      const suffixes = SHOP_SUFFIXES[businessType] || ['Store'];
      const owner = personName();
      const businessName = `${rnd.chance(0.25) ? owner.split(' ')[0] : rnd.pick(SHOP_PREFIXES)} ${rnd.pick(suffixes)}`;
      const customerId = rnd.chance(0.5) ? rnd.alnum(28) : rnd.hex(32);
      const lat = +(area.lat + (rnd.next() * 2 - 1) * half * 0.9).toFixed(7);
      const lng = +(area.lng + (rnd.next() * 2 - 1) * half * 0.9).toFixed(7);
      customers.push({
        id: customerId,
        businessName,
        customerName: owner.split(' ')[0],
        mobileNumber: mobile(),
        businessType,
        businessStatus: rnd.chance(0.85) ? 5 : rnd.pick([1, 2, 3, 7, 9]),
        isActive: rnd.chance(0.9) ? 1 : 0,
        lastOrderDays: rnd.pick([2, 5, 12, 25, 45, 75, 120, 400]),
        latitude: lat,
        longitude: lng,
        address: `${rnd.int(1, 20)}-${rnd.int(1, 300)}, ${area.name} Main Road, ${area.name}, Hyderabad, Telangana - ${area.pincode}`,
        areaName: area.name,
        pincode: area.pincode,
        salesPersonId: '',
        dealerId,
        companies: mockCompaniesFor(customerId),
      });
      clusterCustomers[customerId] = { name: businessName };
    }
    const created = addDays(today, -120).getTime();
    const cluster = {
      id,
      name: area.name,
      type: area.type,
      searchKey: area.name.toLowerCase(),
      customerCount: count,
      coordinates,
      createdDate: created,
      updatedDate: created,
      customers: clusterCustomers,
    };
    firestore['SalesPersonClusters'][id] = cluster;
    return cluster;
  });

  // --- Sales persons (SalesPerson collection + RTDB Customer/{id})
  const salesPersons = Array.from({ length: 36 }, (_, i) => {
    const id = rnd.hex(32);
    const name = `${personName()}${rnd.chance(0.3) ? ' Ondc' : ''}`;
    const cluster = i < clusters.length ? clusters[i] : null;
    const isActive = i < clusters.length + 2;
    const lead = i % 9 === 8 ? null : leads[i % leads.length];
    const manager = lead ? managers[i % managers.length] : null;
    const doc: any = {
      id,
      name,
      businessName: name,
      mobileNumber: Number(mobile()),
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      isActive,
      enableLogOut: false,
      userTypeId: UserType.SalesPerson,
      customerCount: cluster && isActive ? cluster.customerCount : 0,
      cluster: cluster && isActive ? { id: cluster.id, name: cluster.name } : { id: '', name: '' },
      clusterId: cluster && isActive ? cluster.id : '',
      latitude: cluster ? cluster.coordinates[0].latitude : 17.385,
      longitude: cluster ? cluster.coordinates[0].longitude : 78.4867,
      address: {
        street: 'Main Road',
        landmark: 'Near Bus Stop',
        area_code: cluster ? cluster.name : 'Abids',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'INDIA',
        pincode: '500001',
      },
    };
    if (lead) {
      doc.salesLeadId = lead.id;
      doc.salesLead = { id: lead.id, name: lead.name, mobileNumber: lead.mobileNumber };
    }
    if (manager) {
      doc.salesManagerId = manager.id;
      doc.salesManager = { id: manager.id, name: manager.name, mobileNumber: manager.mobileNumber };
    }
    firestore['SalesPerson'][id] = doc;
    rtdb.Customer[id] = { id, name, businessName: name, mobileNumber: String(doc.mobileNumber), userTypeId: 7, isActive };
    if (cluster && isActive) {
      customers.filter((c) => c.areaName === cluster.name).forEach((c) => (c.salesPersonId = id));
    }
    return { doc, cluster: cluster && isActive ? cluster : null, lead, manager };
  });

  // --- Tasks, task reports and interactions (last 21 days -> tomorrow, Sundays off)
  const now = new Date();
  for (let offset = -21; offset <= 1; offset++) {
    const day = addDays(today, offset);
    if (day.getDay() === 0) continue;
    const dateStr = ymd(day);
    const dayStart = atTime(day, 0, 0);
    salesPersons.forEach((sp, spIndex) => {
      if (!sp.cluster) return;
      const areaCustomers = customers.filter((c) => c.areaName === sp.cluster.name);
      const r = keyedRandom(`tasks|${sp.doc.id}|${dateStr}`);
      const count = Math.min(areaCustomers.length, r.int(18, 40));
      const start = r.int(0, areaCustomers.length - 1);
      const reportId = `Report_${r.digits(14)}`;
      firestore['TasksReport'][reportId] = {
        salesPersonId: sp.doc.id,
        salesPersonName: sp.doc.name,
        clusterId: sp.cluster.id,
        clusterName: sp.cluster.name,
        customerCount: count,
        taskDate: dateStr,
        taskDateTimestamp: dayStart,
        isActive: true,
        createdDate: dateStr,
      };
      // How far into the day the sales person is (past days: done, today: depends on the clock, future: nothing)
      const visitedUpTo = offset < 0 ? count : offset === 0 ? Math.max(0, Math.min(count, Math.floor((now.getHours() - 9) * 4))) : 0;
      let clock = atTime(day, 9, r.int(30, 59));
      for (let stop = 1; stop <= count; stop++) {
        const customer = areaCustomers[(start + stop) % areaCustomers.length];
        const taskId = `TASK${r.alnum(16)}`;
        const willVisit = r.chance(offset < 0 ? 0.65 : 0.9);
        const visited = stop <= visitedUpTo && willVisit;
        const task: any = {
          taskDate: dateStr,
          taskDateTimestamp: dayStart,
          createdDate: dateStr,
          customerId: customer.id,
          dealerId,
          stopNumber: stop,
          status: visited ? 2 : 99,
          interactionId: '',
          salesPersonId: sp.doc.id,
          setInfo: { setName: sp.cluster.name },
          customerInfo: {
            customerId: customer.id,
            businessName: customer.businessName,
            customerName: customer.customerName,
            mobileNumber: customer.mobileNumber,
            businessType: customer.businessType,
            address: customer.address,
            areaName: customer.areaName,
            latitude: customer.latitude,
            longitude: customer.longitude,
          },
          salesPersonInfo: { id: sp.doc.id, name: sp.doc.name, subAreaName: sp.cluster.name },
        };
        if (visited) {
          clock += r.int(4, 14) * 60000;
          const checkIn = clock;
          const duration = r.int(0, 9);
          const checkOut = checkIn + duration * 60000 + r.int(0, 59) * 1000;
          clock = checkOut;
          const outcome = r.pick(INTERACTION_OUTCOMES);
          const interactionId = r.hex(32);
          task.interactionId = interactionId;
          firestore['Interactions'][interactionId] = {
            interactionId,
            taskId,
            customerId: customer.id,
            salesPersonId: sp.doc.id,
            createdDate: dateStr,
            createdTimeStamp: checkOut,
            customerInfo: { customerId: customer.id, name: customer.businessName, mobileNumber: customer.mobileNumber },
            salesPersonInfo: {
              salesPersonId: sp.doc.id,
              name: sp.doc.name,
              mobileNumber: String(sp.doc.mobileNumber),
              businessName: sp.doc.businessName,
            },
            interactionInfo: {
              interactionId,
              comments: r.pick(outcome.comments),
              commentCategory: outcome.category,
              imageUrl: r.pick(SHOP_PHOTOS),
            },
            checkInfo: {
              checkInTime: checkIn,
              checkOutTime: duration > 0 ? checkOut : 0,
              checkInLatitude: +(customer.latitude + (r.next() - 0.5) * 0.0002).toFixed(6),
              checkInLongitude: +(customer.longitude + (r.next() - 0.5) * 0.0002).toFixed(6),
              checkOutLatitude: duration > 0 ? +(customer.latitude + (r.next() - 0.5) * 0.0002).toFixed(6) : 0,
              checkOutLongitude: duration > 0 ? +(customer.longitude + (r.next() - 0.5) * 0.0002).toFixed(6) : 0,
              checkInDistance: +(r.next() * 45).toFixed(4),
              checkOutDistance: duration > 0 ? +(r.next() * 45).toFixed(4) : 0,
            },
          };
        }
        firestore['Tasks'][taskId] = task;
      }
    });
  }

  // --- Attendance (last 45 days) and leave requests
  for (let offset = -45; offset <= 0; offset++) {
    const day = addDays(today, offset);
    if (day.getDay() === 0) continue;
    const dateStr = ymd(day);
    salesPersons.forEach((sp) => {
      if (!sp.doc.isActive) return;
      const r = keyedRandom(`attendance|${sp.doc.id}|${dateStr}`);
      const base = {
        salesPersonId: sp.doc.id,
        salesPerson: { id: sp.doc.id, name: sp.doc.name, mobileNumber: String(sp.doc.mobileNumber) },
        salesLeadId: sp.lead?.id || '',
        salesLead: sp.lead ? { id: sp.lead.id, name: sp.lead.name, mobileNumber: sp.lead.mobileNumber } : { name: '', mobileNumber: '' },
        salesManagerId: sp.manager?.id || '',
        salesManager: sp.manager ? { id: sp.manager.id, name: sp.manager.name, mobileNumber: sp.manager.mobileNumber } : { name: '', mobileNumber: '' },
        appliedOn: dateStr,
        reason: '',
      };
      if (r.chance(0.05)) {
        // Leave request for this day
        const leaveId = `LEAVE${r.digits(14)}`;
        const status = offset > -3 ? AttendanceStatus.APPLY_LEAVE : r.pick([AttendanceStatus.LEAVE_ACCEPTED, AttendanceStatus.LEAVE_ACCEPTED, AttendanceStatus.LEAVE_REJECTED]);
        const created = atTime(addDays(day, -1), r.int(8, 20), r.int(0, 59));
        firestore['LeaveReport'][leaveId] = { ...base, status, reason: r.pick(LEAVE_REASONS), createdDate: created, createdTimeStamp: atTime(day, 9, 0) };
        if (status === AttendanceStatus.LEAVE_ACCEPTED) {
          const atdId = `ATD${r.digits(14)}`;
          firestore['AttendanceReport'][atdId] = { id: atdId, leaveId, createdDate: dateStr, status, salesPersonId: sp.doc.id, createdTimeStamp: atTime(day, 9, 0) };
        }
        return;
      }
      if (r.chance(0.04)) return; // absent
      const checkIn = atTime(day, 9, r.int(0, 59), r.int(0, 59));
      const atdId = `ATD${r.digits(14)}`;
      let status = AttendanceStatus.CHECKED_OUT;
      let checkOut = atTime(day, r.int(18, 19), r.int(0, 59), r.int(0, 59));
      let reason = '';
      if (offset === 0) {
        status = AttendanceStatus.CHECKED_IN;
        checkOut = 0;
      } else if (r.chance(0.06)) {
        reason = r.pick(EARLY_LOGOUT_REASONS);
        status =
          offset > -3
            ? AttendanceStatus.REASON_FOR_EARLY_LOGOUT
            : r.pick([AttendanceStatus.REASON_FOR_EARLY_LOGOUT_ACCEPTED, AttendanceStatus.REASON_FOR_EARLY_LOGOUT_REJECTED]);
        checkOut = status === AttendanceStatus.REASON_FOR_EARLY_LOGOUT_ACCEPTED ? atTime(day, r.int(13, 16), r.int(0, 59)) : 0;
      } else if (r.chance(0.05)) {
        status = AttendanceStatus.CHECKED_IN;
        checkOut = 0;
      }
      firestore['AttendanceReport'][atdId] = {
        ...base,
        id: atdId,
        status,
        reason,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        checkInLatitude: sp.cluster ? sp.cluster.coordinates[0].latitude : 17.385,
        checkInLongitude: sp.cluster ? sp.cluster.coordinates[0].longitude : 78.4867,
        createdDate: checkIn,
        createdTimeStamp: checkIn,
      };
    });
  }

  // --- Calendar documents (Calendar/{month}{year}), working days = Monday..Saturday
  for (let year = 2023; year <= 2040; year++) {
    MONTH_NAMES.forEach((monthName, monthIndex) => {
      const days = new Date(year, monthIndex + 1, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= days; d++) {
        if (new Date(year, monthIndex, d).getDay() !== 0) workingDays++;
      }
      firestore['Calendar'][`${monthName.toLowerCase()}${year}`] = {
        month: pad(monthIndex + 1),
        monthName,
        days,
        workingDays,
        year: `${year}`,
      };
    });
  }

  return { firestore, rtdb, customers };
}
