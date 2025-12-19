import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { knowledgeBase, buildSystemPrompt } from "./knowledge.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const conversations = new Map();

// ✅ Enhanced Professional System Prompt Builder
function buildEnhancedSystemPrompt() {
  const basePrompt = buildSystemPrompt();
  
  const formattingInstructions = `

## 📋 RESPONSE FORMATTING RULES:

### Always use these formatting techniques:
1. **Use emojis** to make responses engaging and scannable
2. **Use bullet points** (•) for lists
3. **Use checkmarks** (✅) for completed items or confirmations
4. **Use headers** with emojis for sections
5. **Bold important terms** using **text**
6. Keep responses **concise but comprehensive**
7. Use numbered lists for steps or sequences
8. Add relevant emojis at the start of key points

### Emoji Usage Guide:
- ✅ For confirmations, completed items, yes answers
- ❌ For negations, errors, unavailable items
- 📌 For important notes or highlights
- 💡 For tips and suggestions
- ⚡ For quick facts or fast solutions
- 🎯 For goals, targets, or main points
- 📞 For contact information
- 📍 For locations or addresses
- ⏰ For time-related information
- 💰 For pricing or financial info
- 🔥 For trending or popular items
- ⭐ For ratings or special features
- 🛡️ For security or warranty info
- 📦 For shipping or delivery info
- 🎁 For offers, discounts, or promotions
- ℹ️ For general information
- ⚠️ For warnings or cautions
- 🚀 For new features or launches
- 💬 For customer support
- 📧 For email information

### Response Structure Template:
\`\`\`
[Greeting with emoji if appropriate]

[Main answer with relevant emojis]

📌 **Key Points:**
• Point 1
• Point 2
• Point 3

[Call to action or follow-up question if needed]
\`\`\`

### Professional Tone Guidelines:
- Be friendly yet professional
- Be helpful and solution-oriented
- Be concise - no unnecessary words
- Use active voice
- Personalize when possible
- End with a helpful follow-up or call to action
`;

  return basePrompt + formattingInstructions;
}

const systemPrompt = buildEnhancedSystemPrompt();

// Chat Models - Optimized for speed
const models = {
  "llama-3.1-8b": {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    description: "⚡ Ultra Fast",
    maxTokens: 1024,
  },
  "llama-3.3-70b": {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    description: "🎯 Most Powerful",
    maxTokens: 2048,
  },
  "gemma2-9b": {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    description: "🔷 Google's Model",
    maxTokens: 1024,
  },
};

const DEFAULT_MODEL = "llama-3.1-8b"; // Fastest model as default

// ✅ Call Groq API with timeout (5 seconds max)
async function callGroqAPI(messages, modelId, temperature = 0.7, maxTokens = 1024) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || "API failed");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Response timeout - please try again");
    }
    throw error;
  }
}

// ✅ Quick Response Templates for common queries
const quickResponses = {
  greetings: [
    "👋 Hello! Welcome! How can I assist you today?",
    "🌟 Hi there! Great to see you! What can I help you with?",
    "😊 Hey! I'm here to help. What do you need?",
  ],
  thanks: [
    "✅ You're welcome! Is there anything else I can help you with?",
    "🙏 My pleasure! Feel free to ask if you need anything else!",
    "😊 Happy to help! Let me know if you have more questions!",
  ],
  goodbye: [
    "👋 Goodbye! Have a great day ahead!",
    "🌟 Take care! Come back anytime you need help!",
    "😊 Bye for now! Wishing you all the best!",
  ],
};

// ✅ Check for quick response
function getQuickResponse(message) {
  const lower = message.toLowerCase().trim();
  
  // Greetings
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.]*$/i.test(lower)) {
    return quickResponses.greetings[Math.floor(Math.random() * quickResponses.greetings.length)];
  }
  
  // Thanks
  if (/^(thanks|thank you|thx|ty|appreciated)[\s!.]*$/i.test(lower)) {
    return quickResponses.thanks[Math.floor(Math.random() * quickResponses.thanks.length)];
  }
  
  // Goodbye
  if (/^(bye|goodbye|see you|later|take care)[\s!.]*$/i.test(lower)) {
    return quickResponses.goodbye[Math.floor(Math.random() * quickResponses.goodbye.length)];
  }
  
  return null;
}

