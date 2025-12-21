// services/geographyService.js - Country, City, Location Services

import cache from '../utils/cache.js';

/**
 * 🌍 Get country information
 */
export async function getCountryInfo(country) {
  try {
    const cacheKey = `country_${country.toLowerCase()}`;
    const cached = cache.get(cacheKey, 86400000); // 24 hour cache
    if (cached) return cached;

    const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) return null;

    const c = data[0];
    const result = {
      name: c.name?.common,
      officialName: c.name?.official,
      capital: c.capital?.[0],
      region: c.region,
      subregion: c.subregion,
      population: c.population?.toLocaleString(),
      area: c.area?.toLocaleString() + ' km²',
      languages: c.languages ? Object.values(c.languages) : [],
      currencies: c.currencies ? Object.entries(c.currencies).map(([code, curr]) => ({
        code,
        name: curr.name,
        symbol: curr.symbol
      })) : [],
      flag: c.flag,
      flagUrl: c.flags?.png,
      coatOfArms: c.coatOfArms?.png,
      timezones: c.timezones,
      continents: c.continents,
      borders: c.borders,
      landlocked: c.landlocked,
      unMember: c.unMember,
      callingCode: c.idd?.root + (c.idd?.suffixes?.[0] || ''),
      tld: c.tld?.[0],
      drivingSide: c.car?.side,
      coordinates: {
        lat: c.latlng?.[0],
        lon: c.latlng?.[1]
      },
      maps: c.maps?.googleMaps,
      startOfWeek: c.startOfWeek,
      source: "REST Countries"
    };

    cache.set(cacheKey, result, 86400000);
    return result;

  } catch (error) {
    console.error("Country info error:", error.message);
    return null;
  }
}

/**
 * 🏙️ Get city information
 */
export async function getCityInfo(city) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const c = data.results[0];
    return {
      name: c.name,
      country: c.country,
      countryCode: c.country_code,
      admin1: c.admin1,
      admin2: c.admin2,
      latitude: c.latitude,
      longitude: c.longitude,
      elevation: c.elevation + 'm',
      population: c.population?.toLocaleString(),
      timezone: c.timezone,
      source: "Open-Meteo Geocoding"
    };
  } catch (error) {
    console.error("City info error:", error.message);
    return null;
  }
}

/**
 * 📍 Get IP geolocation
 */
export async function getIPLocation(ip = "") {
  try {
    const url = ip ? `http://ip-api.com/json/${ip}` : `http://ip-api.com/json/`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.status !== "success") return null;

    return {
      ip: data.query,
      city: data.city,
      region: data.regionName,
      country: data.country,
      countryCode: data.countryCode,
      zipCode: data.zip,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      source: "IP-API"
    };
  } catch (error) {
    return null;
  }
}

export default {
  getCountryInfo,
  getCityInfo,
  getIPLocation
};