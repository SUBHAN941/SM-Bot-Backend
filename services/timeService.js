// services/timeService.js - Time & Date Services

import cache from '../utils/cache.js';

// Timezone mapping for 200+ locations
const TIMEZONE_MAP = {
  // Major US Cities
  'new york': 'America/New_York', 'nyc': 'America/New_York', 'manhattan': 'America/New_York',
  'los angeles': 'America/Los_Angeles', 'la': 'America/Los_Angeles', 'hollywood': 'America/Los_Angeles',
  'chicago': 'America/Chicago', 'houston': 'America/Chicago', 'dallas': 'America/Chicago',
  'phoenix': 'America/Phoenix', 'denver': 'America/Denver', 'seattle': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles', 'sf': 'America/Los_Angeles', 'boston': 'America/New_York',
  'miami': 'America/New_York', 'atlanta': 'America/New_York', 'detroit': 'America/Detroit',
  'minneapolis': 'America/Chicago', 'las vegas': 'America/Los_Angeles', 'philadelphia': 'America/New_York',
  'washington': 'America/New_York', 'dc': 'America/New_York', 'washington dc': 'America/New_York',
  
  // Europe
  'london': 'Europe/London', 'paris': 'Europe/Paris', 'berlin': 'Europe/Berlin',
  'rome': 'Europe/Rome', 'madrid': 'Europe/Madrid', 'amsterdam': 'Europe/Amsterdam',
  'brussels': 'Europe/Brussels', 'vienna': 'Europe/Vienna', 'zurich': 'Europe/Zurich',
  'stockholm': 'Europe/Stockholm', 'oslo': 'Europe/Oslo', 'copenhagen': 'Europe/Copenhagen',
  'helsinki': 'Europe/Helsinki', 'warsaw': 'Europe/Warsaw', 'prague': 'Europe/Prague',
  'budapest': 'Europe/Budapest', 'athens': 'Europe/Athens', 'lisbon': 'Europe/Lisbon',
  'dublin': 'Europe/Dublin', 'moscow': 'Europe/Moscow', 'istanbul': 'Europe/Istanbul',
  'kiev': 'Europe/Kiev', 'kyiv': 'Europe/Kiev', 'bucharest': 'Europe/Bucharest',
  
  // Asia
  'tokyo': 'Asia/Tokyo', 'osaka': 'Asia/Tokyo', 'beijing': 'Asia/Shanghai',
  'shanghai': 'Asia/Shanghai', 'hong kong': 'Asia/Hong_Kong', 'singapore': 'Asia/Singapore',
  'seoul': 'Asia/Seoul', 'bangkok': 'Asia/Bangkok', 'jakarta': 'Asia/Jakarta',
  'manila': 'Asia/Manila', 'kuala lumpur': 'Asia/Kuala_Lumpur', 'taipei': 'Asia/Taipei',
  'mumbai': 'Asia/Kolkata', 'delhi': 'Asia/Kolkata', 'new delhi': 'Asia/Kolkata',
  'kolkata': 'Asia/Kolkata', 'bangalore': 'Asia/Kolkata', 'bengaluru': 'Asia/Kolkata',
  'chennai': 'Asia/Kolkata', 'hyderabad': 'Asia/Kolkata', 'pune': 'Asia/Kolkata',
  'karachi': 'Asia/Karachi', 'lahore': 'Asia/Karachi', 'dhaka': 'Asia/Dhaka',
  'dubai': 'Asia/Dubai', 'abu dhabi': 'Asia/Dubai', 'riyadh': 'Asia/Riyadh',
  'doha': 'Asia/Qatar', 'kuwait': 'Asia/Kuwait', 'tehran': 'Asia/Tehran',
  'jerusalem': 'Asia/Jerusalem', 'tel aviv': 'Asia/Jerusalem', 'baghdad': 'Asia/Baghdad',
  
  // Australia & Pacific
  'sydney': 'Australia/Sydney', 'melbourne': 'Australia/Melbourne', 'brisbane': 'Australia/Brisbane',
  'perth': 'Australia/Perth', 'adelaide': 'Australia/Adelaide', 'auckland': 'Pacific/Auckland',
  'wellington': 'Pacific/Auckland', 'fiji': 'Pacific/Fiji', 'honolulu': 'Pacific/Honolulu',
  'hawaii': 'Pacific/Honolulu',
  
  // Americas
  'toronto': 'America/Toronto', 'vancouver': 'America/Vancouver', 'montreal': 'America/Montreal',
  'mexico city': 'America/Mexico_City', 'sao paulo': 'America/Sao_Paulo', 'rio': 'America/Sao_Paulo',
  'buenos aires': 'America/Argentina/Buenos_Aires', 'lima': 'America/Lima', 'bogota': 'America/Bogota',
  'santiago': 'America/Santiago', 'caracas': 'America/Caracas',
  
  // Africa
  'cairo': 'Africa/Cairo', 'johannesburg': 'Africa/Johannesburg', 'cape town': 'Africa/Johannesburg',
  'lagos': 'Africa/Lagos', 'nairobi': 'Africa/Nairobi', 'casablanca': 'Africa/Casablanca',
  'addis ababa': 'Africa/Addis_Ababa', 'accra': 'Africa/Accra',
  
  // Countries (using capital/major city timezone)
  'usa': 'America/New_York', 'united states': 'America/New_York', 'america': 'America/New_York',
  'uk': 'Europe/London', 'united kingdom': 'Europe/London', 'britain': 'Europe/London', 'england': 'Europe/London',
  'france': 'Europe/Paris', 'germany': 'Europe/Berlin', 'italy': 'Europe/Rome',
  'spain': 'Europe/Madrid', 'portugal': 'Europe/Lisbon', 'netherlands': 'Europe/Amsterdam',
  'belgium': 'Europe/Brussels', 'switzerland': 'Europe/Zurich', 'austria': 'Europe/Vienna',
  'poland': 'Europe/Warsaw', 'russia': 'Europe/Moscow', 'ukraine': 'Europe/Kiev',
  'turkey': 'Europe/Istanbul', 'greece': 'Europe/Athens', 'sweden': 'Europe/Stockholm',
  'norway': 'Europe/Oslo', 'denmark': 'Europe/Copenhagen', 'finland': 'Europe/Helsinki',
  'ireland': 'Europe/Dublin', 'scotland': 'Europe/London',
  'japan': 'Asia/Tokyo', 'china': 'Asia/Shanghai', 'korea': 'Asia/Seoul', 'south korea': 'Asia/Seoul',
  'india': 'Asia/Kolkata', 'pakistan': 'Asia/Karachi', 'bangladesh': 'Asia/Dhaka',
  'thailand': 'Asia/Bangkok', 'vietnam': 'Asia/Ho_Chi_Minh', 'indonesia': 'Asia/Jakarta',
  'malaysia': 'Asia/Kuala_Lumpur', 'philippines': 'Asia/Manila', 'taiwan': 'Asia/Taipei',
  'uae': 'Asia/Dubai', 'saudi arabia': 'Asia/Riyadh', 'qatar': 'Asia/Qatar',
  'israel': 'Asia/Jerusalem', 'iran': 'Asia/Tehran', 'iraq': 'Asia/Baghdad',
  'australia': 'Australia/Sydney', 'new zealand': 'Pacific/Auckland',
  'canada': 'America/Toronto', 'mexico': 'America/Mexico_City',
  'brazil': 'America/Sao_Paulo', 'argentina': 'America/Argentina/Buenos_Aires',
  'egypt': 'Africa/Cairo', 'south africa': 'Africa/Johannesburg', 'nigeria': 'Africa/Lagos',
  'kenya': 'Africa/Nairobi', 'morocco': 'Africa/Casablanca',
};