// ✅ Format response with professional styling
function formatProfessionalResponse(content) {
  // Ensure proper spacing after emojis
  content = content.replace(/([✅❌📌💡⚡🎯📞📍⏰💰🔥⭐🛡️📦🎁ℹ️⚠️🚀💬📧👋🌟😊🙏])(\w)/g, "$1 $2");
  
  // Ensure bullet points are properly formatted
  content = content.replace(/^[-*]\s/gm, "• ");
  
  // Add line breaks before headers
  content = content.replace(/([^\n])(#{1,3}\s)/g, "$1\n\n$2");
  
  return content.trim();
}

// Routes
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "🚀 AI Chat Backend Running!",
    version: "2.0.0",
    features: ["✅ Fast Responses", "✅ Professional Formatting", "✅ Emoji Support"]
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    emoji: "✅",
    responseTime: "< 5s guaranteed"
  });
});

app.get("/api/chat/info", (req, res) => {
  res.json({
    success: true,
    data: {
      botName: knowledgeBase.bot.name,
      companyName: knowledgeBase.company.name,
      welcomeMessage: `👋 ${knowledgeBase.bot.welcomeMessage}`,
      features: [
        "⚡ Lightning fast responses",
        "✅ Professional formatting",
        "🎯 Accurate information",
        "💬 24/7 availability"
      ]
    },
  });
});

app.get("/api/chat/models", (req, res) => {
  const modelList = Object.entries(models).map(([key, value]) => ({ 
    key, 
    ...value,
    recommended: key === "llama-3.1-8b" ? "⚡ Fastest" : null
  }));
  res.json({ success: true, data: modelList });
});

