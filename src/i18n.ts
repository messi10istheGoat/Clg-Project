import { HazardCategory, HazardSeverity, Language, ReportStatus } from './types';

export const UI_TEXT = {
  en: {
    appName: 'SYLHET LIVE',
    appSub: 'Waterlogging & Road Hazard Command Map',
    liveBadge: 'LIVE SCC TELEMETRY',
    navMap: 'Live Map',
    navRoutes: 'Safe Route',
    navHydrology: 'Surma & Rain',
    navAnalytics: 'Ward Stats',
    navEmergency: 'SOS & Control',
    reportBtn: 'Report Hazard',
    searchPlaceholder: 'Search Zindabazar, Upashahar, SUST, Taltola...',
    activeIncidents: 'Active Hazards',
    surmaGauge: 'Surma (Sylhet)',
    rain24h: '24h Rain',
    cherrapunjiRain: 'Cherrapunji',
    filterAll: 'All',
    filterWater: 'Waterlogging',
    filterManhole: 'Open Manhole',
    filterPothole: 'Potholes',
    filterRoadwork: 'Roadwork',
    filterTree: 'Fallen Tree',
    showResolved: 'Include Resolved',
    pickOnMapPrompt: 'Click anywhere on the Sylhet map to place pin',
    cancelPin: 'Cancel Pin Mode',
    confirmStillHere: 'Still Here',
    markCleared: 'Road Cleared',
    verifiedOfficial: 'SCC Verified',
    communityVerified: 'Community Verified',
    crewDispatched: 'Drainage Crew On-Site',
    depthLabel: 'Water Depth',
    passabilityCheck: 'Vehicle Passability',
    commentsTitle: 'Live Commuter Field Updates',
    postUpdate: 'Post Update',
    routePlannerTitle: 'Smart Sylhet Flood-Safe Route',
    originLabel: 'Start Point (Origin)',
    destLabel: 'Destination',
    selectVehicle: 'Your Vehicle / Mode',
    calculateRoute: 'Find Safe Route',
    safeRecommended: 'Recommended Safe Route',
    normalShortcut: 'Standard Route (Flooded/Risky)',
    mapLayers: 'Map Layers'
  },
  bn: {
    appName: 'সিলেট লাইভ',
    appSub: 'জলাবদ্ধতা ও সড়ক ঝুঁকি মানচিত্র',
    liveBadge: 'লাইভ সিসিক টেলিমেট্রি',
    navMap: 'লাইভ ম্যাপ',
    navRoutes: 'নিরাপদ রুট',
    navHydrology: 'সুরমা ও বৃষ্টি',
    navAnalytics: 'ওয়ার্ড পরিসংখ্যান',
    navEmergency: 'জরুরি ও কন্ট্রোল',
    reportBtn: 'রিপোর্ট করুন',
    searchPlaceholder: 'জিন্দাবাজার, উপশহর, শাবিপ্রবি, তালতলা খুঁজুন...',
    activeIncidents: 'সক্রিয় ঝুঁকি',
    surmaGauge: 'সুরমা (চাঁদনীঘাট)',
    rain24h: '২৪ ঘণ্টা বৃষ্টি',
    cherrapunjiRain: 'চেরাপুঞ্জি উজান',
    filterAll: 'সবগুলো',
    filterWater: 'জলাবদ্ধতা',
    filterManhole: 'খোলা ম্যানহোল',
    filterPothole: 'ভাঙা গর্ত',
    filterRoadwork: 'সড়ক সংস্কার',
    filterTree: 'ভেঙে পড়া গাছ',
    showResolved: 'সমাধানকৃত দেখান',
    pickOnMapPrompt: 'পিন বসাতে সিলেট মানচিত্রের যেকোনো স্থানে ক্লিক করুন',
    cancelPin: 'বাতিল করুন',
    confirmStillHere: 'এখনও আছে',
    markCleared: 'পানি সরেছে',
    verifiedOfficial: 'সিসিক যাচাইকৃত',
    communityVerified: 'নাগরিক যাচাইকৃত',
    crewDispatched: 'সিসিক টিম কর্মরত',
    depthLabel: 'পানির গভীরতা',
    passabilityCheck: 'যানবাহন চলাচল উপযোগিতা',
    commentsTitle: 'যাত্রীদের লাইভ আপডেট',
    postUpdate: 'মন্তব্য পাঠান',
    routePlannerTitle: 'স্মার্ট নিরাপদ বিকল্প রুট প্ল্যানার',
    originLabel: 'যাত্রা শুরুর স্থান',
    destLabel: 'গন্তব্যস্থল',
    selectVehicle: 'যানবাহন নির্বাচন করুন',
    calculateRoute: 'নিরাপদ রুট খুঁজুন',
    safeRecommended: 'প্রস্তাবিত নিরাপদ রুট',
    normalShortcut: 'স্বাভাবিক রুট (ঝুঁকিপূর্ণ)',
    mapLayers: 'মানচিত্র লেয়ার'
  }
} as const;

