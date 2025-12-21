// services/webSearchService.js - Advanced Web Search Fallback System
// This service provides fallback web search when other APIs don't have answers

import cache from '../utils/cache.js';

/**
 * 🔍 Multi-Source Web Search - Tries multiple search engines
 */
export async function performWebSearch(query) {
  console.log(`🔍 WebSearch: Searching for "${query}"`);
  
  const cacheKey = `websearch_${query.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = cache.get(cacheKey, 1800000); // 30 min cache
  if (cached) {
    console.log(`🔍 WebSearch: Cache hit`);
    return cached;
  }

  const results = {
    query: query,
    sources: [],
    bestAnswer: null,
    allResults: [],
    searchedAt: new Date().toISOString()
  };

  // Try multiple search sources in parallel
  const searchPromises = [
    searchDuckDuckGo(query),
    searchWikipedia(query),
    searchWikipediaExtracts(query),
    searchStackExchange(query),
    searchWolframAlpha(query),
  ];

  const searchResults = await Promise.allSettled(searchPromises);

  // Collect results
  searchResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      results.allResults.push(result.value);
      results.sources.push(result.value.source);
    }
  });

  // Determine best answer
  results.bestAnswer = determineBestAnswer(results.allResults, query);

  if (results.bestAnswer || results.allResults.length > 0) {
    cache.set(cacheKey, results, 1800000);
  }

  console.log(`🔍 WebSearch: Found ${results.allResults.length} results`);
  return results;
}

/**
 * 🔎 DuckDuckGo Instant Answer API
 */
export async function searchDuckDuckGo(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    // Check for direct answer
    if (data.Answer) {
      return {
        type: 'instant_answer',
        answer: data.Answer,
        answerType: data.AnswerType,
        confidence: 0.95,
        source: 'DuckDuckGo Instant Answer'
      };
    }

    // Check for abstract
    if (data.Abstract) {
      return {
        type: 'abstract',
        title: data.Heading,
        answer: data.Abstract,
        url: data.AbstractURL,
        image: data.Image,
        confidence: 0.85,
        source: data.AbstractSource || 'DuckDuckGo'
      };
    }

    // Check for definition
    if (data.Definition) {
      return {
        type: 'definition',
        answer: data.Definition,
        url: data.DefinitionURL,
        confidence: 0.8,
        source: data.DefinitionSource || 'DuckDuckGo'
      };
    }

    // Check for related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter(t => t.Text)
        .slice(0, 5)
        .map(t => ({
          text: t.Text,
          url: t.FirstURL
        }));

      if (topics.length > 0) {
        return {
          type: 'related',
          topics: topics,
          confidence: 0.6,
          source: 'DuckDuckGo Related'
        };
      }
    }

    return null;
  } catch (error) {
    console.error("DuckDuckGo search error:", error.message);
    return null;
  }
}

/**
 * 📚 Wikipedia Search API
 */
export async function searchWikipedia(query) {
  try {
    // First search for articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`;
    const searchResponse = await fetch(searchUrl, { 
      timeout: 5000,
      headers: { 'User-Agent': 'UltimateAI/1.0' }
    });
    const searchData = await searchResponse.json();
    
    if (!searchData[1] || searchData[1].length === 0) return null;

    const bestMatch = searchData[1][0];
    
    // Get summary
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatch)}`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'UltimateAI/1.0' }
    });
    const summaryData = await summaryResponse.json();

    if (!summaryData.extract) return null;

    return {
      type: 'encyclopedia',
      title: summaryData.title,
      answer: summaryData.extract,
      description: summaryData.description,
      url: summaryData.content_urls?.desktop?.page,
      image: summaryData.thumbnail?.source,
      confidence: 0.9,
      source: 'Wikipedia'
    };

  } catch (error) {
    console.error("Wikipedia search error:", error.message);
    return null;
  }
}

/**
 * 📚 Wikipedia Extract Search - More detailed
 */
async function searchWikipediaExtracts(query) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&srprop=snippet`;
    const response = await fetch(url, { 
      timeout: 5000,
      headers: { 'User-Agent': 'UltimateAI/1.0' }
    });
    const data = await response.json();

    if (!data.query?.search || data.query.search.length === 0) return null;

    const results = data.query.search.map(item => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ''), // Remove HTML
      pageId: item.pageid
    }));

    return {
      type: 'search_results',
      results: results,
      confidence: 0.7,
      source: 'Wikipedia Search'
    };

  } catch (error) {
    return null;
  }
}

