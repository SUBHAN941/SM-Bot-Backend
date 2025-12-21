// services/entertainmentService.js - Jokes, Quotes, Trivia, Facts

import cache from '../utils/cache.js';

/**
 * 😂 Get a joke
 */
export async function getJoke(category = "Any") {
  try {
    const url = `https://v2.jokeapi.dev/joke/${category}?blacklistFlags=nsfw,religious,political,racist,sexist`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.error) return null;

    if (data.type === "single") {
      return { 
        joke: data.joke, 
        type: "single", 
        category: data.category, 
        source: "JokeAPI" 
      };
    } else {
      return { 
        setup: data.setup, 
        delivery: data.delivery, 
        type: "twopart", 
        category: data.category, 
        source: "JokeAPI" 
      };
    }
  } catch (error) {
    console.error("Joke error:", error.message);
    return null;
  }
}

/**
 * 💬 Get an inspirational quote
 */
export async function getQuote(category = "") {
  try {
    const url = category 
      ? `https://api.quotable.io/random?tags=${category}`
      : 'https://api.quotable.io/random';
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();
    
    return {
      quote: data.content,
      author: data.author,
      tags: data.tags,
      length: data.length,
      source: "Quotable API"
    };
  } catch (error) {
    console.error("Quote error:", error.message);
    return null;
  }
}

/**
 * 🎯 Get a trivia question
 */
export async function getTriviaQuestion(category = null, difficulty = "medium") {
  try {
    let url = `https://opentdb.com/api.php?amount=1&difficulty=${difficulty}&type=multiple`;
    if (category) url += `&category=${category}`;
    
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const q = data.results[0];
      const decode = (str) => str
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&eacute;/g, "é")
        .replace(/&ouml;/g, "ö");
      
      return {
        question: decode(q.question),
        correctAnswer: decode(q.correct_answer),
        incorrectAnswers: q.incorrect_answers.map(decode),
        allAnswers: [decode(q.correct_answer), ...q.incorrect_answers.map(decode)].sort(() => Math.random() - 0.5),
        category: decode(q.category),
        difficulty: q.difficulty,
        source: "Open Trivia DB"
      };
    }
    return null;
  } catch (error) {
    console.error("Trivia error:", error.message);
    return null;
  }
}

/**
 * 🎲 Get a random fact
 */
export async function getRandomFact(type = "trivia") {
  try {
    const url = `http://numbersapi.com/random/${type}?json`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    return {
      fact: data.text,
      number: data.number,
      type: data.type,
      source: "Numbers API"
    };
  } catch (error) {
    console.error("Random fact error:", error.message);
    return null;
  }
}

/**
 * 🐱 Get a cat fact
 */
export async function getCatFact() {
  try {
    const response = await fetch('https://catfact.ninja/fact', { timeout: 5000 });
    const data = await response.json();
    return { fact: data.fact, source: "Cat Facts API" };
  } catch (error) {
    return null;
  }
}

/**
 * 🐕 Get a dog fact
 */
export async function getDogFact() {
  try {
    const response = await fetch('https://dog-api.kinduff.com/api/facts', { timeout: 5000 });
    const data = await response.json();
    return { fact: data.facts?.[0], source: "Dog Facts API" };
  } catch (error) {
    return null;
  }
}

export default {
  getJoke,
  getQuote,
  getTriviaQuestion,
  getRandomFact,
  getCatFact,
  getDogFact
};