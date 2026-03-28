require("dotenv").config();

const connectDB = require("../config/db");
const ContentPage = require("../models/ContentPage");

const DEFAULT_CONTENT = {
  home: {
    hero: {
      backgroundImage: null,
      heading: "THE KINETIC",
      accentWord: "MONOLITH",
      headingSuffix: "OF DUBAI PERFORMANCE",
      ctaPrimaryText: "Book Now",
      ctaPrimaryLink: "/booking",
      ctaSecondaryText: "WhatsApp Us",
      ctaSecondaryLink: "https://wa.me/971000000000",
    },
    pillars: {
      items: [
        {
          icon: "precision_manufacturing",
          title: "Precision",
          description: "Aerospace-grade diagnostic tools and master technicians calibrated for millimetric accuracy.",
        },
        {
          icon: "thermostat",
          title: "Dubai Heat Optimized",
          description: "Engineered thermal management systems designed to conquer extreme desert climates.",
        },
      ],
    },
    beforeAfter: {
      heading: "Paint",
      accentWord: "Restoration",
      subtitle: "Swipe to witness the evolution from desert-worn to showroom-flawless.",
      beforeImage: null,
      afterImage: null,
    },
    services: {
      items: [
        {
          icon: "settings_input_component",
          title: "Mechanical & Electrical",
          description: "Complete engine overhauls and diagnostic electrical operations.",
          slug: "mechanical-electrical",
        },
        {
          icon: "speed",
          title: "ECU Tuning",
          description: "Proprietary performance maps calibrated for local fuel and heat.",
          slug: "ecu-programming",
        },
      ],
    },
    testimonials: [
      {
        id: 1,
        initials: "KA",
        name: "Khalid Al-Maktoum",
        quote: "Black Bullet transformed my 911 Turbo S. Their ECU map is flawless.",
        rating: 5,
        highlight: true,
      },
    ],
    map: {
      backgroundImage: null,
      title: "Visit the Forge",
      addressText: "Al Quoz Industrial Area 3, Dubai, UAE.\nMon - Sat: 09:00 - 20:00",
      mapsLink: "https://maps.google.com",
      buttonText: "Get Directions",
    },
  },
  services: {
    hero: {
      label: "Mastering Precision",
      heading: "Performance",
      accentWord: "Solutions",
      description: "From Stage 3 ECU calibrations to complete mechanical overhauls.",
    },
    servicesGrid: [
      {
        num: "01",
        title: "ECU Programming",
        img: "/images/service-ecu.jpg",
        alt: "High-tech engine control unit with wiring",
        desc: "Bespoke engine remapping for ultimate power and efficiency.",
        slug: "ecu-programming",
      },
    ],
    ecuDetail: {
      label: "Service Focus",
      heading: "ECU Programming & Diagnostics",
      para1: "Custom calibration designed for each vehicle's configuration.",
      para2: "State-of-the-art diagnostics to unlock safe, reliable power.",
      features: [
        { title: "Dyno Proven", desc: "Every tune is validated under load." },
        { title: "OEM+ Reliability", desc: "Factory safety protocols are respected." },
      ],
    },
    cta: {
      heading: "Ready to",
      accentWord: "Elevate",
      suffix: "Your Drive?",
      primaryText: "Schedule Consultation",
      secondaryText: "View Pricing",
    },
  },
  gallery: {
    header: {
      heading: "THE PROJECT",
      accentWord: "ARCHIVE",
      subtitle: "Witness the evolution of performance across our top Dubai builds.",
    },
    featured: {
      image: null,
      title: 'F8 TRIBUTO "ONYX"',
      subtitle: "Full Satin Black Wrap & Stage 2 Tune",
      hpLabel: "Performance Gains",
      hpValue: "+145 HP",
      hpDetail: "ECU Remapping & Exhaust",
      torqueLabel: "Torque Increase",
      torqueValue: "850 NM",
      torqueDetail: "Precision Tuning",
    },
    categories: ["All Projects", "Detailing", "Wrapping", "Performance"],
    gridItems: [
      {
        src: "/images/gallery-porsche.jpg",
        alt: "Silver Porsche 911 GT3 driving",
        title: "Track Precision Setup",
        subtitle: "Porsche 911 GT3",
        className: "masonry-item-tall",
      },
    ],
    cta: {
      heading: "Ready to transform your machine into a",
      accentWord: "masterpiece?",
      primaryText: "Start Custom Project",
      secondaryText: "View Pricing",
    },
  },
  blog: {
    featuredArticle: {
      image: null,
      category: "Engineering",
      date: "June 24, 2024",
      title: "The Future of ECU Remapping:",
      accentPhrase: "Beyond The Dyno",
      authorName: "Khalid Al-Mansouri",
      authorTitle: "Chief Performance Architect",
    },
    articleBody: {
      leadQuote: "Horsepower is no longer just a number; it is precision software engineering.",
      para1: "ECU remapping has evolved from simple chip tuning to multidimensional science.",
      para2: "We analyze thermal dynamics, fuel characteristics, and component tolerances.",
      calloutTitle: "Key Engineering Focus: Thermal Mitigation",
      para3: "Modern performance depends on software-first calibration strategy.",
    },
    relatedArticles: [
      {
        img: "/images/blog-car-night.jpg",
        alt: "Black sleek luxury supercar parked under city lights",
        category: "Custom Projects",
        title: "The Art of the Bespoke Exhaust",
        desc: "Comparing Grade 5 Titanium versus Inconel alloys.",
      },
    ],
    categories: [
      { name: "Tuning Guides", count: 14 },
      { name: "Project Cars", count: 8 },
      { name: "Maintenance", count: 21 },
      { name: "Industry News", count: 5 },
    ],
    recentPosts: [
      { category: "Maintenance", title: "Preparing your car for Dubai summer" },
      { category: "Engineering", title: "Aerodynamic efficiency in body kits" },
    ],
    newsletter: {
      title: "Performance Intel",
      description: "Get the latest engineering insights and tuning updates.",
    },
  },
  settings: {
    whatsappNumber: "971000000000",
    seoTitle: "Black Bullet Garage Performance | Dubai",
    metaDescription:
      "The pinnacle of performance tuning and aesthetic restoration in Dubai. ECU remapping, detailing, PPF, and bespoke automotive engineering.",
    footerTagline:
      "The pinnacle of performance tuning and aesthetic restoration in Dubai. Driven by precision, forged in heat.",
    copyrightText: "© 2024 BLACK BULLET GARAGE PERFORMANCE DUBAI. ALL RIGHTS RESERVED.",
    mapsEmbedUrl: "https://www.google.com/maps/embed?pb=example",
    slotDuration: 30,
    workingHours: [
      { day: "Monday", open: "09:00", close: "20:00", closed: false },
      { day: "Tuesday", open: "09:00", close: "20:00", closed: false },
      { day: "Wednesday", open: "09:00", close: "20:00", closed: false },
      { day: "Thursday", open: "09:00", close: "20:00", closed: false },
      { day: "Friday", open: "09:00", close: "20:00", closed: false },
      { day: "Saturday", open: "09:00", close: "20:00", closed: false },
      { day: "Sunday", open: "", close: "", closed: true },
    ],
  },
};

const seedContentPages = async () => {
  await connectDB();

  const pageKeys = Object.keys(DEFAULT_CONTENT);
  for (const pageKey of pageKeys) {
    await ContentPage.findOneAndUpdate(
      { pageKey },
      { $set: { data: DEFAULT_CONTENT[pageKey], updatedBy: null }, $setOnInsert: { pageKey } },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
  }

  console.log(`Seeded content pages: ${pageKeys.join(", ")}`);
  process.exit(0);
};

seedContentPages().catch((error) => {
  console.error("Failed to seed content pages:", error.message);
  process.exit(1);
});