/**
 * 💻 Stack Exchange Search - For programming/tech questions
 */
async function searchStackExchange(query) {
  try {
    // Check if it's a programming-related query
    const techKeywords = ['code', 'programming', 'javascript', 'python', 'java', 'how to', 
                          'error', 'bug', 'function', 'api', 'database', 'sql', 'html', 'css',
                          'react', 'node', 'npm', 'git', 'linux', 'windows', 'mac'];
    
    const isTechQuery = techKeywords.some(kw => query.toLowerCase().includes(kw));
    if (!isTechQuery) return null;

    const url = `https://api.stackexchange.com/2.3/search/excerpts?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=3`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!data.items || data.items.length === 0) return null;

    const topAnswer = data.items.find(item => item.item_type === 'answer');
    const topQuestion = data.items.find(item => item.item_type === 'question');

    if (topAnswer) {
      return {
        type: 'stackoverflow_answer',
        title: topAnswer.title,
        answer: topAnswer.excerpt.replace(/<[^>]*>/g, ''),
        url: `https://stackoverflow.com/a/${topAnswer.answer_id}`,
        score: topAnswer.score,
        confidence: 0.85,
        source: 'Stack Overflow'
      };
    }

    if (topQuestion) {
      return {
        type: 'stackoverflow_question',
        title: topQuestion.title,
        excerpt: topQuestion.excerpt.replace(/<[^>]*>/g, ''),
        url: `https://stackoverflow.com/q/${topQuestion.question_id}`,
        confidence: 0.7,
        source: 'Stack Overflow'
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 🔬 Wolfram Alpha Short Answers (for factual/math questions)
 */
async function searchWolframAlpha(query) {
  try {
    // Check if it seems like a factual/math query
    const factualKeywords = ['how many', 'how much', 'what is', 'calculate', 'convert', 
                             'distance', 'population', 'capital', 'formula', 'equation',
                             'when was', 'when did', 'who invented', 'who discovered'];
    
    const isFactualQuery = factualKeywords.some(kw => query.toLowerCase().includes(kw));
    if (!isFactualQuery) return null;

    // Using Wolfram Alpha Short Answers API (no key needed for simple queries)
    const url = `https://api.wolframalpha.com/v1/result?appid=DEMO&i=${encodeURIComponent(query)}`;
    
    // Note: DEMO key has limited access. For production, get a free API key
    // This might not work without a valid key, so we'll skip if it fails
    
    return null; // Skip for now unless you have a Wolfram Alpha API key
    
  } catch (error) {
    return null;
  }
}

/**
 * 🌐 Google Custom Search (requires API key - optional)
 */
export async function searchGoogle(query, apiKey = null, cx = null) {
  if (!apiKey || !cx) return null;
  
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!data.items || data.items.length === 0) return null;

    return {
      type: 'google_search',
      results: data.items.slice(0, 5).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link
      })),
      confidence: 0.8,
      source: 'Google Search'
    };
  } catch (error) {
    return null;
  }
}

/**
 * 📖 Dictionary API for word-related queries
 */
export async function searchDictionary(word) {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    
    return {
      type: 'dictionary',
      word: entry.word,
      phonetic: entry.phonetic,
      meanings: entry.meanings?.slice(0, 3).map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions?.slice(0, 2).map(d => ({
          definition: d.definition,
          example: d.example
        }))
      })),
      confidence: 0.95,
      source: 'Free Dictionary'
    };
  } catch (error) {
    return null;
  }
}