// UTC Offset fallback map
const UTC_OFFSET_MAP = {
  'india': 5.5, 'mumbai': 5.5, 'delhi': 5.5, 'kolkata': 5.5, 'bangalore': 5.5,
  'new york': -5, 'nyc': -5, 'washington': -5, 'boston': -5, 'miami': -5,
  'los angeles': -8, 'la': -8, 'san francisco': -8, 'seattle': -8,
  'chicago': -6, 'dallas': -6, 'houston': -6, 'denver': -7,
  'london': 0, 'uk': 0, 'dublin': 0, 'lisbon': 0,
  'paris': 1, 'berlin': 1, 'rome': 1, 'madrid': 1, 'amsterdam': 1,
  'moscow': 3, 'dubai': 4, 'uae': 4, 'pakistan': 5, 'karachi': 5,
  'bangladesh': 6, 'dhaka': 6, 'bangkok': 7, 'jakarta': 7,
  'china': 8, 'beijing': 8, 'shanghai': 8, 'hong kong': 8, 'singapore': 8,
  'tokyo': 9, 'japan': 9, 'korea': 9, 'seoul': 9,
  'sydney': 11, 'melbourne': 11, 'australia': 11,
  'auckland': 13, 'new zealand': 13, 'hawaii': -10, 'alaska': -9,
};

