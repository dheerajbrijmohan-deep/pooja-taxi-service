import { EclipticGeoMoon, SunPosition } from "astronomy-engine";

const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami",
  "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
];
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
const YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula",
  "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];
const MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)"];
const VARAS = ["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara"];

const mod360 = (x) => ((x % 360) + 360) % 360;

// Lahiri ayanamsa: ~23.853° at J2000, drifting ~50.29" per year.
function lahiriAyanamsa(date) {
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
  return 23.853 + (50.29 / 3600) * years;
}

function tithiName(n) {
  if (n === 15) return "Purnima";
  if (n === 30) return "Amavasya";
  return TITHIS[(n - 1) % 15];
}

export function getPanchang(date = new Date()) {
  const ayanamsa = lahiriAyanamsa(date);
  const sunLon = mod360(SunPosition(date).elon - ayanamsa);
  const moonLon = mod360(EclipticGeoMoon(date).lon - ayanamsa);

  const elongation = mod360(moonLon - sunLon);
  const tithiNo = Math.floor(elongation / 12) + 1; // 1..30
  const paksha = tithiNo <= 15 ? "Shukla Paksha" : "Krishna Paksha";

  const star = 360 / 27;
  const nakshatra = NAKSHATRAS[Math.floor(moonLon / star)];
  const yoga = YOGAS[Math.floor(mod360(moonLon + sunLon) / star)];

  const k = Math.floor(elongation / 6); // 0..59
  let karana;
  if (k === 0) karana = "Kimstughna";
  else if (k === 57) karana = "Shakuni";
  else if (k === 58) karana = "Chatushpada";
  else if (k === 59) karana = "Naga";
  else karana = MOVABLE_KARANAS[(k - 1) % 7];

  return {
    tithi: tithiName(tithiNo),
    paksha,
    nakshatra,
    yoga,
    karana,
    vara: VARAS[date.getDay()],
  };
}
