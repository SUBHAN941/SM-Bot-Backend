// services/index.js - Central export for all services

// Time & Date
export * from './timeService.js';
import timeService from './timeService.js';

// Weather
export * from './weatherService.js';
import weatherService from './weatherService.js';

// Finance
export * from './financeService.js';
import financeService from './financeService.js';

// News
export * from './newsService.js';
import newsService from './newsService.js';

// Geography
export * from './geographyService.js';
import geographyService from './geographyService.js';

// Entertainment
export * from './entertainmentService.js';
import entertainmentService from './entertainmentService.js';

// Math
export * from './mathService.js';
import mathService from './mathService.js';

// Science & Space
export * from './scienceService.js';
import scienceService from './scienceService.js';

// Utilities
export * from './utilityService.js';
import utilityService from './utilityService.js';

// Web Search (Fallback)
export * from './webSearchService.js';
import webSearchService from './webSearchService.js';

// Default export with all services
export default {
  time: timeService,
  weather: weatherService,
  finance: financeService,
  news: newsService,
  geography: geographyService,
  entertainment: entertainmentService,
  math: mathService,
  science: scienceService,
  utility: utilityService,
  webSearch: webSearchService
};