// server.js - Ultimate AI Assistant (Clean Version)
// All services are imported from separate modules

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Import knowledge base
import { knowledgeBase, buildSystemPrompt } from "./knowledge.js";

// Import all services
import services from "./services/index.js";

// Import utilities
import cache from "./utils/cache.js";
import { analyzeQuery, needsWebSearchFallback } from "./utils/queryAnalyzer.js";
import { buildContextFromKnowledge, buildEnhancedSystemPrompt } from "./utils/responseBuilder.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory conversation storage
const conversations = new Map();

// ════════════════════════════════════════════════════════════════════════════════
// 🤖 AI MODELS CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

const models = {
  "llama-3.1-8b": {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    description: "⚡ Ultra Fast",
    maxTokens: 2048,
  },
  "llama-3.3-70b": {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    description: "🎯 Most Powerful",
    maxTokens: 4096,
  },
  "gemma2-9b": {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    description: "🔷 Google's Model",
    maxTokens: 2048,
  },
  "mixtral-8x7b": {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    description: "🔥 Best for Complex Tasks",
    maxTokens: 4096,
  },
};

const DEFAULT_MODEL = "llama-3.3-70b";

// ════════════════════════════════════════════════════════════════════════════════
// 🔄 KNOWLEDGE GATHERING - Uses all services
// ════════════════════════════════════════════════════════════════════════════════

async function gatherKnowledge(message) {
  const analysis = analyzeQuery(message);
  const results = {};
  const promises = [];

  console.log(`🧠 Query Analysis:`, {
    primaryIntent: analysis.primaryIntent,
    confidence: analysis.confidence,
    searchTerms: analysis.searchTerms
  });

  // Time
  if (analysis.needsTime && analysis.timeLocation) {
    promises.push(
      services.time.getWorldTime(analysis.timeLocation)
        .then(data => { if (data) results.time = data; })
        .catch(e => console.error("Time error:", e.message))
    );
  }

  // Date
  if (analysis.needsDate) {
    results.date = services.time.getDateInfo();
  }

  // Weather
  if (analysis.needsWeather && analysis.weatherLocation) {
    promises.push(
      services.weather.getWeather(analysis.weatherLocation)
        .then(data => { if (data) results.weather = data; })
        .catch(e => console.error("Weather error:", e.message))
    );
  }

  // Currency
  if (analysis.needsCurrency) {
    if (analysis.currencyAmount && analysis.currencyFrom && analysis.currencyTo) {
      promises.push(
        services.finance.convertCurrency(analysis.currencyAmount, analysis.currencyFrom, analysis.currencyTo)
          .then(data => { if (data) results.currency = data; })
          .catch(() => {})
      );
    } else {
      promises.push(
        services.finance.getExchangeRates(analysis.currencyFrom || "USD")
          .then(data => { if (data) results.currency = data; })
          .catch(() => {})
      );
    }
  }

  // Crypto
  if (analysis.needsCrypto) {
    if (analysis.cryptoName === 'top') {
      promises.push(
        services.finance.getTopCryptos(10)
          .then(data => { if (data) results.crypto = data; })
          .catch(() => {})
      );
    } else {
      promises.push(
        services.finance.getCryptoPrice(analysis.cryptoName || 'bitcoin')
          .then(data => { if (data) results.crypto = data; })
          .catch(() => {})
      );
    }
  }

  // News
  if (analysis.needsNews) {
    promises.push(
      services.news.getNews(analysis.newsCategory || 'technology')
        .then(data => { if (data) results.news = data; })
        .catch(() => {})
    );
  }

  // Country
  if (analysis.needsCountry && analysis.searchTerms.length > 0) {
    promises.push(
      services.geography.getCountryInfo(analysis.searchTerms[0])
        .then(data => { if (data) results.country = data; })
        .catch(() => {})
    );
  }

  // Dictionary
  if (analysis.needsDictionary && analysis.searchTerms.length > 0) {
    promises.push(
      services.webSearch.searchDictionary(analysis.searchTerms[0])
        .then(data => { if (data) results.dictionary = data; })
        .catch(() => {})
    );
  }

  // Math
  if (analysis.needsMath && analysis.mathExpression) {
    const mathResult = services.math.evaluateMathExpression(analysis.mathExpression);
    if (mathResult) {
      results.math = mathResult;
    }
  }

  // Quote
  if (analysis.needsQuote) {
    promises.push(
      services.entertainment.getQuote()
        .then(data => { if (data) results.quote = data; })
        .catch(() => {})
    );
  }

  // Joke
  if (analysis.needsJoke) {
    promises.push(
      services.entertainment.getJoke()
        .then(data => { if (data) results.joke = data; })
        .catch(() => {})
    );
  }

  // Trivia
  if (analysis.needsTrivia) {
    promises.push(
      services.entertainment.getTriviaQuestion()
        .then(data => { if (data) results.trivia = data; })
        .catch(() => {})
    );
  }

  // Wikipedia
  if (analysis.needsWikipedia && analysis.searchTerms.length > 0) {
    promises.push(
      services.webSearch.searchWikipedia(analysis.searchTerms[0])
        .then(data => { if (data) results.wikipedia = data; })
        .catch(() => {})
    );
  }

  // Wait for all promises with timeout
  await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, 6000))
  ]);

  // 🔍 WEB SEARCH FALLBACK - If no results found, try web search
  if (needsWebSearchFallback(results) && (analysis.needsWebSearch || analysis.searchTerms.length > 0)) {
    console.log("🔍 Triggering web search fallback...");
    const searchQuery = analysis.searchTerms[0] || message.replace(/\?/g, '').trim();
    
    try {
      const webSearchResult = await services.webSearch.smartSearch(searchQuery);
      if (webSearchResult.found) {
        results.webSearch = webSearchResult;
        console.log("✅ Web search fallback successful");
      }
    } catch (e) {
      console.error("Web search fallback error:", e.message);
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// 🤖 GROQ API CALL
// ════════════════════════════════════════════════════════════════════════════════

async function callGroqAPI(messages, modelId, temperature = 0.7, maxTokens = 2048) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || "API request failed");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - please try again");
    }
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 💬 QUICK RESPONSES
// ════════════════════════════════════════════════════════════════════════════════