// ✅ Main Chat Endpoint - Optimized for speed and professional responses
app.post("/api/chat/message", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      message, 
      conversationId, 
      model = DEFAULT_MODEL,
      temperature = 0.6, // Slightly lower for more consistent formatting
      systemPromptOverride = null 
    } = req.body;

    console.log("📨 Message:", message?.substring(0, 50));

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: "❌ Message is required" },
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
        title: message.substring(0, 50),
      };
      conversations.set(conversation.id, conversation);
    }

    conversation.updatedAt = new Date();

    const lowerMessage = message.toLowerCase();

    // ✅ Check for quick response first (instant response)
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      const userMessage = {
        id: uuidv4(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      const assistantMessage = {
        id: uuidv4(),
        role: "assistant",
        content: quickResponse,
        timestamp: new Date(),
        model: "Quick Response",
        responseTime: Date.now() - startTime,
        reactions: { likes: 0, dislikes: 0 },
      };

      conversation.messages.push(userMessage, assistantMessage);

      return res.json({
        success: true,
        data: { 
          conversationId: conversation.id, 
          message: assistantMessage,
          responseTime: `${Date.now() - startTime}ms`
        },
      });
    }

    // Image Generation
    const imageGenKeywords = ["generate image", "create image", "/image", "/draw"];
    const wantsImageGen = imageGenKeywords.some(k => lowerMessage.includes(k));

    if (wantsImageGen) {
      let imagePrompt = message;
      imageGenKeywords.forEach(k => {
        imagePrompt = imagePrompt.replace(new RegExp(k, "gi"), "").trim();
      });
      imagePrompt = imagePrompt || "beautiful landscape";

      const encodedPrompt = encodeURIComponent(imagePrompt);
      const timestamp = Date.now();
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${timestamp}`;

      const userMessage = {
        id: uuidv4(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      const assistantMessage = {
        id: uuidv4(),
        role: "assistant",
        content: `🎨 **Image Generated Successfully!**\n\n✅ Here's your image for: **"${imagePrompt}"**\n\n📌 *Click to view full size*`,
        timestamp: new Date(),
        model: "🖼️ Image Generator",
        image: { url: imageUrl, prompt: imagePrompt, width: 1024, height: 1024 },
        responseTime: Date.now() - startTime,
      };

      conversation.messages.push(userMessage, assistantMessage);

      return res.json({
        success: true,
        data: { 
          conversationId: conversation.id, 
          message: assistantMessage,
          responseTime: `${Date.now() - startTime}ms`
        },
      });
    }

    // Regular Chat with Groq API
    const modelConfig = models[model] || models[DEFAULT_MODEL];
    const activeSystemPrompt = systemPromptOverride || systemPrompt;

    const apiMessages = [
      { role: "system", content: activeSystemPrompt },
      ...conversation.messages.slice(-8).map((m) => ({ // Reduced context for speed
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const assistantContent = await callGroqAPI(
      apiMessages, 
      modelConfig.id, 
      temperature,
      modelConfig.maxTokens
    );

    const formattedContent = formatProfessionalResponse(assistantContent);

    const userMessage = {
      id: uuidv4(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    const assistantMessage = {
      id: uuidv4(),
      role: "assistant",
      content: formattedContent,
      timestamp: new Date(),
      model: modelConfig.name,
      responseTime: Date.now() - startTime,
      reactions: { likes: 0, dislikes: 0 },
    };

    conversation.messages.push(userMessage, assistantMessage);

    console.log(`⚡ Response time: ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      data: { 
        conversationId: conversation.id, 
        message: assistantMessage,
        responseTime: `${Date.now() - startTime}ms`
      },
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    const errorMessage = error.message.includes("timeout") 
      ? "⏱️ Response took too long. Please try again!"
      : `❌ ${error.message}`;

    res.status(500).json({
      success: false,
      error: { 
        message: errorMessage,
        emoji: "❌"
      },
    });
  }
});

// ✅ Streaming endpoint - Optimized
app.post("/api/chat/stream", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      message, 
      conversationId, 
      model = DEFAULT_MODEL,
      temperature = 0.6 
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
        title: message.substring(0, 50),
      };
      conversations.set(conversation.id, conversation);
    }

    // Check for quick response
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const userMessage = { id: uuidv4(), role: "user", content: message, timestamp: new Date() };
      const assistantMessage = { id: uuidv4(), role: "assistant", content: quickResponse, timestamp: new Date(), model: "Quick Response" };
      conversation.messages.push(userMessage, assistantMessage);

      res.write(`data: ${JSON.stringify({ content: quickResponse, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation.id, messageId: assistantMessage.id })}\n\n`);
      res.end();
      return;
    }

    const modelConfig = models[model] || models[DEFAULT_MODEL];

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversation.messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      res.write(`data: ${JSON.stringify({ error: "⏱️ Timeout - please try again" })}\n\n`);
      res.end();
    }, 5000);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelConfig.id,
        messages: apiMessages,
        temperature,
        max_tokens: modelConfig.maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let fullContent = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            const formattedContent = formatProfessionalResponse(fullContent);
            
            const userMessage = { id: uuidv4(), role: "user", content: message, timestamp: new Date() };
            const assistantMessage = { 
              id: uuidv4(), 
              role: "assistant", 
              content: formattedContent, 
              timestamp: new Date(), 
              model: modelConfig.name,
              responseTime: Date.now() - startTime
            };
            conversation.messages.push(userMessage, assistantMessage);

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

// ✅ Regenerate response
app.post("/api/chat/regenerate", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId, messageId, model = DEFAULT_MODEL, temperature = 0.6 } = req.body;

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

    const modelConfig = models[model] || models[DEFAULT_MODEL];

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversation.messages.slice(0, messageIndex - 1).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage.content },
    ];

    const newContent = await callGroqAPI(apiMessages, modelConfig.id, temperature, modelConfig.maxTokens);
    const formattedContent = formatProfessionalResponse(newContent);

    conversation.messages[messageIndex] = {
      ...conversation.messages[messageIndex],
      content: formattedContent,
      timestamp: new Date(),
      regenerated: true,
      responseTime: Date.now() - startTime,
    };

    res.json({
      success: true,
      data: { 
        message: conversation.messages[messageIndex],
        responseTime: `${Date.now() - startTime}ms`
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, error: { message: `❌ ${error.message}` } });
  }
});

// ✅ Edit user message
app.put("/api/chat/message/:conversationId/:messageId", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId, messageId } = req.params;
    const { content, model = DEFAULT_MODEL, temperature = 0.6 } = req.body;

    const conversation = conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { message: "❌ Conversation not found" } });
    }

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, error: { message: "❌ Message not found" } });
    }

    conversation.messages[messageIndex].content = content;
    conversation.messages[messageIndex].edited = true;
    conversation.messages = conversation.messages.slice(0, messageIndex + 1);

    const modelConfig = models[model] || models[DEFAULT_MODEL];

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const newContent = await callGroqAPI(apiMessages, modelConfig.id, temperature, modelConfig.maxTokens);
    const formattedContent = formatProfessionalResponse(newContent);

    const assistantMessage = {
      id: uuidv4(),
      role: "assistant",
      content: formattedContent,
      timestamp: new Date(),
      model: modelConfig.name,
      responseTime: Date.now() - startTime,
    };

    conversation.messages.push(assistantMessage);

    res.json({
      success: true,
      data: { 
        messages: conversation.messages,
        newMessage: assistantMessage,
        responseTime: `${Date.now() - startTime}ms`
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, error: { message: `❌ ${error.message}` } });
  }
});

// ✅ Add reaction to message
app.post("/api/chat/reaction", (req, res) => {
  const { conversationId, messageId, reaction } = req.body;

  const conversation = conversations.get(conversationId);
  if (!conversation) {
    return res.status(404).json({ success: false, error: { message: "❌ Conversation not found" } });
  }

  const message = conversation.messages.find(m => m.id === messageId);
  if (!message) {
    return res.status(404).json({ success: false, error: { message: "❌ Message not found" } });
  }

  if (!message.reactions) {
    message.reactions = { likes: 0, dislikes: 0 };
  }

  if (reaction === "like") {
    message.reactions.likes += 1;
    message.userReaction = "like";
  } else if (reaction === "dislike") {
    message.reactions.dislikes += 1;
    message.userReaction = "dislike";
  }

  res.json({ 
    success: true, 
    data: { 
      reactions: message.reactions,
      emoji: reaction === "like" ? "👍" : "👎"
    } 
  });
});

// ✅ Rename conversation
app.put("/api/chat/conversations/:id/rename", (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const conversation = conversations.get(id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: { message: "❌ Not found" } });
  }

  conversation.title = title;
  res.json({ success: true, data: { title }, emoji: "✅" });
});

// ✅ Search conversations
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
        title: conv.title || conv.messages[0]?.content?.substring(0, 50) || "New Chat",
        matchCount: matchingMessages.length,
        preview: matchingMessages[0]?.content?.substring(0, 100) || "",
        createdAt: conv.createdAt,
        emoji: "🔍"
      });
    }
  });

  res.json({ success: true, data: results });
});

// ✅ Export conversation
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
    text += "═".repeat(50) + "\n\n";

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
      md += m.content + "\n\n";
    });

    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="chat-${id}.md"`);
    return res.send(md);
  }

  res.json({ success: true, data: conversation });
});

// Conversation routes
app.get("/api/chat/conversations", (req, res) => {
  const all = Array.from(conversations.values()).map((c) => ({
    id: c.id,
    title: c.title || c.messages[0]?.content?.substring(0, 50) || "💬 New Chat",
    messageCount: c.messages.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    emoji: "💬"
  }));
  all.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  res.json({ success: true, data: all });
});

app.get("/api/chat/conversations/:id", (req, res) => {
  const conv = conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: { message: "❌ Not found" } });
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
  res.status(201).json({ success: true, data: conv, emoji: "✅" });
});

app.delete("/api/chat/conversations/:id", (req, res) => {
  conversations.delete(req.params.id);
  res.json({ success: true, emoji: "🗑️" });
});

app.delete("/api/chat/conversations", (req, res) => {
  conversations.clear();
  res.json({ success: true, message: "🗑️ All conversations deleted", emoji: "✅" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: "❌ Not foundd" } });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🚀 AI Chat Backend Running! (v2.0)                 ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 Server: http://localhost:${PORT}                             ║
╠══════════════════════════════════════════════════════════════╣
║  ✨ Professional Features:                                   ║
║     ⚡ Fast responses (< 5 seconds)                          ║
║     ✅ Professional emoji formatting                         ║
║     📝 Quick response templates                              ║
║     🎯 Optimized for speed                                   ║
║     💬 Streaming support                                     ║
║     🔄 Regenerate responses                                  ║
║     ✏️  Edit messages                                         ║
║     👍 Message reactions                                     ║
║     🔍 Search conversations                                  ║
║     📤 Export chat (JSON/TXT/MD)                             ║
╚══════════════════════════════════════════════════════════════╝

🔑 Groq API: ${process.env.GROQ_API_KEY ? "✅ Connected" : "❌ Missing"}
⏱️  Max Response Time: 5 seconds
📊 Default Model: ${DEFAULT_MODEL} (Fastest)
  `);
});