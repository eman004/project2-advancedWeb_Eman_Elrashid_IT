const GEO_URL = "https://nominatim.openstreetmap.org/search";
const NOW_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

let lastResult = null;   // what we searched most recently
let pin = null;          // the marker on the map

const form = document.getElementById("search-form");
const placeInput = document.getElementById("place");
const goBtn = document.getElementById("go-btn");
const loader = document.getElementById("loader");
const errorCard = document.getElementById("error-card");
const errorMsg = document.getElementById("error-msg");
const tools = document.getElementById("tools");
const favBtn = document.getElementById("fav-btn");
const msg = document.getElementById("msg");
const favsBox = document.getElementById("favs");
const forecastBox = document.getElementById("forecast");
const forecastCards = document.getElementById("forecast-cards");

// map
const map = L.map("map").setView([25, 20], 2);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);


function showLoader(on) {
  loader.classList.toggle("hidden", !on);
  goBtn.disabled = on;
}

function showError(text) {
  errorMsg.textContent = text;
  errorCard.classList.remove("hidden");
}

function showMsg(text) {
  msg.textContent = text;
  msg.classList.remove("hidden");
  setTimeout(function () { msg.classList.add("hidden"); }, 2500);
}

function iconSrc(code) {
  return "https://openweathermap.org/img/wn/" + code + "@2x.png";
}


async function getJSON(url) {
  const res = await fetch(url);
  if (res.status === 401) {
    throw new Error("The API key was rejected. If you just made it, give it a bit of time to activate.");
  }
  if (!res.ok) {
    throw new Error("Something went wrong with the request (" + res.status + ").");
  }
  return res.json();
}

// asks for the lat/lon of the place the user typed
async function findCoords(name) {
  const url = GEO_URL + "?q=" + encodeURIComponent(name) + "&format=json&limit=1";
  const data = await getJSON(url);
  if (data.length === 0) {
    throw new Error("Sorry, I couldn't find \"" + name + "\". Try another spelling?");
  }
  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    title: data[0].display_name.split(",")[0]
  };
}

function weatherUrl(base, lat, lon) {
  return base + "?lat=" + lat + "&lon=" + lon + "&units=metric&appid=" + API_KEY;
}

// builds the weather box that shows inside the map popup
function makePopup(w, title) {
  const box = document.createElement("div");

  const place = document.createElement("div");
  place.className = "iw-place";
  place.textContent = title;

  const row = document.createElement("div");
  row.className = "iw-row";
  const img = document.createElement("img");
  img.src = iconSrc(w.weather[0].icon);
  img.alt = w.weather[0].main;
  const temp = document.createElement("span");
  temp.className = "iw-temp";
  temp.textContent = Math.round(w.main.temp) + "°C";
  row.append(img, temp);

  const desc = document.createElement("div");
  desc.className = "iw-desc";
  desc.textContent = w.weather[0].description;

  const more = document.createElement("div");
  more.className = "iw-more";
  more.textContent = "Humidity " + w.main.humidity + "% | Wind " + w.wind.speed + " m/s";

  box.append(place, row, desc, more);
  return box;
}

// the api gives a reading every 3 hours so I group them by day here
function showForecast(data) {
  // the api gives a reading every 3 hours, so group them by date first
  const byDay = {};
  data.list.forEach(function (item) {
    const date = item.dt_txt.split(" ")[0];
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(item);
  });

  forecastCards.replaceChildren();

  Object.keys(byDay).slice(0, 5).forEach(function (date) {
    const readings = byDay[date];
    const temps = readings.map(function (r) { return r.main.temp; });

    // use the reading closest to midday as the "main" one
    let main = readings[0];
    readings.forEach(function (r) {
      const hour = Number(r.dt_txt.slice(11, 13));
      const mainHour = Number(main.dt_txt.slice(11, 13));
      if (Math.abs(hour - 12) < Math.abs(mainHour - 12)) main = r;
    });

    const card = document.createElement("div");
    card.className = "day";

    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", day: "numeric", month: "short"
    });

    const img = document.createElement("img");
    img.src = iconSrc(main.weather[0].icon);
    img.alt = main.weather[0].main;

    const t = document.createElement("div");
    t.className = "day-temp";
    t.textContent = Math.round(main.main.temp) + "°C";

    const range = document.createElement("div");
    range.className = "day-range";
    range.textContent = "L " + Math.round(Math.min(...temps)) + "° / H " + Math.round(Math.max(...temps)) + "°";

    const desc = document.createElement("div");
    desc.className = "day-desc";
    desc.textContent = main.weather[0].description;

    card.append(name, img, t, range, desc);
    forecastCards.appendChild(card);
  });

  forecastBox.classList.remove("hidden");
}