const quickResponses = {
  greetings: [
    `👋 **Hello! Welcome to the Ultimate AI Assistant!**

I can help you with:

🕐 **Time** - "What time is it in Tokyo?"
🌤️ **Weather** - "Weather in London"
📰 **News** - "Latest tech news"
💱 **Currency** - "Convert 100 USD to EUR"
📈 **Crypto** - "Bitcoin price"
🌍 **Countries** - "Tell me about Japan"
📖 **Dictionary** - "Define serendipity"
🔢 **Math** - "Calculate 234 * 567"
🎯 **Trivia** - "Give me a trivia question"
😂 **Jokes** - "Tell me a joke"
🚀 **Space** - "Where is the ISS?"
📚 **Knowledge** - Any question!

Just ask me anything! 🚀`,
  ],
  thanks: [
    "✅ You're welcome! Is there anything else I can help you with?",
    "🙏 Happy to help! Let me know if you have more questions!",
    "😊 My pleasure! I'm here whenever you need assistance!",
  ],
  goodbye: [
    "👋 Goodbye! Have an amazing day!",
    "🌟 Take care! Feel free to come back anytime!",
    "😊 Bye! It was great helping you!",
  ],
};

function getQuickResponse(message) {
  const lower = message.toLowerCase().trim();
  
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|yo|sup|hola|howdy)[\s!.]*$/i.test(lower)) {
    return quickResponses.greetings[Math.floor(Math.random() * quickResponses.greetings.length)];
  }
  
  if (/^(thanks|thank you|thx|ty|appreciated|thank u|cheers)[\s!.]*$/i.test(lower)) {
    return quickResponses.thanks[Math.floor(Math.random() * quickResponses.thanks.length)];
  }
  
  if (/^(bye|goodbye|see you|later|take care|cya|see ya|adios|farewell)[\s!.]*$/i.test(lower)) {
    return quickResponses.goodbye[Math.floor(Math.random() * quickResponses.goodbye.length)];
  }
  
  return null;
}

