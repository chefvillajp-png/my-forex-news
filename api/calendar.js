// api/calendar.js
// Serverless function para Vercel que intenta obtener calendario de ForexFactory
// Filtra eventos USD con impacto Medium/High
import fetch from "node-fetch";
import cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    // URL de ForexFactory (hoy). Si quieres otra fecha modifica 'day=today'
    const url = "https://www.forexfactory.com/calendar.php?day=today";

    const resp = await fetch(url, {
      headers: {
        // importante: simulamos un navegador
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36"
      },
      timeout: 10000
    });

    const html = await resp.text();
    const $ = cheerio.load(html);

    // Estructura aproximada: buscamos filas de calendario
    const events = [];

    // Selector general: ajustar si la web cambia.
    // Intenta buscar filas de la tabla del calendario
    $("tr.calendar__row, tr.calendar_row, tr[class*='calendar']").each((i, el) => {
      try {
        const row = $(el);

        // Hora (puede estar en una celda con class 'time' o 'calendar__time')
        const time = row.find(".time, .calendar__time, .time-cell, .calendar__time-cell").first().text().trim();

        // Título / nombre del evento
        const title =
          row.find(".event, .calendar__event, .news__item, .calendar__event-title").first().text().trim() ||
          row.find("a").first().text().trim();

        // Moneda / Country
        const currency = row.find(".country, .calendar__currency, .calendar__currency-code").first().text().trim();

        // Impacto (a veces es un icono con alt o title)
        let impact =
          row.find(".impact, .impact-level, .calendar__impact, img.impact").attr("title") ||
          row.find(".impact").text().trim() ||
          row.find(".importance").text().trim();

        // Forecast / Actual / Previous (si están)
        const forecast = row.find(".forecast, .calendar__forecast").text().trim() || null;
        const actual = row.find(".actual, .calendar__actual").text().trim() || null;
        const previous = row.find(".previous, .calendar__previous").text().trim() || null;

        // heurística: si no hay moneda o título, ignorar
        if (!title || !currency) return;

        // normalizar impact
        impact = (impact || "").replace(/\s+/g, " ").trim();

        events.push({
          id: `${currency}|${title}|${time}|${i}`,
          title,
          time,
          currency,
          impact,
          forecast: forecast || null,
          actual: actual || null,
          previous: previous || null
        });
      } catch (errRow) {
        // ignorar fila con error
      }
    });

    // Filtrar solo USD y impacto Medium/High (varias representaciones)
    const filtered = events.filter(ev => {
      const cur = (ev.currency || "").toUpperCase();
      const imp = (ev.impact || "").toLowerCase();
      const isUSD = cur.includes("USD") || cur.includes("US") || cur.includes("U.S.");
      const isHigh = imp.includes("high") || imp.includes("strong") || imp.includes("high impact");
      const isMedium = imp.includes("med") || imp.includes("medium");
      return isUSD && (isHigh || isMedium);
    });

    // Responder
    return res.status(200).json({
      date: new Date().toISOString().split("T")[0],
      source: "ForexFactory (scraped)",
      count_all: events.length,
      count_filtered: filtered.length,
      events: filtered
    });
  } catch (e) {
    return res.status(500).json({ error: "Scrape failed", detail: e.message || String(e) });
  }
}
export default function handler(req, res) {
  res.status(200).json({
    message: "Endpoint funcionando correctamente 🚀"
  });
}
