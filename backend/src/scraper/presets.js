// Hard-coded target markets — tiered by close-rate and ROI.
// Tier 1 = highest close rate, Tier 2 = solid secondary targets.
export const PRESETS = {
  Philippines: {
    country: 'Philippines',
    countryCode: 'PH',
    tagline: 'Best volume + easiest closes',
    cities: [
      'Manila', 'Quezon City', 'Makati', 'Bonifacio Global City (Taguig)',
      'Pasig', 'Cebu City', 'Davao City', 'Iloilo City', 'Baguio',
      'Cagayan de Oro', 'Mandaue', 'Antipolo', 'Bacolod',
    ],
    niches: [
      { name: 'Real Estate Agencies & Brokers', tier: 1 },
      { name: 'Clinics (Dental / Aesthetic / Medical)', tier: 1 },
      { name: 'Construction / Contractors', tier: 1 },
      { name: 'Resorts / Boutique Hotels', tier: 2 },
      { name: 'Logistics / Freight / Export', tier: 2 },
    ],
    yellowPagesHost: 'yellow-pages.ph',
  },
  India: {
    country: 'India',
    countryCode: 'IN',
    tagline: 'Massive — bad website / no ROI market',
    cities: [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
      'Pune', 'Ahmedabad', 'Gurgaon', 'Noida', 'Jaipur', 'Chandigarh',
      'Surat', 'Lucknow', 'Indore', 'Kochi',
    ],
    niches: [
      { name: 'Coaching Institutes / Education Businesses', tier: 1 },
      { name: 'Medical Clinics / Diagnostics', tier: 1 },
      { name: 'Real Estate Developers / Brokers', tier: 1 },
      { name: 'D2C Brands (Shopify Sellers / CRO)', tier: 2 },
      { name: 'Recruitment / Staffing Agencies', tier: 2 },
    ],
    yellowPagesHost: 'justdial.com',
  },
  'South Africa': {
    country: 'South Africa',
    countryCode: 'ZA',
    tagline: 'Underrated sweet spot',
    cities: [
      'Johannesburg', 'Cape Town', 'Durban', 'Pretoria',
      'Port Elizabeth (Gqeberha)', 'Bloemfontein', 'East London',
      'Polokwane', 'Stellenbosch', 'Sandton', 'Centurion',
    ],
    niches: [
      { name: 'Law Firms', tier: 1 },
      { name: 'Security Companies', tier: 1 },
      { name: 'Construction & Engineering', tier: 1 },
      { name: 'Accounting Firms', tier: 2 },
      { name: 'Insurance Brokers', tier: 2 },
    ],
    yellowPagesHost: 'yellowpages.co.za',
  },
  UAE: {
    country: 'UAE',
    countryCode: 'AE',
    tagline: 'Where you actually make real money',
    cities: [
      'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah',
      'Fujairah', 'Dubai Marina', 'Downtown Dubai', 'Business Bay',
      'Jumeirah Lake Towers (JLT)', 'Deira', 'Al Barsha', 'Jumeirah',
    ],
    niches: [
      { name: 'Real Estate Agencies', tier: 1 },
      { name: 'Luxury Clinics / Car Rentals / Concierge', tier: 1 },
      { name: 'B2B Logistics / Trade / Consulting', tier: 1 },
    ],
    yellowPagesHost: 'yellowpages.ae',
  },
};

export const COUNTRIES = Object.keys(PRESETS);
