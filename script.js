const API_KEY = "f48de55a4d72d600c2294d8dcb2680a1";
const API_BASE = "https://api.openweathermap.org";
const weatherForm = document.getElementById("weatherForm");
const locationInput = document.getElementById("locationInput");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");
const statusBox = document.getElementById("status");
const statusText = document.getElementById("statusText");
const weatherCard = document.getElementById("weatherCard");
const emptyState = document.getElementById("emptyState");
const locationCard = document.getElementById("locationCard");
const rainCard = document.getElementById("rainCard");
const alertsCard = document.getElementById("alertsCard");
const forecastCard = document.getElementById("forecastCard");

let suggestionTimer = null;
let latestLocations = [];

const $ = id => document.getElementById(id);

function setStatus(message, type = "") {
  statusText.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
}

function formatTime(timestamp, timeZoneOffset = 0) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
    .format(new Date((timestamp + timeZoneOffset) * 1000));
}

function formatDay(timestamp, timeZoneOffset = 0) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date((timestamp + timeZoneOffset) * 1000));
}

async function apiFetch(path) {
  const response = await fetch(`${API_BASE}${path}${path.includes("?") ? "&" : "?"}appid=${API_KEY}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("API key rejected. Check the OpenWeather API key.");
    if (response.status === 404) throw new Error("Location not found. Try a nearby city, village, district or a fuller address.");
    throw new Error(data.message || "Weather service is temporarily unavailable.");
  }
  return data;
}

function buildAddress(place, reverse = {}) {
  const a = reverse.address || {};
  const parts = [a.road, a.neighbourhood, a.suburb, a.village, a.town, a.city, a.county, a.state, a.country].filter(Boolean);
  if (parts.length) return parts.filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
  return [place.name, place.state, place.country].filter(Boolean).join(", ");
}

function normalizeLocation(place, reverse = {}) {
  const a = reverse.address || {};
  return {
    full: buildAddress(place, reverse),
    village: a.village || a.hamlet || a.locality || place.name || "—",
    district: a.county || a.district || a.state_district || "—",
    city: a.city || a.town || a.municipality || (a.village ? "—" : place.name) || "—",
    state: a.state || place.state || "—",
    country: a.country || place.country || "—"
  };
}

function showSuggestions(items) {
  latestLocations = items;
  if (!items.length) { suggestions.classList.remove("show"); suggestions.innerHTML = ""; return; }
  suggestions.innerHTML = items.map((p, i) => `
    <button type="button" class="suggestion" data-index="${i}">
      <span class="suggestion-pin">⌖</span>
      <span><strong>${escapeText(p.name)}</strong><small>${escapeText([p.state, p.country].filter(Boolean).join(", "))}</small></span>
    </button>`).join("");
  suggestions.classList.add("show");
  suggestions.querySelectorAll(".suggestion").forEach(button => button.addEventListener("click", () => {
    const place = latestLocations[Number(button.dataset.index)];
    locationInput.value = [place.name, place.state, place.country].filter(Boolean).join(", ");
    suggestions.classList.remove("show");
    fetchWeather(place);
  }));
}

async function searchSuggestions(query) {
  if (query.trim().length < 2) { showSuggestions([]); return; }
  try {
    const data = await apiFetch(`/geo/1.0/direct?q=${encodeURIComponent(query.trim())}&limit=6`);
    showSuggestions(data);
  } catch (_) {
    showSuggestions([]);
  }
}

function getRainInfo(forecast) {
  const upcoming = forecast.list.slice(0, 16);
  const rainPoints = upcoming.map(item => ({
    time: formatTime(item.dt, forecast.city.timezone),
    chance: Math.round((item.pop || 0) * 100),
    amount: item.rain?.["3h"] || 0,
    timestamp: item.dt,
    desc: item.weather?.[0]?.description || "—"
  }));
  const peak = rainPoints.reduce((a, b) => b.chance > a.chance ? b : a, { chance: 0, amount: 0 });
  const rainOnly = rainPoints.filter(x => x.chance >= 30 || x.amount > 0);
  const totalAmount = rainPoints.reduce((sum, x) => sum + x.amount, 0);
  return { points: rainPoints, peak, rainOnly, totalAmount };
}

function renderWeather(data, forecast, place, reverse) {
  const weather = data.weather?.[0];
  const tz = data.timezone || 0;
  $("location").textContent = `${data.name}${data.sys?.country ? `, ${data.sys.country}` : ""}`;
  $("condition").textContent = weather?.description || "Weather data unavailable";
  $("addressLine").textContent = buildAddress(place, reverse);
  $("temperature").textContent = Math.round(data.main.temp);
  $("feelsLike").textContent = Math.round(data.main.feels_like);
  $("humidity").textContent = `${data.main.humidity}%`;
  $("wind").textContent = `${(data.wind.speed || 0).toFixed(1)} m/s`;
  $("pressure").textContent = `${data.main.pressure} hPa`;
  $("visibility").textContent = data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : "—";
  $("clouds").textContent = `${data.clouds?.all ?? 0}%`;
  $("sunTimes").textContent = `${formatTime(data.sys?.sunrise, tz)} / ${formatTime(data.sys?.sunset, tz)}`;
  $("updated").textContent = `Updated ${formatTime(data.dt, tz)}`;
  $("weatherTime").textContent = formatTime(data.dt, tz);
  $("coordinates").textContent = `Lat ${data.coord.lat.toFixed(2)} · Lon ${data.coord.lon.toFixed(2)}`;
  $("tempSummary").textContent = temperatureSummary(data.main.temp, data.main.feels_like);
  if (weather?.icon) { $("weatherIcon").src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`; $("weatherIcon").alt = weather.description || "Weather icon"; $("weatherIcon").hidden = false; }

  const info = getRainInfo(forecast);
  renderLocation(place, reverse);
  renderRain(info, forecast);
  renderAlerts(data, forecast, info);
  renderForecast(forecast);

  weatherCard.classList.add("visible");
  emptyState.classList.add("hidden");
  setStatus(`Live weather loaded for ${data.name}. Location and forecast analyzed.`, "success");
}