export const CATEGORY_META: Record<
  HazardCategory,
  { labelEn: string; labelBn: string; shortEn: string; color: string; bgClass: string }
> = {
  waterlogging: {
    labelEn: 'Waterlogging / Submerged Road',
    labelBn: 'জলাবদ্ধতা / ডুবন্ত সড়ক',
    shortEn: 'Waterlogging',
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
  },
  open_manhole: {
    labelEn: 'Uncovered Manhole / Open Drain',
    labelBn: 'খোলা ম্যানহোল / অরক্ষিত ড্রেন',
    shortEn: 'Open Manhole',
    color: '#f43f5e',
    bgClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35'
  },
  pothole: {
    labelEn: 'Submerged Pothole / Road Crater',
    labelBn: 'পানির নিচে গর্ত / ভাঙা সড়ক',
    shortEn: 'Deep Pothole',
    color: '#f97316',
    bgClass: 'bg-orange-500/15 text-orange-300 border-orange-500/35'
  },
  road_construction: {
    labelEn: 'Road Excavation / Drain Work',
    labelBn: 'সড়ক খনন / ড্রেন সংস্কার কাজ',
    shortEn: 'Drain/Road Work',
    color: '#eab308',
    bgClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/35'
  },
  fallen_tree: {
    labelEn: 'Fallen Tree / Downed Cable',
    labelBn: 'গাছ উপড়ে পড়া / ঝুলন্ত তার',
    shortEn: 'Tree / Cable',
    color: '#a855f7',
    bgClass: 'bg-purple-500/15 text-purple-300 border-purple-500/35'
  },
  traffic_gridlock: {
    labelEn: 'Stranded Vehicles / Gridlock',
    labelBn: 'আটকে পড়া যানবাহন / তীব্র যানজট',
    shortEn: 'Gridlock',
    color: '#ec4899',
    bgClass: 'bg-pink-500/15 text-pink-300 border-pink-500/35'
  }
};

export const SEVERITY_META: Record<
  HazardSeverity,
  { labelEn: string; labelBn: string; hex: string; badgeClass: string; ringHex: string }
> = {
  critical: {
    labelEn: 'Critical / Impassable',
    labelBn: 'মারাত্মক / চলাচল বন্ধ',
    hex: '#ef4444',
    ringHex: 'rgba(239, 68, 68, 0.55)',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40'
  },
  high: {
    labelEn: 'High Hazard',
    labelBn: 'উচ্চ ঝুঁকি',
    hex: '#f97316',
    ringHex: 'rgba(249, 115, 22, 0.45)',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },
  moderate: {
    labelEn: 'Moderate Caution',
    labelBn: 'মাঝারি সতর্কতা',
    hex: '#eab308',
    ringHex: 'rgba(234, 179, 8, 0.35)',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  low: {
    labelEn: 'Minor / Receding',
    labelBn: 'স্বল্প / পানি কমছে',
    hex: '#06b6d4',
    ringHex: 'rgba(6, 182, 212, 0.3)',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  }
};

export const STATUS_META: Record<
  ReportStatus,
  { labelEn: string; labelBn: string; badgeClass: string }
> = {
  active: {
    labelEn: 'Active Hazard',
    labelBn: 'সক্রিয় ঝুঁকি',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30'
  },
  monitoring: {
    labelEn: 'Receding / Monitoring',
    labelBn: 'পানি কমছে / পর্যবেক্ষণে',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  resolved: {
    labelEn: 'Cleared / Resolved',
    labelBn: 'সমাধানকৃত / পরিষ্কার',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  }
};

export function formatRelativeTime(iso: string, lang: Language = 'en'): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return lang === 'bn' ? 'এইমাত্র' : 'Just now';
  if (mins < 60) return lang === 'bn' ? `${mins} মিনিট আগে` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'bn' ? `${hrs} ঘণ্টা আগে` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return lang === 'bn' ? `${days} দিন আগে` : `${days}d ago`;
}

export function describeWaterDepth(cm: number, lang: Language = 'en'): string {
  if (cm <= 0) return lang === 'bn' ? 'শুকনো / পানি নেই' : 'Dry / Surface Hazard';
  if (cm < 15) return lang === 'bn' ? `${cm} সেমি (গোড়ালির নিচে)` : `${cm} cm (Ankle-level)`;
  if (cm < 30) return lang === 'bn' ? `${cm} সেমি (হাঁটুর নিচে — সিএনজি ঝুঁকি)` : `${cm} cm (Shin-deep • CNG Stall Risk)`;
  if (cm < 48) return lang === 'bn' ? `${cm} সেমি (হাঁটুসমান)` : `${cm} cm (Knee-deep • High Risk)`;
  return lang === 'bn' ? `${cm} সেমি (কোমরসমান — সড়ক বন্ধ)` : `${cm} cm (Waist-deep • Impassable)`;
}
