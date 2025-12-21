// utils/responseBuilder.js - Build AI context from knowledge

/**
 * 📝 Build context string from gathered knowledge
 */
export function buildContextFromKnowledge(knowledge) {
  let context = "";

  // Time
  if (knowledge.time) {
    const t = knowledge.time;
    context += `\n\n🕐 CURRENT TIME in ${t.location}:
• Time: ${t.time} (${t.time24} 24-hour format)
• Date: ${t.date}
• Timezone: ${t.timezone}${t.abbreviation ? ` (${t.abbreviation})` : ''}
• UTC Offset: ${t.utcOffset}
${t.isDST !== undefined ? `• Daylight Saving: ${t.isDST ? 'Active' : 'Not active'}` : ''}
Source: ${t.source}`;
  }

  // Date
  if (knowledge.date) {
    const d = knowledge.date;
    context += `\n\n📅 DATE INFORMATION:
• Today: ${d.formatted}
• Day of Year: ${d.dayOfYear}
• Week Number: ${d.weekNumber}
• Quarter: Q${d.quarter}
• Days Left in Year: ${d.daysLeftInYear}
• Leap Year: ${d.isLeapYear ? 'Yes' : 'No'}
Source: ${d.source}`;
  }

  // Weather
  if (knowledge.weather) {
    const w = knowledge.weather;
    context += `\n\n🌤️ WEATHER in ${w.location}${w.country ? `, ${w.country}` : ''}:
• Temperature: ${w.current.temperature.celsius}°C (${w.current.temperature.fahrenheit}°F)
• Feels Like: ${w.current.feelsLike.celsius}°C
• Condition: ${w.current.condition}
• Humidity: ${w.current.humidity}
• Wind: ${w.current.windSpeed} ${w.current.windDirection}
• UV Index: ${w.current.uvIndex}
• Visibility: ${w.current.visibility}`;

    if (w.forecast?.length > 0) {
      context += `\n\n📅 FORECAST:`;
      w.forecast.forEach(day => {
        context += `\n• ${day.date}: ${day.condition}, High ${day.maxTemp.celsius}°C, Low ${day.minTemp.celsius}°C, Rain ${day.chanceOfRain}`;
      });
    }
    context += `\nSource: ${w.source}`;
  }

  // Currency
  if (knowledge.currency) {
    const c = knowledge.currency;
    if (c.formatted) {
      context += `\n\n💰 CURRENCY CONVERSION:
• ${c.formatted}
• Exchange Rate: 1 ${c.from} = ${parseFloat(c.rate).toFixed(4)} ${c.to}
• Date: ${new Date().toLocaleDateString()}
Source: ${c.source}`;
    } else if (c.popularRates) {
      context += `\n\n💱 EXCHANGE RATES (Base: ${c.base}):`;
      Object.entries(c.popularRates).forEach(([curr, rate]) => {
        if (rate && curr !== c.base) {
          context += `\n• 1 ${c.base} = ${parseFloat(rate).toFixed(4)} ${curr}`;
        }
      });
      context += `\nDate: ${c.date}\nSource: ${c.source}`;
    }
  }

  // Crypto
  if (knowledge.crypto) {
    const cr = knowledge.crypto;
    if (cr.cryptos) {
      context += `\n\n📈 TOP CRYPTOCURRENCIES:`;
      cr.cryptos.forEach(coin => {
        const changeIcon = parseFloat(coin.change24h) >= 0 ? '📈' : '📉';
        context += `\n${coin.rank}. ${coin.name} (${coin.symbol}): ${coin.priceFormatted} ${changeIcon} ${coin.change24h}`;
      });
    } else {
      const changeIcon = parseFloat(cr.change24h) >= 0 ? '📈' : '📉';
      context += `\n\n📈 ${cr.name.toUpperCase()} PRICE:
• USD: $${cr.prices.USD?.toLocaleString()}
• EUR: €${cr.prices.EUR?.toLocaleString()}
• GBP: £${cr.prices.GBP?.toLocaleString()}
• INR: ₹${cr.prices.INR?.toLocaleString()}
• 24h Change: ${changeIcon} ${cr.change24h}
• Market Cap: $${(cr.marketCap / 1e9).toFixed(2)} Billion`;
    }
    context += `\nSource: ${cr.source}`;
  }

  // News
  if (knowledge.news) {
    context += `\n\n📰 LATEST ${knowledge.news.topic?.toUpperCase() || ''} NEWS:`;
    knowledge.news.items?.forEach((item, i) => {
      context += `\n${i + 1}. ${item.title}`;
      if (item.description) context += `\n   ${item.description.substring(0, 150)}...`;
    });
    context += `\nSource: ${knowledge.news.source}`;
  }

  // Country
  if (knowledge.country) {
    const c = knowledge.country;
    context += `\n\n🌍 COUNTRY: ${c.name} ${c.flag || ''}
• Official Name: ${c.officialName}
• Capital: ${c.capital}
• Region: ${c.region} (${c.subregion})
• Population: ${c.population}
• Area: ${c.area}
• Languages: ${c.languages?.join(', ')}
• Currency: ${c.currencies?.map(cur => `${cur.name} (${cur.symbol})`).join(', ')}
• Calling Code: ${c.callingCode}
• Timezones: ${c.timezones?.join(', ')}
• UN Member: ${c.unMember ? 'Yes' : 'No'}
Source: ${c.source}`;
  }

  // Dictionary
  if (knowledge.dictionary) {
    const d = knowledge.dictionary;
    context += `\n\n📖 DEFINITION: "${d.word}" ${d.phonetic || ''}`;
    d.meanings?.forEach(m => {
      context += `\n\n[${m.partOfSpeech.toUpperCase()}]`;
      m.definitions?.forEach((def, i) => {
        context += `\n${i + 1}. ${def.definition}`;
        if (def.example) context += `\n   Example: "${def.example}"`;
      });
    });
    if (d.synonyms?.length > 0) context += `\n\nSynonyms: ${d.synonyms.join(', ')}`;
    context += `\nSource: ${d.source}`;
  }

  // Math
  if (knowledge.math) {
    context += `\n\n🔢 CALCULATION:
• Expression: ${knowledge.math.expression}
• Result: ${knowledge.math.result || knowledge.math.formatted}
Source: ${knowledge.math.source}`;
  }

  // Unit Conversion
  if (knowledge.unitConvert) {
    const u = knowledge.unitConvert;
    context += `\n\n📐 UNIT CONVERSION:
• ${u.value} ${u.fromUnit} = ${parseFloat(u.result).toFixed(4)} ${u.toUnit}
${u.formula ? `• Formula: ${u.formula}` : ''}
Source: ${u.source}`;
  }

  // Quote
  if (knowledge.quote) {
    context += `\n\n💬 INSPIRATIONAL QUOTE:
"${knowledge.quote.quote}"
— ${knowledge.quote.author}
${knowledge.quote.tags?.length > 0 ? `Tags: ${knowledge.quote.tags.join(', ')}` : ''}
Source: ${knowledge.quote.source}`;
  }

  // Joke
  if (knowledge.joke) {
    const j = knowledge.joke;
    context += `\n\n😂 JOKE (${j.category}):`;
    if (j.type === "single") {
      context += `\n${j.joke}`;
    } else {
      context += `\nQ: ${j.setup}\nA: ${j.delivery}`;
    }
    context += `\nSource: ${j.source}`;
  }

  // Trivia
  if (knowledge.trivia) {
    const t = knowledge.trivia;
    context += `\n\n🎯 TRIVIA QUESTION:
Category: ${t.category}
Difficulty: ${t.difficulty}
Q: ${t.question}
Correct Answer: ${t.correctAnswer}
Other Options: ${t.incorrectAnswers?.join(', ')}
Source: ${t.source}`;
  }

  // Web Search Fallback Results
  if (knowledge.webSearch) {
    const ws = knowledge.webSearch;
    if (ws.bestAnswer) {
      context += `\n\n🔍 WEB SEARCH RESULT:
Source: ${ws.bestAnswer.source}
${ws.bestAnswer.title ? `Title: ${ws.bestAnswer.title}` : ''}
${ws.bestAnswer.url ? `URL: ${ws.bestAnswer.url}` : ''}

Content:
${typeof ws.bestAnswer.content === 'string' 
  ? ws.bestAnswer.content 
  : JSON.stringify(ws.bestAnswer.content, null, 2)}`;
    }
  }

  // Wikipedia (if not from web search)
  if (knowledge.wikipedia && !knowledge.webSearch?.bestAnswer) {
    const w = knowledge.wikipedia;
    context += `\n\n📚 WIKIPEDIA: ${w.title}
${w.description ? `(${w.description})\n` : ''}
${w.summary}

URL: ${w.url}
Source: ${w.source}`;
  }

  // NASA
  if (knowledge.nasa) {
    const n = knowledge.nasa;
    context += `\n\n🚀 NASA ASTRONOMY PICTURE OF THE DAY:
Title: ${n.title}
Date: ${n.date}
${n.explanation?.substring(0, 500)}...
Image URL: ${n.url}
Source: ${n.source}`;
  }

  // ISS
  if (knowledge.iss) {
    context += `\n\n🛰️ ISS CURRENT LOCATION:
• Latitude: ${knowledge.iss.latitude}
• Longitude: ${knowledge.iss.longitude}
• View on Map: ${knowledge.iss.mapUrl}
• Timestamp: ${knowledge.iss.timestamp}
Source: ${knowledge.iss.source}`;
  }

  // People in Space
  if (knowledge.peopleInSpace) {
    const p = knowledge.peopleInSpace;
    context += `\n\n👨‍🚀 PEOPLE CURRENTLY IN SPACE: ${p.count} astronauts`;
    p.people?.forEach(person => {
      context += `\n• ${person.name} (${person.craft})`;
    });
    context += `\nSource: ${p.source}`;
  }

  // SpaceX
  if (knowledge.spacex) {
    const s = knowledge.spacex;
    context += `\n\n🚀 SPACEX ${s.launches ? 'RECENT LAUNCHES' : 'LATEST LAUNCH'}:`;
    if (s.launches) {
      s.launches.forEach(l => {
        context += `\n• ${l.name} (${l.date}) - ${l.success ? '✅ Success' : '❌ Failed'}`;
      });
    } else {
      context += `\n• Mission: ${s.name}
• Date: ${s.date}
• Status: ${s.success ? '✅ Success' : s.success === false ? '❌ Failed' : '⏳ Pending'}
• Details: ${s.details?.substring(0, 200)}...`;
    }
    context += `\nSource: ${s.source}`;
  }

  // Password
  if (knowledge.password) {
    context += `\n\n🔐 GENERATED PASSWORD:
Password: ${knowledge.password.password}
Length: ${knowledge.password.length} characters
Strength: ${knowledge.password.strength}
Source: ${knowledge.password.source}`;
  }

  // QR Code
  if (knowledge.qrCode) {
    context += `\n\n📱 QR CODE GENERATED:
Content: ${knowledge.qrCode.text}
QR Code URL: ${knowledge.qrCode.qrCodeUrl}
Size: ${knowledge.qrCode.size}
Source: ${knowledge.qrCode.source}`;
  }

  // UUID
  if (knowledge.uuid) {
    context += `\n\n🆔 GENERATED UUID:
${knowledge.uuid.uuid}
Version: ${knowledge.uuid.version}
Source: ${knowledge.uuid.source}`;
  }

  // Random Number
  if (knowledge.randomNumber) {
    context += `\n\n🎲 RANDOM NUMBER:
Result: ${knowledge.randomNumber.numbers}
Range: ${knowledge.randomNumber.min} to ${knowledge.randomNumber.max}
Source: ${knowledge.randomNumber.source}`;
  }

  return context;
}

