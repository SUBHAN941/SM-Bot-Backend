// services/financeService.js - Currency & Cryptocurrency Services

import cache from '../utils/cache.js';

/**
 * 💱 Get exchange rates
 */
export async function getExchangeRates(baseCurrency = "USD") {
  try {
    const cacheKey = `exchange_${baseCurrency}`;
    const cached = cache.get(cacheKey, 3600000); // 1 hour cache
    if (cached) return cached;

    const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency.toUpperCase()}`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    const result = {
      base: data.base,
      date: data.date,
      rates: data.rates,
      popularRates: {
        USD: data.rates.USD,
        EUR: data.rates.EUR,
        GBP: data.rates.GBP,
        JPY: data.rates.JPY,
        INR: data.rates.INR,
        CAD: data.rates.CAD,
        AUD: data.rates.AUD,
        CNY: data.rates.CNY,
        CHF: data.rates.CHF,
        SGD: data.rates.SGD,
        HKD: data.rates.HKD,
        KRW: data.rates.KRW,
        MXN: data.rates.MXN,
        BRL: data.rates.BRL,
        ZAR: data.rates.ZAR
      },
      source: "ExchangeRate-API"
    };

    cache.set(cacheKey, result, 3600000);
    return result;

  } catch (error) {
    console.error("Exchange rate error:", error.message);
    return null;
  }
}

/**
 * 💰 Convert currency
 */
export async function convertCurrency(amount, from, to) {
  try {
    const rates = await getExchangeRates(from.toUpperCase());
    if (!rates || !rates.rates[to.toUpperCase()]) return null;

    const rate = rates.rates[to.toUpperCase()];
    const converted = amount * rate;

    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount: amount,
      rate: rate,
      result: converted.toFixed(2),
      formatted: `${amount} ${from.toUpperCase()} = ${converted.toFixed(2)} ${to.toUpperCase()}`,
      source: "ExchangeRate-API"
    };
  } catch (error) {
    return null;
  }
}

/**
 * 📈 Get cryptocurrency price
 */
export async function getCryptoPrice(crypto = "bitcoin") {
  try {
    const cacheKey = `crypto_${crypto.toLowerCase()}`;
    const cached = cache.get(cacheKey, 60000); // 1 minute cache
    if (cached) return cached;

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto.toLowerCase()}&vs_currencies=usd,eur,gbp,inr,jpy,aud,cad,cny&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    const cryptoData = data[crypto.toLowerCase()];
    if (!cryptoData) return null;

    const result = {
      name: crypto.charAt(0).toUpperCase() + crypto.slice(1),
      prices: {
        USD: cryptoData.usd,
        EUR: cryptoData.eur,
        GBP: cryptoData.gbp,
        INR: cryptoData.inr,
        JPY: cryptoData.jpy,
        AUD: cryptoData.aud,
        CAD: cryptoData.cad,
        CNY: cryptoData.cny
      },
      change24h: cryptoData.usd_24h_change?.toFixed(2) + '%',
      marketCap: cryptoData.usd_market_cap,
      volume24h: cryptoData.usd_24h_vol,
      source: "CoinGecko"
    };

    cache.set(cacheKey, result, 60000);
    return result;

  } catch (error) {
    console.error("Crypto error:", error.message);
    return null;
  }
}

/**
 * 📊 Get top cryptocurrencies
 */
export async function getTopCryptos(limit = 10) {
  try {
    const cacheKey = `top_cryptos_${limit}`;
    const cached = cache.get(cacheKey, 120000); // 2 minute cache
    if (cached) return cached;

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&sparkline=false&price_change_percentage=24h`;
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    const result = {
      cryptos: data.map(coin => ({
        rank: coin.market_cap_rank,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        priceFormatted: '$' + coin.current_price.toLocaleString(),
        change24h: coin.price_change_percentage_24h?.toFixed(2) + '%',
        marketCap: coin.market_cap,
        marketCapFormatted: '$' + (coin.market_cap / 1e9).toFixed(2) + 'B',
        volume24h: coin.total_volume,
        image: coin.image
      })),
      source: "CoinGecko"
    };

    cache.set(cacheKey, result, 120000);
    return result;

  } catch (error) {
    console.error("Top cryptos error:", error.message);
    return null;
  }
}

export default {
  getExchangeRates,
  convertCurrency,
  getCryptoPrice,
  getTopCryptos
};