function formatResponse(content) {
  // Add space after emojis if missing
  content = content.replace(/([✅❌📌💡⚡🎯📞📍⏰💰🔥⭐🛡️📦🎁ℹ️⚠️🚀💬📧👋🌟😊🙏📚🌍💱🌤️📰🔢📖🎲🐱🕐📅🎬👨‍🚀🛰️🍎📱🔐🎓📈])(\w)/g, "$1 $2");
  // Convert dashes/asterisks to bullet points
  content = content.replace(/^[-*]\s/gm, "• ");
  return content.trim();
}

// ════════════════════════════════════════════════════════════════════════════════
// 🌐 API ROUTES
// ════════════════════════════════════════════════════════════════════════════════

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "🚀 Ultimate AI Assistant Running!",
    version: "4.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", emoji: "✅" });
});

// Get available models
app.get("/api/chat/models", (req, res) => {
  const modelList = Object.entries(models).map(([key, value]) => ({ key, ...value }));
  res.json({ success: true, data: modelList });
});

// Chat info
app.get("/api/chat/info", (req, res) => {
  res.json({
    success: true,
    data: {
      botName: knowledgeBase?.bot?.name || "Ultimate AI",
      capabilities: "50+ real-time data sources",
      welcomeMessage: quickResponses.greetings[0]
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 💬 MAIN CHAT ENDPOINT
// ════════════════════════════════════════════════════════════════════════════════

app.post("/api/chat/message", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      message, 
      conversationId, 
      model = DEFAULT_MODEL,
      temperature = 0.7,
      enableSearch = true
    } = req.body;

    console.log(`\n📨 Message: "${message?.substring(0, 80)}..."`);

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: "❌ Message is required" }
      });
    }

    // Get or create conversation
    let conversation = conversations.get(conversationId);
    if (!conversation) {
      conversation = {
        id: conversationId || uuidv4(),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        model,
        title: message.substring(0, 50)
      };
      conversations.set(conversation.id, conversation);
    }
    conversation.updatedAt = new Date();

    // Check for quick response
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      const userMessage = { id: uuidv4(), role: "user", content: message, timestamp: new Date() };
      const assistantMessage = {
        id: uuidv4(),
        role: "assistant",
        content: quickResponse,
        timestamp: new Date(),
        model: "Quick Response",
        responseTime: Date.now() - startTime
      };
      conversation.messages.push(userMessage, assistantMessage);

      return res.json({
        success: true,
        data: { 
          conversationId: conversation.id, 
          message: assistantMessage,
          responseTime: `${Date.now() - startTime}ms`
        }
      });
    }

    // Gather knowledge from all sources
    let knowledgeContext = "";
    let sourcesUsed = [];

    if (enableSearch) {
      console.log("🔍 Gathering knowledge...");
      const knowledge = await gatherKnowledge(message);
      
      // Track sources used
      const sourceLabels = {
        time: "🕐 Time", date: "📅 Date", weather: "🌤️ Weather",
        currency: "💱 Currency", crypto: "📈 Crypto", news: "📰 News",
        country: "🌍 Country", dictionary: "📖 Dictionary", math: "🔢 Math",
        quote: "💬 Quote", joke: "😂 Joke", trivia: "🎯 Trivia",
        wikipedia: "📚 Wikipedia", webSearch: "🔍 Web Search"
      };

      Object.entries(sourceLabels).forEach(([key, label]) => {
        if (knowledge[key]) sourcesUsed.push(label);
      });

      knowledgeContext = buildContextFromKnowledge(knowledge);
      
      if (sourcesUsed.length > 0) {
        console.log(`📊 Sources used: ${sourcesUsed.join(", ")}`);
      }
    }

    // Build enhanced system prompt
    const basePrompt = buildSystemPrompt();
    const enhancedPrompt = buildEnhancedSystemPrompt(basePrompt, knowledgeContext);
    const modelConfig = models[model] || models[DEFAULT_MODEL];

    // Prepare API messages
    const apiMessages = [
      { role: "system", content: enhancedPrompt },
      ...conversation.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    // Call Groq API
    const assistantContent = await callGroqAPI(
      apiMessages, 
      modelConfig.id, 
      temperature, 
      modelConfig.maxTokens
    );

    const formattedContent = formatResponse(assistantContent);

    // Create messages
    const userMessage = { 
      id: uuidv4(), 
      role: "user", 
      content: message, 
      timestamp: new Date() 
    };
    
    const assistantMessage = {
      id: uuidv4(),
      role: "assistant",
      content: formattedContent,
      timestamp: new Date(),
      model: modelConfig.name,
      responseTime: Date.now() - startTime,
      reactions: { likes: 0, dislikes: 0 },
      sources: sourcesUsed.length > 0 ? sourcesUsed : undefined
    };

    conversation.messages.push(userMessage, assistantMessage);
    
    console.log(`⚡ Response time: ${Date.now() - startTime}ms | Sources: ${sourcesUsed.length}`);

    res.json({
      success: true,
      data: { 
        conversationId: conversation.id, 
        message: assistantMessage,
        responseTime: `${Date.now() - startTime}ms`,
        sourcesUsed
      }
    });

  } catch (error) {
    console.error("❌ Chat error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: `❌ ${error.message}` }
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 📡 STREAMING ENDPOINT
// ════════════════════════════════════════════════════════════════════════════════

app.post("/api/chat/stream", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      message, 
      conversationId, 
      model = DEFAULT_MODEL, 
      temperature = 0.7, 
      enableSearch = true 
    } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: { message: "❌ Message required" } });
    }

    let conversation = conversations.get(conversationId);
    if (!conversation) {
      conversation = {
        id: conversationId || uuidv4(),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        model,
        title: message.substring(0, 50)
      };
      conversations.set(conversation.id, conversation);
    }

    // Quick response check
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const assistantMessage = { 
        id: uuidv4(), 
        role: "assistant", 
        content: quickResponse, 
        timestamp: new Date(), 
        model: "Quick Response" 
      };
      conversation.messages.push(
        { id: uuidv4(), role: "user", content: message, timestamp: new Date() },
        assistantMessage
      );

      res.write(`data: ${JSON.stringify({ content: quickResponse, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation.id, messageId: assistantMessage.id })}\n\n`);
      res.end();
      return;
    }

    // Gather knowledge
    let knowledgeContext = "";
    let sourcesUsed = [];

    if (enableSearch) {
      const knowledge = await gatherKnowledge(message);
      const sourceLabels = {
        time: "🕐", weather: "🌤️", currency: "💱", crypto: "📈",
        news: "📰", country: "🌍", dictionary: "📖", math: "🔢",
        wikipedia: "📚", webSearch: "🔍"
      };
      Object.entries(sourceLabels).forEach(([key, emoji]) => {
        if (knowledge[key]) sourcesUsed.push(emoji);
      });
      knowledgeContext = buildContextFromKnowledge(knowledge);
    }

    const basePrompt = buildSystemPrompt();
    const enhancedPrompt = buildEnhancedSystemPrompt(basePrompt, knowledgeContext);
    const modelConfig = models[model] || models[DEFAULT_MODEL];

    const apiMessages = [
      { role: "system", content: enhancedPrompt },
      ...conversation.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (sourcesUsed.length > 0) {
      res.write(`data: ${JSON.stringify({ sources: sourcesUsed })}\n\n`);
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: modelConfig.id,
        messages: apiMessages,
        temperature,
        max_tokens: modelConfig.maxTokens,
        stream: true
      })
    });

    let fullContent = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            const formattedContent = formatResponse(fullContent);
            const assistantMessage = { 
              id: uuidv4(), 
              role: "assistant", 
              content: formattedContent, 
              timestamp: new Date(), 
              model: modelConfig.name,
              responseTime: Date.now() - startTime,
              sources: sourcesUsed.length > 0 ? sourcesUsed : undefined
            };
            
            conversation.messages.push(
              { id: uuidv4(), role: "user", content: message, timestamp: new Date() },
              assistantMessage
            );

            res.write(`data: ${JSON.stringify({ 
              done: true, 
              conversationId: conversation.id, 
              messageId: assistantMessage.id,
              responseTime: `${Date.now() - startTime}ms`
            })}\n\n`);
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            fullContent += content;
            res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
          } catch (e) {}
        }
      }
    }

  } catch (error) {
    console.error("Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: `❌ ${error.message}` })}\n\n`);
    res.end();
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 📚 CONVERSATION MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════════

app.get("/api/chat/conversations", (req, res) => {
  const all = Array.from(conversations.values()).map(c => ({
    id: c.id,
    title: c.title || c.messages[0]?.content?.substring(0, 50) || "💬 New Chat",
    messageCount: c.messages.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
  all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ success: true, data: all });
});

app.get("/api/chat/conversations/:id", (req, res) => {
  const conv = conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: { message: "Not found" } });
  res.json({ success: true, data: conv });
});

app.post("/api/chat/conversations", (req, res) => {
  const conv = { 
    id: uuidv4(), 
    messages: [], 
    createdAt: new Date(),
    updatedAt: new Date(),
    title: "💬 New Chat",
    model: req.body.model || DEFAULT_MODEL 
  };
  conversations.set(conv.id, conv);
  res.status(201).json({ success: true, data: conv });
});

app.delete("/api/chat/conversations/:id", (req, res) => {
  conversations.delete(req.params.id);
  res.json({ success: true });
});

app.delete("/api/chat/conversations", (req, res) => {
  conversations.clear();
  res.json({ success: true, message: "All conversations deleted" });
});

// Reactions
app.post("/api/chat/reaction", (req, res) => {
  const { conversationId, messageId, reaction } = req.body;
  const conversation = conversations.get(conversationId);
  if (!conversation) return res.status(404).json({ success: false });
  
  const message = conversation.messages.find(m => m.id === messageId);
  if (!message) return res.status(404).json({ success: false });
  
  if (!message.reactions) message.reactions = { likes: 0, dislikes: 0 };
  if (reaction === "like") message.reactions.likes++;
  else if (reaction === "dislike") message.reactions.dislikes++;
  
  res.json({ success: true, data: { reactions: message.reactions } });
});

// Cache management
app.get("/api/cache/stats", (req, res) => {
  res.json({ success: true, data: cache.getStats() });
});

app.delete("/api/cache/clear", (req, res) => {
  cache.clear();
  res.json({ success: true, message: "Cache cleared" });
});

// Direct API endpoints for testing
app.get("/api/time/:location", async (req, res) => {
  const result = await services.time.getWorldTime(req.params.location);
  res.json({ success: !!result, data: result });
});

app.get("/api/weather/:location", async (req, res) => {
  const result = await services.weather.getWeather(req.params.location);
  res.json({ success: !!result, data: result });
});

app.get("/api/search/:query", async (req, res) => {
  const result = await services.webSearch.smartSearch(req.params.query);
  res.json({ success: result.found, data: result });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: "❌ Not found" } });
});