async function search(name) {
  errorCard.classList.add("hidden");
  showLoader(true);

  try {
    if (API_KEY === "PUT_YOUR_API_KEY_HERE") {
      throw new Error("You need to put your OpenWeatherMap key in config.js first.");
    }

    const spot = await findCoords(name);
    const now = await getJSON(weatherUrl(NOW_URL, spot.lat, spot.lon));
    const forecast = await getJSON(weatherUrl(FORECAST_URL, spot.lat, spot.lon));

    lastResult = { title: spot.title, weather: now };

    map.setView([spot.lat, spot.lon], 10);
    if (pin) map.removeLayer(pin);
    pin = L.marker([spot.lat, spot.lon]).addTo(map);
    pin.bindPopup(makePopup(now, spot.title), { minWidth: 170 }).openPopup();

    showForecast(forecast);
    tools.classList.remove("hidden");
    refreshFavBtn();
  } catch (err) {
    if (err instanceof TypeError) {
      showError("Couldn't reach the server. Check your internet connection.");
    } else {
      showError(err.message);
    }
  } finally {
    showLoader(false);
  }
}


// favorites live in localStorage
function getFavs() {
  try {
    return JSON.parse(localStorage.getItem("favCities")) || [];
  } catch (e) {
    return [];
  }
}

function setFavs(list) {
  localStorage.setItem("favCities", JSON.stringify(list));
}

function drawFavs() {
  favsBox.replaceChildren();

  getFavs().forEach(function (city) {
    const chip = document.createElement("div");
    chip.className = "fav";

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "fav-name";
    nameBtn.textContent = city;
    nameBtn.addEventListener("click", function () {
      placeInput.value = city;
      search(city);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "fav-del";
    delBtn.textContent = "×";
    delBtn.setAttribute("aria-label", "Remove " + city);
    delBtn.addEventListener("click", function () {
      setFavs(getFavs().filter(function (c) { return c !== city; }));
      drawFavs();
      refreshFavBtn();
    });

    chip.append(nameBtn, delBtn);
    favsBox.appendChild(chip);
  });
}

function refreshFavBtn() {
  if (!lastResult) return;
  const saved = getFavs().includes(lastResult.title);
  favBtn.textContent = saved ? "Saved ✓" : "Save to favorites";
}

function toggleFav() {
  if (!lastResult) return;
  const favs = getFavs();
  const city = lastResult.title;
  if (favs.includes(city)) {
    setFavs(favs.filter(function (c) { return c !== city; }));
  } else {
    favs.push(city);
    setFavs(favs);
  }
  drawFavs();
  refreshFavBtn();
}


async function shareWeather() {
  if (!lastResult) return;
  const w = lastResult.weather;
  const text = "Weather in " + lastResult.title + ": " + Math.round(w.main.temp) + "°C, " +
    w.weather[0].description + ". Humidity " + w.main.humidity + "%, wind " + w.wind.speed + " m/s.";

  if (navigator.share) {
    try {
      await navigator.share({ title: "WeatherMap", text: text });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    showMsg("Copied to clipboard!");
  } catch (err) {
    showError("Couldn't copy the message. Your browser may have blocked it.");
  }
}


form.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = placeInput.value.trim();
  if (name === "") {
    showError("Type a location first.");
    return;
  }
  search(name);
});

document.getElementById("error-x").addEventListener("click", function () {
  errorCard.classList.add("hidden");
});
document.getElementById("share-btn").addEventListener("click", shareWeather);
favBtn.addEventListener("click", toggleFav);

drawFavs();
