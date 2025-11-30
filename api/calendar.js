// api/calendar.js
// Scraper de ForexFactory con filtrado USD Medium/High

import fetch from "node-fetch";
import cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const url = "https://www.forexfactory.com/calendar.php?day=today";

    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36"
      },
      timeout: 10000
    });

    const html = await resp.text();
    const $ = cheerio.load(html);

    const events = [];

    $("tr.calendar__row, tr.calendar_row, tr[class*='calendar']").each((i, el) => {
      const row = $(el);

      const time = row.find(".time, .calendar__time").first().text().trim();
      const title =
        row.find(".event, .calendar__event").first().text().trim() ||
        row.find("a").first().text().trim();
      const currency = row.find(".currency, .calendar__currency-code").first().text().trim();

      let impact =
        row.find(".impact img").attr("title") ||
        row.find(".impact").text().trim();

      const forecast = row.find(".forecast").text().trim() || null;
      const actual = row.find(".actual").text().trim() || null;
      const previous = row.find(".previous").text().trim() || null;

      if (!title || !currency) return;

      events.push({
        id: `${currency}|${title}|${time}|${i}`,
        title,
        time,
        currency,
        impact,
        forecast,
        actual,
        previous
      });
    });

    const filtered = events.filter(ev => {
      const c = ev.currency.toUpperCase();
      const i = (ev.impact || "").toLowerCase();
      const usd = c.includes("USD");
      const high = i.includes("high");
      const med = i.includes("med");

      return usd && (high || med);
    });

    return res.status(200).json({
      date: new Date().toISOString().split("T")[0],
      events: filtered
    });

  } catch (e) {
    return res.status(500).json({
      error: "Scrape failed",
      detail: e.message
    });
  }
}
