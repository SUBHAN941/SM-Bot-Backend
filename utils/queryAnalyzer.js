// utils/queryAnalyzer.js - Intelligent Query Analyzer

/**
 * 🧠 Analyze user query and determine what services to use
 */
export function analyzeQuery(message) {
  const lower = message.toLowerCase();
  const original = message;
  
  const analysis = {
    // Categories
    needsTime: false,
    needsDate: false,
    needsWeather: false,
    needsNews: false,
    needsCurrency: false,
    needsCrypto: false,
    needsCountry: false,
    needsDictionary: false,
    needsMath: false,
    needsQuote: false,
    needsJoke: false,
    needsTrivia: false,
    needsWikipedia: false,
    needsWebSearch: false,
    
    // Extracted data
    timeLocation: null,
    weatherLocation: null,
    currencyFrom: null,
    currencyTo: null,
    currencyAmount: null,
    cryptoName: null,
    searchTerms: [],
    mathExpression: null,
    
    // Confidence
    confidence: 0,
    primaryIntent: null
  };

  // ═══════════════════════════════════════════════════════════════
  // TIME DETECTION
  // ═══════════════════════════════════════════════════════════════
  const timePatterns = [
    /what(?:'s| is)(?: the)? (?:current )?time (?:in|at|for) (.+?)(?:\?|$|right now|now)/i,
    /(?:current )?time (?:in|at|for) (.+?)(?:\?|$)/i,
    /what time is it (?:in|at) (.+?)(?:\?|$)/i,
    /tell me (?:the )?time (?:in|at|for) (.+?)(?:\?|$)/i,
    /(.+?) time(?:\?|$| right now| now| please)/i,
    /time (?:in|at) (.+)/i,
    /what(?:'s| is) the time (?:in|at) (.+)/i,
    /do you know (?:the )?time (?:in|at|for) (.+)/i,
  ];

  for (const pattern of timePatterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      const location = match[1]
        .replace(/\?/g, '')
        .replace(/right now|now|please|currently|at the moment/gi, '')
        .trim();
      if (location && location.length > 1 && !location.match(/^(what|the|is|it|me|you|a|an)$/i)) {
        analysis.needsTime = true;
        analysis.timeLocation = location;
        analysis.primaryIntent = 'time';
        analysis.confidence = 0.95;
        break;
      }
    }
  }

  // General time query
  if (!analysis.needsTime && /\b(what time|current time|time now|what's the time)\b/i.test(lower)) {
    analysis.needsTime = true;
    analysis.timeLocation = "UTC";
    analysis.primaryIntent = 'time';
    analysis.confidence = 0.8;
  }

  // ═══════════════════════════════════════════════════════════════
  // DATE DETECTION
  // ═══════════════════════════════════════════════════════════════
  if (/\b(what(?:'s| is) (?:the )?date|today(?:'s)? date|current date|what day|day of (?:the )?week|what is today)\b/i.test(lower)) {
    analysis.needsDate = true;
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'date';
      analysis.confidence = 0.9;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WEATHER DETECTION
  // ═══════════════════════════════════════════════════════════════
  const weatherPatterns = [
    /weather\s+(?:in\s+)?(.+?)(?:\?|$)/i,
    /(?:what(?:'s| is)(?: the)? weather|how(?:'s| is)(?: the)? weather)\s+(?:in|at|for)\s+(.+?)(?:\?|$)/i,
    /temperature\s+(?:in\s+)?(.+?)(?:\?|$)/i,
    /(?:is it|will it)\s+(?:rain|snow|sunny|cloudy|hot|cold)\s+(?:in\s+)?(.+?)(?:\?|$)/i,
    /forecast\s+(?:for\s+)?(.+?)(?:\?|$)/i,
    /(?:how hot|how cold)\s+(?:is it\s+)?(?:in\s+)?(.+?)(?:\?|$)/i,
  ];

  for (const pattern of weatherPatterns) {
    const match = lower.match(pattern);
    if (match) {
      analysis.needsWeather = true;
      analysis.weatherLocation = match[1]?.trim() || "New York";
      if (!analysis.primaryIntent) {
        analysis.primaryIntent = 'weather';
        analysis.confidence = 0.95;
      }
      break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CURRENCY DETECTION
  // ═══════════════════════════════════════════════════════════════
  const currencyConvertMatch = lower.match(/convert\s+(\d+(?:\.\d+)?)\s*(\w+)\s+to\s+(\w+)/i);
  if (currencyConvertMatch) {
    analysis.needsCurrency = true;
    analysis.currencyAmount = parseFloat(currencyConvertMatch[1]);
    analysis.currencyFrom = currencyConvertMatch[2].toUpperCase();
    analysis.currencyTo = currencyConvertMatch[3].toUpperCase();
    analysis.primaryIntent = 'currency_convert';
    analysis.confidence = 0.95;
  }

  if (/\b(exchange rate|currency rate|forex|usd to|eur to|gbp to)\b/i.test(lower)) {
    analysis.needsCurrency = true;
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'currency';
      analysis.confidence = 0.85;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CRYPTO DETECTION
  // ═══════════════════════════════════════════════════════════════
  const cryptoNames = ['bitcoin', 'btc', 'ethereum', 'eth', 'dogecoin', 'doge', 'litecoin', 
                       'ripple', 'xrp', 'cardano', 'ada', 'solana', 'sol', 'polkadot'];
  
  for (const crypto of cryptoNames) {
    if (lower.includes(crypto)) {
      analysis.needsCrypto = true;
      analysis.cryptoName = crypto.replace('btc', 'bitcoin')
                                  .replace('eth', 'ethereum')
                                  .replace('doge', 'dogecoin');
      if (!analysis.primaryIntent) {
        analysis.primaryIntent = 'crypto';
        analysis.confidence = 0.9;
      }
      break;
    }
  }

  if (/\b(crypto price|cryptocurrency|top crypto|crypto market)\b/i.test(lower)) {
    analysis.needsCrypto = true;
    analysis.cryptoName = 'top';
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'crypto';
      analysis.confidence = 0.85;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DICTIONARY DETECTION
  // ═══════════════════════════════════════════════════════════════
  const dictMatch = lower.match(/(?:define|definition of|meaning of|what does|what is a|what's a)\s+['""]?(\w+)['""]?/i);
  if (dictMatch) {
    analysis.needsDictionary = true;
    analysis.searchTerms.push(dictMatch[1]);
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'dictionary';
      analysis.confidence = 0.95;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MATH DETECTION
  // ═══════════════════════════════════════════════════════════════
  const mathMatch = lower.match(/(?:calculate|compute|what is|what's)\s+(.+?)(?:\?|$)/i);
  if (mathMatch && /[\d\+\-\*\/\^x×÷=\(\)]/.test(mathMatch[1])) {
    analysis.needsMath = true;
    analysis.mathExpression = mathMatch[1].replace(/x|×/g, '*').replace(/÷/g, '/');
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'math';
      analysis.confidence = 0.9;
    }
  }

  // Direct math expression
  const directMath = lower.match(/^[\d\s\+\-\*\/\^x×÷\(\)\.]+$/);
  if (directMath) {
    analysis.needsMath = true;
    analysis.mathExpression = lower.replace(/x|×/g, '*').replace(/÷/g, '/');
    analysis.primaryIntent = 'math';
    analysis.confidence = 0.95;
  }

  // ═══════════════════════════════════════════════════════════════
  // ENTERTAINMENT DETECTION
  // ═══════════════════════════════════════════════════════════════
  if (/\b(quote|inspiration|motivat|wisdom)\b/i.test(lower)) {
    analysis.needsQuote = true;
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'quote';
      analysis.confidence = 0.85;
    }
  }

  if (/\b(joke|funny|make me laugh|humor)\b/i.test(lower)) {
    analysis.needsJoke = true;
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'joke';
      analysis.confidence = 0.9;
    }
  }

  if (/\b(trivia|quiz|fun fact|did you know|random fact)\b/i.test(lower)) {
    analysis.needsTrivia = true;
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'trivia';
      analysis.confidence = 0.85;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GENERAL KNOWLEDGE / WIKIPEDIA
  // ═══════════════════════════════════════════════════════════════
  const knowledgePatterns = [
    /\b(what is|who is|what are|who are|explain|tell me about|describe)\b/i,
    /\b(history of|biography of|how does|how do|why is|why are)\b/i,
  ];

  if (knowledgePatterns.some(p => p.test(lower)) && 
      !analysis.needsTime && !analysis.needsWeather && !analysis.needsMath) {
    analysis.needsWikipedia = true;
    
    const searchMatch = lower.match(/(?:what is|who is|explain|tell me about|describe|history of|how does)\s+(?:the\s+)?(.+?)(?:\?|$)/i);
    if (searchMatch) {
      analysis.searchTerms.push(searchMatch[1].trim());
    }
    
    if (!analysis.primaryIntent) {
      analysis.primaryIntent = 'knowledge';
      analysis.confidence = 0.8;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WEB SEARCH FALLBACK (for unrecognized queries)
  // ═══════════════════════════════════════════════════════════════
  if (!analysis.primaryIntent && message.trim().length > 3) {
    analysis.needsWebSearch = true;
    analysis.searchTerms.push(message.replace(/\?/g, '').trim());
    analysis.primaryIntent = 'web_search';
    analysis.confidence = 0.5;
  }

  // If it's a question but nothing matched, try web search
  if (/\?$/.test(message.trim()) && !analysis.primaryIntent) {
    analysis.needsWebSearch = true;
    analysis.needsWikipedia = true;
    const cleanQuery = message.replace(/\?/g, '')
      .replace(/^(what|who|when|where|why|how|is|are|was|were|can|could|do|does|did)\s+/i, '')
      .trim();
    if (cleanQuery) {
      analysis.searchTerms.push(cleanQuery);
    }
    analysis.primaryIntent = 'question';
    analysis.confidence = 0.6;
  }

  return analysis;
}

/**
 * Check if query needs web search fallback
 */
export function needsWebSearchFallback(results) {
  // If no results from primary sources, trigger web search
  const hasValidResult = Object.values(results).some(r => 
    r !== null && r !== undefined
  );
  return !hasValidResult;
}

export default {
  analyzeQuery,
  needsWebSearchFallback
};