/**
 * 🎯 Determine the best answer from all results
 */
function determineBestAnswer(results, query) {
  if (!results || results.length === 0) return null;

  // Sort by confidence
  const sorted = results
    .filter(r => r && r.confidence)
    .sort((a, b) => b.confidence - a.confidence);

  if (sorted.length === 0) return null;

  const best = sorted[0];

  // Format best answer
  let formattedAnswer = {
    type: best.type,
    source: best.source,
    confidence: best.confidence,
    content: null
  };

  switch (best.type) {
    case 'instant_answer':
      formattedAnswer.content = best.answer;
      break;
    case 'abstract':
    case 'encyclopedia':
      formattedAnswer.content = best.answer;
      formattedAnswer.title = best.title;
      formattedAnswer.url = best.url;
      formattedAnswer.image = best.image;
      break;
    case 'definition':
      formattedAnswer.content = best.answer;
      break;
    case 'dictionary':
      formattedAnswer.content = best.meanings;
      formattedAnswer.word = best.word;
      formattedAnswer.phonetic = best.phonetic;
      break;
    case 'stackoverflow_answer':
      formattedAnswer.content = best.answer;
      formattedAnswer.title = best.title;
      formattedAnswer.url = best.url;
      break;
    case 'related':
      formattedAnswer.content = best.topics;
      break;
    default:
      formattedAnswer.content = best.answer || best.results || best.topics;
  }

  return formattedAnswer;
}

/**
 * 🔍 Smart Search with Fallback Chain
 */
export async function smartSearch(query) {
  console.log(`🔍 SmartSearch: "${query}"`);

  // 1. Try DuckDuckGo first (fastest for direct answers)
  const ddgResult = await searchDuckDuckGo(query);
  if (ddgResult && (ddgResult.type === 'instant_answer' || ddgResult.type === 'abstract')) {
    console.log(`🔍 SmartSearch: Found via DuckDuckGo`);
    return {
      found: true,
      result: ddgResult,
      fallbackUsed: false
    };
  }

  // 2. Try Wikipedia
  const wikiResult = await searchWikipedia(query);
  if (wikiResult && wikiResult.answer) {
    console.log(`🔍 SmartSearch: Found via Wikipedia`);
    return {
      found: true,
      result: wikiResult,
      fallbackUsed: true
    };
  }

  // 3. Check if it's a word definition query
  const words = query.toLowerCase().match(/(?:define|meaning of|what is a|what's a)\s+(\w+)/i);
  if (words) {
    const dictResult = await searchDictionary(words[1]);
    if (dictResult) {
      console.log(`🔍 SmartSearch: Found via Dictionary`);
      return {
        found: true,
        result: dictResult,
        fallbackUsed: true
      };
    }
  }

  // 4. Try Stack Exchange for tech queries
  const stackResult = await searchStackExchange(query);
  if (stackResult) {
    console.log(`🔍 SmartSearch: Found via Stack Overflow`);
    return {
      found: true,
      result: stackResult,
      fallbackUsed: true
    };
  }

  // 5. Full web search as last resort
  const fullSearch = await performWebSearch(query);
  if (fullSearch.bestAnswer) {
    console.log(`🔍 SmartSearch: Found via full search`);
    return {
      found: true,
      result: fullSearch.bestAnswer,
      allResults: fullSearch.allResults,
      fallbackUsed: true
    };
  }

  // 6. Return partial results if any
  if (fullSearch.allResults.length > 0) {
    return {
      found: false,
      partialResults: fullSearch.allResults,
      message: "Couldn't find a definitive answer, but here are some related results"
    };
  }

  return {
    found: false,
    message: "No results found"
  };
}

export default {
  performWebSearch,
  searchDuckDuckGo,
  searchWikipedia,
  searchDictionary,
  searchGoogle,
  smartSearch
};