/**
 * 🕐 Get current time for any location
 */
export async function getWorldTime(location) {
  try {
    const cacheKey = `time_${location.toLowerCase()}`;
    const cached = cache.get(cacheKey, 30000); // 30 second cache
    if (cached) {
      console.log(`🕐 Time: Cache hit for ${location}`);
      return cached;
    }

    const lowerLocation = location.toLowerCase().trim();
    let timezone = TIMEZONE_MAP[lowerLocation];

    // Try to find partial match
    if (!timezone) {
      for (const [key, tz] of Object.entries(TIMEZONE_MAP)) {
        if (key.includes(lowerLocation) || lowerLocation.includes(key)) {
          timezone = tz;
          break;
        }
      }
    }

    // If found timezone, use WorldTime API
    if (timezone) {
      try {
        const url = `http://worldtimeapi.org/api/timezone/${timezone}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const result = formatTimeResult(location, data);
          cache.set(cacheKey, result, 30000);
          console.log(`🕐 Time: Got time for ${location} via API`);
          return result;
        }
      } catch (apiError) {
        console.log(`🕐 Time: API failed, using fallback for ${location}`);
      }
    }

    // Fallback: Calculate from UTC offset
    const offset = UTC_OFFSET_MAP[lowerLocation];
    if (offset !== undefined) {
      const result = calculateTimeFromOffset(location, offset);
      cache.set(cacheKey, result, 30000);
      console.log(`🕐 Time: Calculated time for ${location}`);
      return result;
    }

    // Last resort: Try to get timezone list and search
    try {
      const searchResult = await searchTimezone(location);
      if (searchResult) {
        cache.set(cacheKey, searchResult, 30000);
        return searchResult;
      }
    } catch (e) {}

    // Return null if nothing works
    return null;

  } catch (error) {
    console.error("Time service error:", error.message);
    return null;
  }
}

/**
 * Format time result from API response
 */
function formatTimeResult(location, data) {
  const dateTime = new Date(data.datetime);
  
  return {
    location: location,
    timezone: data.timezone,
    abbreviation: data.abbreviation,
    datetime: data.datetime,
    time: dateTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    }),
    time24: dateTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    }),
    date: dateTime.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }),
    utcOffset: data.utc_offset,
    isDST: data.dst,
    dayOfWeek: data.day_of_week,
    dayOfYear: data.day_of_year,
    weekNumber: data.week_number,
    unixTime: data.unixtime,
    source: "WorldTimeAPI"
  };
}

/**
 * Calculate time from UTC offset
 */
function calculateTimeFromOffset(location, offset) {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utc + (offset * 3600000));

  return {
    location: location,
    time: localTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    }),
    time24: localTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    }),
    date: localTime.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }),
    utcOffset: `UTC${offset >= 0 ? '+' : ''}${offset}`,
    calculated: true,
    source: "UTC Offset Calculation"
  };
}

/**
 * Search for timezone in API
 */
async function searchTimezone(location) {
  try {
    const response = await fetch('http://worldtimeapi.org/api/timezone', { timeout: 5000 });
    const timezones = await response.json();
    
    const lowerLocation = location.toLowerCase();
    const match = timezones.find(tz => 
      tz.toLowerCase().includes(lowerLocation) ||
      lowerLocation.includes(tz.toLowerCase().split('/').pop())
    );

    if (match) {
      const tzResponse = await fetch(`http://worldtimeapi.org/api/timezone/${match}`);
      const data = await tzResponse.json();
      return formatTimeResult(location, data);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 📅 Get current date information
 */
export function getDateInfo(dateStr = null) {
  const date = dateStr ? new Date(dateStr) : new Date();
  
  if (isNaN(date.getTime())) return null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const firstDay = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((date - firstDay) / 86400000 + firstDay.getDay() + 1) / 7);

  const year = date.getFullYear();
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  return {
    date: date.toISOString().split('T')[0],
    formatted: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    dayOfWeek: dayNames[date.getDay()],
    dayOfMonth: date.getDate(),
    dayOfYear: dayOfYear,
    weekNumber: weekNumber,
    month: monthNames[date.getMonth()],
    monthNumber: date.getMonth() + 1,
    year: year,
    quarter: Math.ceil((date.getMonth() + 1) / 3),
    isLeapYear: isLeapYear,
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
    daysInMonth: new Date(year, date.getMonth() + 1, 0).getDate(),
    daysLeftInYear: (isLeapYear ? 366 : 365) - dayOfYear,
    timestamp: date.getTime(),
    iso: date.toISOString(),
    source: "Date Calculator"
  };
}

/**
 * 📅 Calculate date difference
 */
export function calculateDateDifference(date1Str, date2Str = null) {
  const date1 = new Date(date1Str);
  const date2 = date2Str ? new Date(date2Str) : new Date();

  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;

  const diffTime = Math.abs(date2 - date1);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30.44);
  const diffYears = Math.floor(diffDays / 365.25);

  return {
    from: date1.toISOString().split('T')[0],
    to: date2.toISOString().split('T')[0],
    difference: {
      days: diffDays,
      weeks: diffWeeks,
      months: diffMonths,
      years: diffYears,
      hours: Math.floor(diffTime / (1000 * 60 * 60)),
      minutes: Math.floor(diffTime / (1000 * 60)),
      seconds: Math.floor(diffTime / 1000)
    },
    humanReadable: `${diffYears} years, ${diffMonths % 12} months, ${diffDays % 30} days`,
    source: "Date Calculator"
  };
}

/**
 * 📅 Get public holidays
 */
export async function getHolidays(countryCode = "US", year = new Date().getFullYear()) {
  try {
    const cacheKey = `holidays_${countryCode}_${year}`;
    const cached = cache.get(cacheKey, 86400000); // 24 hour cache
    if (cached) return cached;

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) return null;
    
    const data = await response.json();

    const result = {
      country: countryCode,
      year: year,
      holidays: data.slice(0, 15).map(h => ({
        date: h.date,
        name: h.localName,
        englishName: h.name,
        fixed: h.fixed,
        global: h.global,
        types: h.types
      })),
      source: "Nager.Date"
    };

    cache.set(cacheKey, result, 86400000);
    return result;

  } catch (error) {
    console.error("Holidays error:", error.message);
    return null;
  }
}

/**
 * 🌅 Get sunrise/sunset times
 */
export async function getSunTimes(lat, lon, location = "") {
  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.status !== "OK") return null;

    const formatTime = (isoString) => {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    };

    return {
      location: location,
      sunrise: formatTime(data.results.sunrise),
      sunset: formatTime(data.results.sunset),
      solarNoon: formatTime(data.results.solar_noon),
      dayLength: data.results.day_length,
      civilTwilightBegin: formatTime(data.results.civil_twilight_begin),
      civilTwilightEnd: formatTime(data.results.civil_twilight_end),
      source: "Sunrise-Sunset API"
    };
  } catch (error) {
    return null;
  }
}

export default {
  getWorldTime,
  getDateInfo,
  calculateDateDifference,
  getHolidays,
  getSunTimes
};