/**
 * 🎯 Build enhanced system prompt with knowledge context
 */
export function buildEnhancedSystemPrompt(basePrompt, knowledgeContext = "") {
  const formatting = `

## RESPONSE FORMATTING GUIDELINES:

### Always follow these formatting rules:
1. **Use emojis** to make responses engaging and easy to scan
2. **Use bullet points** (•) for lists
3. **Bold important information** using **text**
4. Use headers with emojis for sections
5. Keep responses **comprehensive but well-organized**
6. Use numbered lists for steps or sequences

### Emoji Guide:
🕐 Time  📅 Date  🌤️ Weather  📰 News  💱 Currency  📈 Crypto
🌍 Geography  📖 Dictionary  🔢 Math  💬 Quotes  😂 Jokes
🚀 Space  ✅ Success  ❌ Error  💡 Tips  ⚡ Quick facts

### Response Quality:
- Use the provided data to give accurate, specific answers
- Always include relevant numbers, facts, and details
- Cite sources when using external information
- For time queries, ALWAYS show the actual time from the data
- Format currency with proper symbols
- Make complex information easy to understand`;

  const contextSection = knowledgeContext ? `

## 📊 REAL-TIME DATA (Use this to answer the query):
${knowledgeContext}

⚠️ IMPORTANT: Use the data above directly in your response. Present it in a user-friendly, conversational way.` : "";

  return basePrompt + formatting + contextSection;
}

export default {
  buildContextFromKnowledge,
  buildEnhancedSystemPrompt
};