// ════════════════════════════════════════════════════════════════════════════════
// 🖼️ IMAGE GENERATION ENDPOINT
// ════════════════════════════════════════════════════════════════════════════════

app.post("/api/chat/generate-image", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { prompt, conversationId } = req.body;
    
    if (!prompt?.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: "❌ Image prompt is required" }
      });
    }

    const timestamp = Date.now();
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${timestamp}`;

    let conversation = conversations.get(conversationId);
    if (conversation) {
      const userMessage = { 
        id: uuidv4(), 
        role: "user", 
        content: `Generate image: ${prompt}`, 
        timestamp: new Date() 
      };
      const assistantMessage = {
        id: uuidv4(),
        role: "assistant",
        content: `🎨 **Image Generated!**\n\n✅ Here's your image for: **"${prompt}"**`,
        timestamp: new Date(),
        model: "🖼️ Image Generator",
        image: { url: imageUrl, prompt },
        responseTime: Date.now() - startTime
      };
      conversation.messages.push(userMessage, assistantMessage);
    }

    res.json({
      success: true,
      data: {
        imageUrl,
        prompt,
        responseTime: `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error("Image generation error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: `❌ ${error.message}` }
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 🔄 MESSAGE REGENERATION
// ════════════════════════════════════════════════════════════════════════════════

app.post("/api/chat/regenerate", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId, messageId, model = DEFAULT_MODEL, temperature = 0.7 } = req.body;

    const conversation = conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { message: "❌ Conversation not found" } });
    }

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, error: { message: "❌ Message not found" } });
    }

    const userMessage = conversation.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== "user") {
      return res.status(400).json({ success: false, error: { message: "❌ Cannot regenerate" } });
    }

    // Gather fresh knowledge
    const knowledge = await gatherKnowledge(userMessage.content);
    const knowledgeContext = buildContextFromKnowledge(knowledge);
    const basePrompt = buildSystemPrompt();
    const enhancedPrompt = buildEnhancedSystemPrompt(basePrompt, knowledgeContext);

    const modelConfig = models[model] || models[DEFAULT_MODEL];

    const apiMessages = [
      { role: "system", content: enhancedPrompt },
      ...conversation.messages.slice(0, messageIndex - 1).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage.content }
    ];

    const newContent = await callGroqAPI(apiMessages, modelConfig.id, temperature, modelConfig.maxTokens);
    const formattedContent = formatResponse(newContent);

    // Update the message
    conversation.messages[messageIndex] = {
      ...conversation.messages[messageIndex],
      content: formattedContent,
      timestamp: new Date(),
      regenerated: true,
      responseTime: Date.now() - startTime
    };

    res.json({
      success: true,
      data: { 
        message: conversation.messages[messageIndex],
        responseTime: `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error("Regenerate error:", error.message);
    res.status(500).json({ success: false, error: { message: `❌ ${error.message}` } });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// ✏️ MESSAGE EDITING
// ════════════════════════════════════════════════════════════════════════════════

app.put("/api/chat/message/:conversationId/:messageId", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId, messageId } = req.params;
    const { content, model = DEFAULT_MODEL, temperature = 0.7 } = req.body;

    const conversation = conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { message: "❌ Conversation not found" } });
    }

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, error: { message: "❌ Message not found" } });
    }

    // Update the user message
    conversation.messages[messageIndex].content = content;
    conversation.messages[messageIndex].edited = true;
    
    // Remove all messages after this one
    conversation.messages = conversation.messages.slice(0, messageIndex + 1);

    // Generate new response
    const knowledge = await gatherKnowledge(content);
    const knowledgeContext = buildContextFromKnowledge(knowledge);
    const basePrompt = buildSystemPrompt();
    const enhancedPrompt = buildEnhancedSystemPrompt(basePrompt, knowledgeContext);

    const modelConfig = models[model] || models[DEFAULT_MODEL];

    const apiMessages = [
      { role: "system", content: enhancedPrompt },
      ...conversation.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const newContent = await callGroqAPI(apiMessages, modelConfig.id, temperature, modelConfig.maxTokens);
    const formattedContent = formatResponse(newContent);

    const assistantMessage = {
      id: uuidv4(),
      role: "assistant",
      content: formattedContent,
      timestamp: new Date(),
      model: modelConfig.name,
      responseTime: Date.now() - startTime
    };

    conversation.messages.push(assistantMessage);

    res.json({
      success: true,
      data: { 
        messages: conversation.messages,
        newMessage: assistantMessage,
        responseTime: `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error("Edit error:", error.message);
    res.status(500).json({ success: false, error: { message: `❌ ${error.message}` } });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 🔍 SEARCH CONVERSATIONS
// ════════════════════════════════════════════════════════════════════════════════

app.get("/api/chat/search", (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json({ success: true, data: [] });
  }

  const searchTerm = q.toLowerCase();
  const results = [];

  conversations.forEach((conv) => {
    const matchingMessages = conv.messages.filter(m => 
      m.content.toLowerCase().includes(searchTerm)
    );

    if (matchingMessages.length > 0 || conv.title?.toLowerCase().includes(searchTerm)) {
      results.push({
        id: conv.id,
        title: conv.title || conv.messages[0]?.content?.substring(0, 50) || "Chat",
        matchCount: matchingMessages.length,
        preview: matchingMessages[0]?.content?.substring(0, 100) || "",
        createdAt: conv.createdAt
      });
    }
  });

  res.json({ success: true, data: results });
});

// ════════════════════════════════════════════════════════════════════════════════
// 📤 EXPORT CONVERSATION
// ════════════════════════════════════════════════════════════════════════════════

app.get("/api/chat/export/:id", (req, res) => {
  const { id } = req.params;
  const { format = "json" } = req.query;

  const conversation = conversations.get(id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: { message: "❌ Not found" } });
  }

  if (format === "txt") {
    let text = `📄 Chat Export - ${conversation.title || "Conversation"}\n`;
    text += `📅 Date: ${new Date(conversation.createdAt).toLocaleString()}\n`;
    text += "═".repeat(60) + "\n\n";

    conversation.messages.forEach(m => {
      const role = m.role === "user" ? "👤 You" : "🤖 AI";
      text += `[${role}] ${new Date(m.timestamp).toLocaleTimeString()}\n`;
      text += m.content + "\n\n";
    });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="chat-${id}.txt"`);
    return res.send(text);
  }

  if (format === "md") {
    let md = `# 📄 ${conversation.title || "Chat Export"}\n\n`;
    md += `*🕐 Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    conversation.messages.forEach(m => {
      const role = m.role === "user" ? "👤 **You**" : "🤖 **AI Assistant**";
      md += `### ${role}\n\n`;
      md += m.content + "\n\n---\n\n";
    });

    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="chat-${id}.md"`);
    return res.send(md);
  }

  // Default: JSON
  res.json({ success: true, data: conversation });
});

// ════════════════════════════════════════════════════════════════════════════════
// 📝 RENAME CONVERSATION
// ════════════════════════════════════════════════════════════════════════════════

app.put("/api/chat/conversations/:id/rename", (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const conversation = conversations.get(id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: { message: "❌ Not found" } });
  }

  conversation.title = title;
  res.json({ success: true, data: { title } });
});

// ════════════════════════════════════════════════════════════════════════════════
// 🧪 DIRECT SERVICE TEST ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════════

// Crypto endpoint
app.get("/api/crypto/:name?", async (req, res) => {
  try {
    const result = req.params.name && req.params.name !== 'top'
      ? await services.finance.getCryptoPrice(req.params.name)
      : await services.finance.getTopCryptos(10);
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Currency endpoint
app.get("/api/currency/:base?", async (req, res) => {
  try {
    const result = await services.finance.getExchangeRates(req.params.base || "USD");
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Convert currency
app.get("/api/convert/:amount/:from/:to", async (req, res) => {
  try {
    const result = await services.finance.convertCurrency(
      parseFloat(req.params.amount),
      req.params.from,
      req.params.to
    );
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// News endpoint
app.get("/api/news/:category?", async (req, res) => {
  try {
    const result = await services.news.getNews(req.params.category || "technology");
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Country endpoint
app.get("/api/country/:name", async (req, res) => {
  try {
    const result = await services.geography.getCountryInfo(req.params.name);
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dictionary endpoint
app.get("/api/define/:word", async (req, res) => {
  try {
    const result = await services.webSearch.searchDictionary(req.params.word);
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Joke endpoint
app.get("/api/joke", async (req, res) => {
  try {
    const result = await services.entertainment.getJoke();
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quote endpoint
app.get("/api/quote", async (req, res) => {
  try {
    const result = await services.entertainment.getQuote();
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trivia endpoint
app.get("/api/trivia", async (req, res) => {
  try {
    const result = await services.entertainment.getTriviaQuestion();
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Wikipedia endpoint
app.get("/api/wiki/:query", async (req, res) => {
  try {
    const result = await services.webSearch.searchWikipedia(req.params.query);
    res.json({ success: !!result, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Password generator endpoint
app.get("/api/password/:length?", (req, res) => {
  const length = parseInt(req.params.length) || 16;
  const result = services.utility.generatePassword(length);
  res.json({ success: true, data: result });
});

// UUID generator endpoint
app.get("/api/uuid", (req, res) => {
  const result = services.utility.generateUUID();
  res.json({ success: true, data: result });
});

// QR Code endpoint
app.get("/api/qr", (req, res) => {
  const { text, size } = req.query;
  if (!text) {
    return res.status(400).json({ success: false, error: "Text is required" });
  }
  const result = services.utility.generateQRCode(text, parseInt(size) || 200);
  res.json({ success: true, data: result });
});

// Calculate endpoint
app.get("/api/calculate/:expression", (req, res) => {
  const result = services.math.evaluateMathExpression(decodeURIComponent(req.params.expression));
  res.json({ success: !!result, data: result });
});

// ════════════════════════════════════════════════════════════════════════════════
// 🚀 START SERVER
// ════════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                  🚀 ULTIMATE AI ASSISTANT v4.0 - RUNNING!                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🌐 Server: http://localhost:${PORT}                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  📊 MODULAR ARCHITECTURE WITH 50+ FREE APIs:                                  ║
║                                                                               ║
║  📁 services/                                                                 ║
║     ├── timeService.js      🕐 World Time, Dates, Holidays                    ║
║     ├── weatherService.js   🌤️ Weather, Air Quality                           ║
║     ├── financeService.js   💱 Currency, Crypto                               ║
║     ├── newsService.js      📰 News, Hacker News                              ║
║     ├── geographyService.js 🌍 Countries, Cities, IP Location                 ║
║     ├── entertainmentService.js 😂 Jokes, Quotes, Trivia                      ║
║     ├── mathService.js      🔢 Calculator, Unit Conversion                    ║
║     ├── scienceService.js   🚀 NASA, ISS, SpaceX                              ║
║     ├── utilityService.js   🔧 Password, QR Code, UUID                        ║
║     └── webSearchService.js 🔍 Wikipedia, DuckDuckGo, Fallback Search         ║
║                                                                               ║
║  📁 utils/                                                                    ║
║     ├── cache.js            💾 Smart Caching System                           ║
║     ├── queryAnalyzer.js    🧠 Intelligent Query Analysis                     ║
║     └── responseBuilder.js  📝 Context & Prompt Builder                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  ✨ FEATURES:                                                                 ║
║     • 🔍 Automatic Web Search Fallback when APIs don't have answers           ║
║     • 🧠 Smart Query Analysis with intent detection                           ║
║     • ⚡ Parallel API calls for fast responses                                ║
║     • 💾 Intelligent caching with TTL                                         ║
║     • 📡 Streaming responses                                                  ║
║     • 🖼️ Image generation                                                     ║
║     • 🔄 Message regeneration & editing                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🧪 TEST ENDPOINTS:                                                           ║
║     GET  /api/time/:location      - Time in any city                          ║
║     GET  /api/weather/:location   - Weather data                              ║
║     GET  /api/crypto/:name        - Crypto prices                             ║
║     GET  /api/currency/:base      - Exchange rates                            ║
║     GET  /api/news/:category      - News headlines                            ║
║     GET  /api/country/:name       - Country info                              ║
║     GET  /api/define/:word        - Dictionary                                ║
║     GET  /api/search/:query       - Web search                                ║
║     GET  /api/joke                - Random joke                               ║
║     GET  /api/quote               - Random quote                              ║
║     GET  /api/wiki/:query         - Wikipedia                                 ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🔑 Groq API: ${process.env.GROQ_API_KEY ? "✅ Connected" : "❌ Missing - Add GROQ_API_KEY to .env"}                                ║
║  📊 Default Model: ${DEFAULT_MODEL}                                             ║
║  💾 Cache: ✅ Enabled                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

🎯 EXAMPLE QUERIES:
   • "What time is it in Tokyo?"
   • "Weather in New York"
   • "Convert 100 USD to EUR"  
   • "Bitcoin price"
   • "Tell me about France"
   • "Define serendipity"
   • "Who was Albert Einstein?"
   • "Latest tech news"
   • "Tell me a joke"
  `);
});

// ════════════════════════════════════════════════════════════════════════════════
// 🛑 GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════════════════════

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

export default app;