// Hard-coded target markets the user requested.
export const PRESETS = {
  Philippines: {
    country: 'Philippines',
    countryCode: 'PH',
    niches: [
      'Real Estate Agencies & Brokers',
      'Dental / Aesthetic / Medical Clinics',
      'Construction / Contractors',
      'Resorts / Boutique Hotels',
      'Logistics / Freight / Export',
    ],
    yellowPagesHost: 'yellow-pages.ph',
  },
  India: {
    country: 'India',
    countryCode: 'IN',
    niches: [
      'Coaching Institutes / Education Businesses',
      'Medical Clinics / Diagnostics',
      'Real Estate Developers / Brokers',
      'Recruitment / Staffing Agencies',
    ],
    yellowPagesHost: 'justdial.com',
  },
  'South Africa': {
    country: 'South Africa',
    countryCode: 'ZA',
    niches: [
      'Law Firms',
      'Security Companies',
      'Construction & Engineering',
      'Accounting Firms',
      'Insurance Brokers',
    ],
    yellowPagesHost: 'yellowpages.co.za',
  },
  UAE: {
    country: 'UAE',
    countryCode: 'AE',
    niches: [
      'Real Estate Agencies',
      'Luxury Clinics / Car Rentals / Concierge',
      'B2B Logistics / Trade / Consulting',
    ],
    yellowPagesHost: 'yellowpages-uae.com',
  },
};

export const COUNTRIES = Object.keys(PRESETS);
