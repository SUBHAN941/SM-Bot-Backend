// services/scienceService.js - NASA, Space, Science APIs

import cache from '../utils/cache.js';

/**
 * 🚀 Get NASA Astronomy Picture of the Day
 */
export async function getNasaAPOD() {
  try {
    const cacheKey = 'nasa_apod';
    const cached = cache.get(cacheKey, 3600000); // 1 hour cache
    if (cached) return cached;

    // Using DEMO_KEY - get your own free key at api.nasa.gov
    const url = `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    const result = {
      title: data.title,
      date: data.date,
      explanation: data.explanation,
      url: data.url,
      hdUrl: data.hdurl,
      mediaType: data.media_type,
      copyright: data.copyright,
      source: "NASA APOD"
    };

    cache.set(cacheKey, result, 3600000);
    return result;

  } catch (error) {
    console.error("NASA APOD error:", error.message);
    return null;
  }
}

/**
 * 🛰️ Get ISS current location
 */
export async function getISSLocation() {
  try {
    const url = `http://api.open-notify.org/iss-now.json`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.message !== "success") return null;

    return {
      latitude: data.iss_position.latitude,
      longitude: data.iss_position.longitude,
      timestamp: new Date(data.timestamp * 1000).toISOString(),
      mapUrl: `https://www.google.com/maps?q=${data.iss_position.latitude},${data.iss_position.longitude}`,
      source: "Open Notify"
    };
  } catch (error) {
    console.error("ISS error:", error.message);
    return null;
  }
}

/**
 * 👨‍🚀 Get people currently in space
 */
export async function getPeopleInSpace() {
  try {
    const url = `http://api.open-notify.org/astros.json`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.message !== "success") return null;

    return {
      count: data.number,
      people: data.people.map(p => ({
        name: p.name,
        craft: p.craft
      })),
      source: "Open Notify"
    };
  } catch (error) {
    console.error("Astros error:", error.message);
    return null;
  }
}

/**
 * 🚀 Get SpaceX launch info
 */
export async function getSpaceXLaunches(type = "latest") {
  try {
    const url = `https://api.spacexdata.com/v4/launches/${type}`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (Array.isArray(data)) {
      return {
        launches: data.slice(0, 5).map(l => ({
          name: l.name,
          date: l.date_local,
          success: l.success,
          details: l.details?.substring(0, 200)
        })),
        source: "SpaceX API"
      };
    }

    return {
      name: data.name,
      date: data.date_local,
      success: data.success,
      details: data.details,
      flightNumber: data.flight_number,
      links: {
        webcast: data.links?.webcast,
        wikipedia: data.links?.wikipedia,
        article: data.links?.article
      },
      source: "SpaceX API"
    };

  } catch (error) {
    console.error("SpaceX error:", error.message);
    return null;
  }
}

export default {
  getNasaAPOD,
  getISSLocation,
  getPeopleInSpace,
  getSpaceXLaunches
};