function temperatureSummary(temp, feels) {
  if (temp >= 40) return "Extreme heat — stay hydrated and limit exposure.";
  if (temp >= 35) return "Very hot — take heat precautions.";
  if (temp <= 5) return "Very cold — warm clothing recommended.";
  if (Math.abs(temp - feels) >= 5) return "Feels noticeably different from the actual temperature.";
  return "Comfort level is based on the current temperature and feels-like value.";
}

function renderLocation(place, reverse) {
  const loc = normalizeLocation(place, reverse);
  $("addressFull").textContent = loc.full;
  $("villageName").textContent = loc.village;
  $("districtName").textContent = loc.district;
  $("cityName").textContent = loc.city;
  $("stateName").textContent = loc.state;
  $("countryName").textContent = loc.country;
  locationCard.hidden = false;
}

function renderRain(info, forecast) {
  const peak = info.peak;
  const badge = peak.chance >= 70 ? "HIGH RAIN RISK" : peak.chance >= 40 ? "RAIN POSSIBLE" : "LOW CHANCE";
  $("rainChance").textContent = `${peak.chance}%`;
  $("rainBadge").textContent = badge;
  $("rainWindow").textContent = peak.chance >= 30 ? `${peak.time} · ${peak.desc}` : "No strong rain signal";
  $("rainAmount").textContent = `${info.totalAmount.toFixed(1)} mm / next forecast points`;
  $("rainTimeline").innerHTML = info.points.slice(0, 8).map(p => `<div class="rain-point"><span>${escapeText(p.time)}</span><div><i style="width:${Math.max(4,p.chance)}%"></i></div><strong>${p.chance}%</strong></div>`).join("");
  rainCard.hidden = false;
}

