import type { Locale } from "./types.js";

const strings = {
  en: {
    gameTitle: "Springbok Rush",
    balance: "Balance",
    bet: "Bet",
    win: "Win",
    spin: "SPIN",
    stop: "STOP",
    auto: "AUTO",
    turbo: "TURBO",
    sound: "Sound",
    paytable: "Paytable",
    rules: "Rules",
    session: "Session",
    freeSpins: "Free Spins",
    rtp: "RTP",
    demoBanner: "DEMO MODE — No real money. Free-play only.",
    ageGate: "18+ Only. Please gamble responsibly.",
    rgLink: "Responsible Gambling",
    spins: "Spins",
    totalBet: "Total bet",
    totalWin: "Total win",
    close: "Close",
    language: "Language",
    howToPlay: "How to play",
    rulesBody:
      "Select your bet in ZAR, press SPIN. Wins pay left-to-right on active paylines. Wild substitutes for all symbols except Scatter. 3+ Scatters award free spins. This is a demo build for licensed-operator integration — not a real-money product.",
    paylineHint: "Paylines: 20 fixed · Currency: ZAR",
    insufficient: "Insufficient demo balance",
    freeSpinWin: "FREE SPINS!",
    reducedMotion: "Reduced motion",
    maxWinStop: "Stop if single win ≥",
    balanceStop: "Stop if balance ≤",
    autoSpins: "Auto spins",
    startAuto: "Start autoplay",
    footerLegal:
      "Demo software for portfolio / B2B integration. Not licensed for real-money wagering in South Africa.",
  },
  zu: {
    gameTitle: "Springbok Rush",
    balance: "Ibhalansi",
    bet: "Ukubheja",
    win: "Ukunqoba",
    spin: "PHENDULA",
    stop: "MISA",
    auto: "AUTO",
    turbo: "TURBO",
    sound: "Umsindo",
    paytable: "Ithebula",
    rules: "Imithetho",
    session: "Iseshini",
    freeSpins: "Ama-spin amahhala",
    rtp: "RTP",
    demoBanner: "IMODE YE-DEMO — Akukho imali yangempela.",
    ageGate: "18+ Kuphela. Dlala ngokucophelela.",
    rgLink: "Ukugembula okunomqondo",
    spins: "Ama-spin",
    totalBet: "Isamba sokubheja",
    totalWin: "Isamba sokunqoba",
    close: "Vala",
    language: "Ulimi",
    howToPlay: "Indlela yokudlala",
    rulesBody:
      "Khetha ukubheja kwakho nge-ZAR, cindezela SPIN. Ukunqoba kukhokha kwesokunxele kuya kwesokudla. I-Wild ithatha indawo yazo zonke izimpawu ngaphandle kwe-Scatter. Ama-Scatter angu-3+ anikeza ama-spin amahhala. Lona umdlalo we-demo — hhayi umkhiqizo wemali yangempela.",
    paylineHint: "Amalayini: 20 · Imali: ZAR",
    insufficient: "Ibhalansi ye-demo ayenele",
    freeSpinWin: "AMA-SPIN AMAHHALA!",
    reducedMotion: "Ukunyakaza okuncane",
    maxWinStop: "Misa uma ukunqoba ≥",
    balanceStop: "Misa uma ibhalansi ≤",
    autoSpins: "Ama-spin okuzenzekelayo",
    startAuto: "Qala autoplay",
    footerLegal:
      "Isoftware ye-demo ye-portfolio / B2B. Ayinalayisense yokugembula ngemali eNingizimu Afrika.",
  },
} as const;

export type I18nKey = keyof (typeof strings)["en"];

export function t(locale: Locale, key: I18nKey): string {
  return strings[locale][key] ?? strings.en[key];
}

export function getStrings(locale: Locale) {
  return strings[locale];
}
