// services/newsService.js - News & Current Events

import cache from '../utils/cache.js';

const NEWS_FEEDS = {
  technology: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
  science: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
  business: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
  world: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  health: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml",
  sports: "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml",
  politics: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
  arts: "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml",
  movies: "https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml",
  books: "https://rss.nytimes.com/services/xml/rss/nyt/Books.xml"
};

/**
 * 📰 Get news by category
 */
export async function getNews(topic = "technology") {
  try {
    const cacheKey = `news_${topic.toLowerCase()}`;
    const cached = cache.get(cacheKey, 1800000); // 30 min cache
    if (cached) return cached;

    const feedUrl = NEWS_FEEDS[topic.toLowerCase()] || NEWS_FEEDS.technology;
    const converterUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    
    const response = await fetch(converterUrl, { timeout: 5000 });
    const data = await response.json();

    if (data.status !== "ok") return null;

    const result = {
      items: data.items?.slice(0, 7).map(item => ({
        title: item.title,
        description: item.description?.replace(/<[^>]*>/g, '').substring(0, 250),
        link: item.link,
        pubDate: item.pubDate,
        author: item.author
      })),
      source: data.feed?.title || "News",
      topic: topic
    };

    cache.set(cacheKey, result, 1800000);
    return result;

  } catch (error) {
    console.error("News error:", error.message);
    return null;
  }
}

/**
 * 💻 Get Hacker News stories
 */
export async function getHackerNews(type = "top") {
  try {
    const cacheKey = `hn_${type}`;
    const cached = cache.get(cacheKey, 600000); // 10 min cache
    if (cached) return cached;

    const types = { 
      top: "topstories", 
      new: "newstories", 
      best: "beststories", 
      ask: "askstories", 
      show: "showstories" 
    };
    const endpoint = types[type] || types.top;
    
    const idsUrl = `https://hacker-news.firebaseio.com/v0/${endpoint}.json`;
    const idsResponse = await fetch(idsUrl, { timeout: 5000 });
    const ids = await idsResponse.json();

    const stories = await Promise.all(
      ids.slice(0, 5).map(async (id) => {
        const storyUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
        const response = await fetch(storyUrl, { timeout: 3000 });
        return response.json();
      })
    );

    const result = {
      type: type,
      stories: stories.filter(s => s).map(s => ({
        title: s.title,
        url: s.url,
        score: s.score,
        author: s.by,
        comments: s.descendants,
        time: new Date(s.time * 1000).toISOString()
      })),
      source: "Hacker News"
    };

    cache.set(cacheKey, result, 600000);
    return result;

  } catch (error) {
    console.error("Hacker News error:", error.message);
    return null;
  }
}

export default {
  getNews,
  getHackerNews
};