function renderAlerts(data, forecast, info) {
  const alerts = [];
  const temp = data.main.temp;
  const wind = (data.wind.speed || 0) * 3.6;
  const humidity = data.main.humidity;
  if (temp >= 40) alerts.push(["danger", "Extreme heat", "Temperature is 40°C or higher. Reduce direct sun exposure and stay hydrated."]);
  else if (temp >= 35) alerts.push(["warning", "High heat", "Temperature is very high. Heat precautions are recommended."]);
  if (wind >= 50) alerts.push(["danger", "Strong wind", `Wind is around ${wind.toFixed(0)} km/h. Secure loose outdoor items.`]);
  else if (wind >= 30) alerts.push(["warning", "Breezy conditions", `Wind is around ${wind.toFixed(0)} km/h.`]);
  if (info.peak.chance >= 70) alerts.push(["warning", "Rain likely", `Peak forecast rain chance is ${info.peak.chance}% around ${info.peak.time}.`]);
  if (info.totalAmount >= 20) alerts.push(["danger", "Heavy rain signal", `Forecast points indicate about ${info.totalAmount.toFixed(1)} mm of rain; local flooding can vary.`]);
  if (humidity >= 85 && temp >= 28) alerts.push(["info", "Very humid", "High humidity may make it feel warmer than the measured temperature."]);
  if (!alerts.length) alerts.push(["good", "No major automatic alert", "Current readings and the available forecast do not cross the app's alert thresholds."]);
  $("alertsList").innerHTML = alerts.map(([type, title, text]) => `<article class="alert ${type}"><span class="alert-icon">${type === "good" ? "✓" : type === "danger" ? "!" : "i"}</span><div><strong>${escapeText(title)}</strong><p>${escapeText(text)}</p></div></article>`).join("");
  alertsCard.hidden = false;
}

function renderForecast(forecast) {
  const days = new Map();
  forecast.list.forEach(item => {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date((item.dt + forecast.city.timezone) * 1000));
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(item);
  });
  $("forecastGrid").innerHTML = [...days.values()].slice(0, 5).map(items => {
    const item = items[Math.floor(items.length / 2)] || items[0];
    const max = Math.round(Math.max(...items.map(x => x.main.temp_max)));
    const min = Math.round(Math.min(...items.map(x => x.main.temp_min)));
    const pop = Math.round(Math.max(...items.map(x => (x.pop || 0) * 100)));
    return `<article class="forecast-day"><small>${escapeText(formatDay(item.dt, forecast.city.timezone))}</small><img src="https://openweathermap.org/img/wn/${item.weather?.[0]?.icon}@2x.png" alt=""><strong>${max}° <span>${min}°</span></strong><p>${escapeText(item.weather?.[0]?.description || "—")}</p><b>☂ ${pop}%</b></article>`;
  }).join("");
  forecastCard.hidden = false;
}

async function fetchWeather(selectedPlace) {
  const clean = typeof selectedPlace === "string" ? selectedPlace.trim() : [selectedPlace.name, selectedPlace.state, selectedPlace.country].filter(Boolean).join(", ");
  if (!clean) { setStatus("Please enter a location.", "error"); return; }
  searchBtn.disabled = true;
  suggestions.classList.remove("show");
  setStatus(`Finding ${clean}, then analyzing current weather and rain chances…`);
  try {
    let place = typeof selectedPlace === "object" ? selectedPlace : null;
    if (!place) {
      const locations = await apiFetch(`/geo/1.0/direct?q=${encodeURIComponent(clean)}&limit=1`);
      if (!locations.length) throw new Error("Location not found. Try adding district, state or country.");
      place = locations[0];
    }
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(place.lat)}&lon=${encodeURIComponent(place.lon)}&zoom=18&addressdetails=1`;
    const [weather, forecast, reverseResponse] = await Promise.all([
      apiFetch(`/data/2.5/weather?lat=${place.lat}&lon=${place.lon}&units=metric`),
      apiFetch(`/data/2.5/forecast?lat=${place.lat}&lon=${place.lon}&units=metric`),
      fetch(reverseUrl, { headers: { Accept: "application/json" } }).then(r => r.ok ? r.json() : {}).catch(() => ({}))
    ]);
    renderWeather(weather, forecast, place, reverseResponse);
  } catch (error) {
    setStatus(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    searchBtn.disabled = false;
  }
}

locationInput.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(() => searchSuggestions(locationInput.value), 300);
});

locationInput.addEventListener("focus", () => { if (locationInput.value.trim().length >= 2) searchSuggestions(locationInput.value); });

document.addEventListener("click", event => {
  if (!event.target.closest(".input-wrap")) suggestions.classList.remove("show");
});

weatherForm.addEventListener("submit", event => { event.preventDefault(); fetchWeather(locationInput.value); });

document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => {
  locationInput.value = button.dataset.query;
  fetchWeather(button.dataset.query);
}));
