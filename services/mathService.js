// services/mathService.js - Math, Calculations, Unit Conversions

/**
 * 🔢 Evaluate a math expression
 */
export function evaluateMathExpression(expression) {
  try {
    // Sanitize input
    const sanitized = expression
      .replace(/[^0-9+\-*/().%\s^]/g, '')
      .replace(/\^/g, '**');
    
    // Use Function constructor for safe evaluation
    const result = Function('"use strict"; return (' + sanitized + ')')();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      return null;
    }

    return {
      expression: expression,
      result: result,
      formatted: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, ''),
      source: "Calculator"
    };
  } catch (error) {
    return null;
  }
}

/**
 * 🔢 Newton Math API for advanced calculations
 */
export async function calculateMath(operation, expression) {
  try {
    const encodedExpr = encodeURIComponent(expression.replace(/\s/g, ''));
    const url = `https://newton.now.sh/api/v2/${operation}/${encodedExpr}`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    return {
      operation,
      expression: data.expression,
      result: data.result,
      source: "Newton Math API"
    };
  } catch (error) {
    console.error("Newton Math error:", error.message);
    return null;
  }
}

/**
 * 📐 Unit conversion
 */
export function convertUnits(value, fromUnit, toUnit) {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  const conversions = {
    // Length
    'km_miles': 0.621371, 'miles_km': 1.60934,
    'meters_feet': 3.28084, 'feet_meters': 0.3048,
    'cm_inches': 0.393701, 'inches_cm': 2.54,
    'meters_yards': 1.09361, 'yards_meters': 0.9144,
    'm_ft': 3.28084, 'ft_m': 0.3048,
    'km_m': 1000, 'm_km': 0.001,
    'mi_km': 1.60934, 'km_mi': 0.621371,
    
    // Weight
    'kg_pounds': 2.20462, 'pounds_kg': 0.453592,
    'kg_lbs': 2.20462, 'lbs_kg': 0.453592,
    'kg_ounces': 35.274, 'ounces_kg': 0.0283495,
    'grams_ounces': 0.035274, 'ounces_grams': 28.3495,
    'g_oz': 0.035274, 'oz_g': 28.3495,
    
    // Volume
    'liters_gallons': 0.264172, 'gallons_liters': 3.78541,
    'l_gal': 0.264172, 'gal_l': 3.78541,
    'ml_floz': 0.033814, 'floz_ml': 29.5735,
    
    // Area
    'sqm_sqft': 10.7639, 'sqft_sqm': 0.092903,
    'hectares_acres': 2.47105, 'acres_hectares': 0.404686,
    
    // Speed
    'kmh_mph': 0.621371, 'mph_kmh': 1.60934,
    'ms_kmh': 3.6, 'kmh_ms': 0.277778,
    
    // Data
    'gb_mb': 1024, 'mb_gb': 0.000976563,
    'tb_gb': 1024, 'gb_tb': 0.000976563,
    'kb_mb': 0.000976563, 'mb_kb': 1024,
  };

  // Temperature conversions
  if ((from === 'celsius' || from === 'c') && (to === 'fahrenheit' || to === 'f')) {
    return { value, fromUnit, toUnit, result: (value * 9/5) + 32, formula: '(°C × 9/5) + 32', source: "Unit Converter" };
  }
  if ((from === 'fahrenheit' || from === 'f') && (to === 'celsius' || to === 'c')) {
    return { value, fromUnit, toUnit, result: (value - 32) * 5/9, formula: '(°F − 32) × 5/9', source: "Unit Converter" };
  }
  if ((from === 'celsius' || from === 'c') && (to === 'kelvin' || to === 'k')) {
    return { value, fromUnit, toUnit, result: value + 273.15, formula: '°C + 273.15', source: "Unit Converter" };
  }
  if ((from === 'kelvin' || from === 'k') && (to === 'celsius' || to === 'c')) {
    return { value, fromUnit, toUnit, result: value - 273.15, formula: 'K − 273.15', source: "Unit Converter" };
  }

  const key = `${from}_${to}`;
  const factor = conversions[key];
  
  if (!factor) return null;

  return {
    value,
    fromUnit,
    toUnit,
    result: value * factor,
    factor,
    source: "Unit Converter"
  };
}

/**
 * 💊 Calculate BMI
 */
export function calculateBMI(weight, height, unit = "metric") {
  let bmi;
  
  if (unit === "metric") {
    // weight in kg, height in cm
    bmi = weight / Math.pow(height / 100, 2);
  } else {
    // weight in pounds, height in inches
    bmi = (weight / Math.pow(height, 2)) * 703;
  }

  let category, color;
  if (bmi < 18.5) { category = "Underweight"; color = "🔵"; }
  else if (bmi < 25) { category = "Normal weight"; color = "🟢"; }
  else if (bmi < 30) { category = "Overweight"; color = "🟡"; }
  else if (bmi < 35) { category = "Obese Class I"; color = "🟠"; }
  else if (bmi < 40) { category = "Obese Class II"; color = "🔴"; }
  else { category = "Obese Class III"; color = "🔴"; }

  const heightM = unit === "metric" ? height / 100 : height * 0.0254;
  const healthyMin = 18.5 * Math.pow(heightM, 2);
  const healthyMax = 24.9 * Math.pow(heightM, 2);

  return {
    bmi: bmi.toFixed(1),
    category,
    color,
    weight,
    height,
    unit,
    healthyWeightRange: `${healthyMin.toFixed(1)} - ${healthyMax.toFixed(1)} ${unit === "metric" ? "kg" : "lbs"}`,
    source: "BMI Calculator"
  };
}

export default {
  evaluateMathExpression,
  calculateMath,
  convertUnits,
  calculateBMI
};