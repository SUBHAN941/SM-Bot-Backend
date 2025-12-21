// services/weatherService.js - Weather & Environment Services

import cache from '../utils/cache.js';

/**
 * 🌤️ Get weather for any location
 */
export async function getWeather(location) {
  try {
    const cacheKey = `weather_${location.toLowerCase()}`;
    const cached = cache.get(cacheKey, 600000); // 10 minute cache
    if (cached) {
      console.log(`🌤️ Weather: Cache hit for ${location}`);
      return cached;
    }

    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!data.current_condition || !data.current_condition[0]) {
      return null;
    }

    const current = data.current_condition[0];
    const forecast = data.weather?.slice(0, 3);
    
    const result = {
      location: data.nearest_area?.[0]?.areaName?.[0]?.value || location,
      region: data.nearest_area?.[0]?.region?.[0]?.value,
      country: data.nearest_area?.[0]?.country?.[0]?.value,
      coordinates: {
        lat: data.nearest_area?.[0]?.latitude,
        lon: data.nearest_area?.[0]?.longitude
      },
      current: {
        temperature: {
          celsius: current.temp_C,
          fahrenheit: current.temp_F
        },
        feelsLike: {
          celsius: current.FeelsLikeC,
          fahrenheit: current.FeelsLikeF
        },
        condition: current.weatherDesc?.[0]?.value,
        humidity: current.humidity + '%',
        windSpeed: current.windspeedKmph + ' km/h',
        windDirection: current.winddir16Point,
        visibility: current.visibility + ' km',
        uvIndex: current.uvIndex,
        pressure: current.pressure + ' mb',
        cloudCover: current.cloudcover + '%',
        precipitation: current.precipMM + ' mm'
      },
      forecast: forecast?.map(day => ({
        date: day.date,
        maxTemp: { celsius: day.maxtempC, fahrenheit: day.maxtempF },
        minTemp: { celsius: day.mintempC, fahrenheit: day.mintempF },
        avgTemp: { celsius: day.avgtempC, fahrenheit: day.avgtempF },
        condition: day.hourly?.[4]?.weatherDesc?.[0]?.value,
        sunrise: day.astronomy?.[0]?.sunrise,
        sunset: day.astronomy?.[0]?.sunset,
        moonPhase: day.astronomy?.[0]?.moon_phase,
        chanceOfRain: day.hourly?.[4]?.chanceofrain + '%',
        chanceOfSnow: day.hourly?.[4]?.chanceofsnow + '%'
      })),
      source: "wttr.in"
    };

    cache.set(cacheKey, result, 600000);
    console.log(`🌤️ Weather: Got data for ${location}`);
    return result;

  } catch (error) {
    console.error("Weather error:", error.message);
    return null;
  }
}

/**
 * 🌍 Get air quality index
 */
export async function getAirQuality(city) {
  try {
    const cacheKey = `aqi_${city.toLowerCase()}`;
    const cached = cache.get(cacheKey, 1800000); // 30 minute cache
    if (cached) return cached;

    const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=demo`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.status !== "ok") return null;

    const aqi = data.data.aqi;
    let level, color, healthImplication;

    if (aqi <= 50) {
      level = "Good"; color = "🟢"; 
      healthImplication = "Air quality is satisfactory";
    } else if (aqi <= 100) {
      level = "Moderate"; color = "🟡"; 
      healthImplication = "Acceptable; some pollutants may be a concern for sensitive groups";
    } else if (aqi <= 150) {
      level = "Unhealthy for Sensitive Groups"; color = "🟠"; 
      healthImplication = "Sensitive groups may experience health effects";
    } else if (aqi <= 200) {
      level = "Unhealthy"; color = "🔴"; 
      healthImplication = "Everyone may begin to experience health effects";
    } else if (aqi <= 300) {
      level = "Very Unhealthy"; color = "🟣"; 
      healthImplication = "Health alert: everyone may experience serious effects";
    } else {
      level = "Hazardous"; color = "🟤"; 
      healthImplication = "Health warning of emergency conditions";
    }

    const result = {
      city: data.data.city?.name || city,
      aqi: aqi,
      level: level,
      color: color,
      healthImplication: healthImplication,
      dominantPollutant: data.data.dominentpol,
      time: data.data.time?.s,
      source: "World Air Quality Index"
    };

    cache.set(cacheKey, result, 1800000);
    return result;

  } catch (error) {
    console.error("Air quality error:", error.message);
    return null;
  }
}

export default {
  getWeather,
  getAirQuality
};