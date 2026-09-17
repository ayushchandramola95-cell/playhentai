export interface FAQItem {
  id: string;
  sectionId: string;
  category: string;
  question: string;
  answer: string;
  highlights?: string[];
}

export interface SectionItem {
  id: string;
  num: string;
  title: string;
}

export const SECTIONS: SectionItem[] = [
  { id: 'streaming', num: '01', title: 'Streaming & playback' },
  { id: 'content', num: '02', title: 'Uncensored & catalog' },
  { id: 'account', num: '03', title: 'Accounts & watchlist' },
  { id: 'devices', num: '04', title: 'Mobile & Smart TV' },
  { id: 'safety', num: '05', title: 'Safety & legal' },
  { id: 'support', num: '06', title: 'Still need help?' },
];

export const CATEGORIES = [
  'All',
  'Streaming & Playback',
  'Uncensored & Content',
  'Account & Watchlist',
  'Mobile & Smart TV',
  'Safety & Legal',
];

export const FAQ_DATA: FAQItem[] = [
  // 01. STREAMING & PLAYBACK
  {
    id: 'stream-free',
    sectionId: 'streaming',
    category: 'Streaming & Playback',
    question: 'Is PlayHentai completely free to use?',
    answer:
      'Yes! All anime series, 1080p HD episodes, category hubs, and streaming features on PlayHentai are 100% free with unlimited access. No credit card, deposit, or subscription is ever required.',
    highlights: ['Zero subscription fees', 'Unlimited 1080p HD video streaming', 'No hidden paywalls or credit cards'],
  },
  {
    id: 'stream-buffering',
    sectionId: 'streaming',
    category: 'Streaming & Playback',
    question: 'Why is a video buffering, failing to load, or lagging?',
    answer:
      'Video playback interruptions are usually caused by browser extensions (such as aggressive ad-blockers) or regional CDN congestion. Follow these quick troubleshooting steps:',
    highlights: [
      'Switch between video server mirrors using the server tabs below the video player.',
      'Clear your browser cache and cookies, then reload the episode page.',
      'Temporarily disable third-party extensions that may interfere with HLS video stream decoding.',
    ],
  },
  {
    id: 'stream-quality',
    sectionId: 'streaming',
    category: 'Streaming & Playback',
    question: 'What video resolutions and stream formats are supported?',
    answer:
      'PlayHentai serves adaptive HLS video streams up to full 1080p HD 60fps quality. Our HTML5 video player dynamically adjusts streaming bitrate based on your local connection speed to eliminate buffering.',
    highlights: ['Full 1080p HD stream output', 'Adaptive bitrate streaming technology', 'Global Cloudflare edge CDN distribution'],
  },
  {
    id: 'stream-mirrors',
    sectionId: 'streaming',
    category: 'Streaming & Playback',
    question: 'How do video mirror servers work?',
    answer:
      'Every episode is mirrored across redundant cloud storage nodes. If a server experiences high latency or downtime, simply select an alternative server tab below the video player for instant playback.',
    highlights: ['Redundant multi-server architecture', 'One-click mirror switching', 'Automatic failover detection'],
  },

  // 02. UNCENSORED & CONTENT
  {
    id: 'content-uncensored',
    sectionId: 'content',
    category: 'Uncensored & Content',
    question: 'What is the difference between Censored and Uncensored releases?',
    answer:
      'Uncensored titles present original unedited animation without pixelation or mosaic overlays. Censored releases retain standard Japanese broadcast pixelation. You can browse all unedited releases directly on our dedicated Uncensored page.',
    highlights: ['1080p unedited original animation', 'Dedicated /uncensored catalog hub', 'Filterable by studio, year, and genre'],
  },
  {
    id: 'content-updates',
    sectionId: 'content',
    category: 'Uncensored & Content',
    question: 'How frequently is new anime content added to PlayHentai?',
    answer:
      'Our catalog is updated daily! Newly released episodes, Blu-ray uncensored remasters, English-subtitled editions, and raw Japanese broadcasts are indexed as soon as they become available from official studios.',
    highlights: ['Daily series releases', 'Instant sitemap and search engine auto-sync', 'Subbed and original Japanese audio'],
  },
  {
    id: 'content-studios',
    sectionId: 'content',
    category: 'Uncensored & Content',
    question: 'Which animation studios are featured on PlayHentai?',
    answer:
      'We host comprehensive catalogs from top animation studios including PoRO, Bunnywalker, Mary Jane, Studio Jack, A-1 Pictures, Studio Trigger, and independent 3D creators.',
    highlights: ['PoRO, Bunnywalker, Mary Jane & more', 'Studio profiles with complete release chronologies', 'Release years spanning 2000 to 2026'],
  },
  {
    id: 'content-requests',
    sectionId: 'content',
    category: 'Uncensored & Content',
    question: 'How do I request a missing series or report a broken episode?',
    answer:
      'If an episode is missing or has audio desynchronization, use our Contact Support form with the category "Technical Support" and include the link. Our video server team will repair the stream within 12 hours.',
    highlights: ['Rapid repair response (<12 hours)', 'Dedicated community request channel in Discord', 'Daily catalog maintenance'],
  },

  // 03. ACCOUNTS & WATCHLIST
  {
    id: 'account-required',
    sectionId: 'account',
    category: 'Account & Watchlist',
    question: 'Do I need an account to watch episodes on PlayHentai?',
    answer:
      'No account is required to stream any video on our site. You can browse anonymously as a guest with full access. However, creating a free account unlocks personalized features including saving titles to your Watchlist and tracking Watch History.',
    highlights: ['Instant guest viewing without login', 'Optional free profile creation', 'Cross-device Watchlist synchronization'],
  },
  {
    id: 'account-features',
    sectionId: 'account',
    category: 'Account & Watchlist',
    question: 'How does the Watchlist and Watch History feature work?',
    answer:
      'When logged in, clicking the "+ Watchlist" button on any series card saves it to your personal library. Your Watch History automatically logs watched episodes so you can resume playback right where you left off across any device.',
    highlights: ['One-click bookmarks', 'Auto-resume playback position', 'Private and encrypted profile storage'],
  },
  {
    id: 'account-security',
    sectionId: 'account',
    category: 'Account & Watchlist',
    question: 'How is my account data secured?',
    answer:
      'We store only your email and a salted, cryptographically hashed password (Argon2/Bcrypt). We never share, sell, or monetize user data. All web traffic is protected with TLS 1.3 encryption.',
    highlights: ['Argon2/Bcrypt salted password hashing', 'No personal data sales to advertisers', 'End-to-end TLS 1.3 encryption'],
  },

  // 04. MOBILE & SMART TV
  {
    id: 'devices-mobile',
    sectionId: 'devices',
    category: 'Mobile & Smart TV',
    question: 'Can I watch PlayHentai on mobile devices or Smart TVs?',
    answer:
      'Yes! PlayHentai is fully responsive and optimized for mobile browsers (iOS Safari, Android Chrome), tablets, and Smart TVs. You can cast video streams using Apple AirPlay or Google Chromecast directly from the video player.',
    highlights: ['Native Apple AirPlay support', 'Google Chromecast casting', 'Touch-friendly mobile responsive layout'],
  },
  {
    id: 'devices-pwa',
    sectionId: 'devices',
    category: 'Mobile & Smart TV',
    question: 'Is there an app or home-screen shortcut available?',
    answer:
      'Yes! PlayHentai is built as a Progressive Web App (PWA). On mobile, tap "Add to Home Screen" in your browser menu (or use the "Install Web App" button in our footer) for a clean, full-screen standalone app experience.',
    highlights: ['Progressive Web App (PWA) support', 'One-tap home screen installation', 'Full-screen app viewing mode'],
  },

  // 05. SAFETY & LEGAL
  {
    id: 'safety-age',
    sectionId: 'safety',
    category: 'Safety & Legal',
    question: 'What is the age requirement to access PlayHentai?',
    answer:
      'You must be at least 18 years of age (or the legal age of majority in your country or jurisdiction, whichever is higher) to access or view content on PlayHentai. We are officially labeled with the RTA (Restricted To Adults) meta tag.',
    highlights: ['Strict 18+ age requirement', 'RTA (Restricted To Adults) certified tag', 'Compatible with parental filtering software'],
  },
  {
    id: 'safety-dmca',
    sectionId: 'safety',
    category: 'Safety & Legal',
    question: 'How does PlayHentai handle copyright and DMCA takedowns?',
    answer:
      'PlayHentai adheres strictly to the Digital Millennium Copyright Act (17 U.S.C. § 512). Copyright holders can submit statutory takedown requests via our interactive DMCA Portal, which are processed expeditiously.',
    highlights: ['Expedited DMCA notice processing (<24 hours)', 'Interactive statutory takedown form', 'Strict repeat infringer termination policy'],
  },
  {
    id: 'safety-indie',
    sectionId: 'safety',
    category: 'Safety & Legal',
    question: 'I am an independent animator or doujin artist. How do I request a removal?',
    answer:
      'We have a dedicated Fast-Track Content Removal Portal for indie creators. You do not need formal US legal paperwork; simply provide your public creator profile (Pixiv/X/DLsite) and we will delist your work within 24 hours.',
    highlights: ['Hassle-free courtesy takedowns', 'No complex legal paperwork required', 'Direct creator support channel'],
  },
];
