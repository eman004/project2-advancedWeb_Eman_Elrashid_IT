# WeatherMap

A single page web app that shows live weather on an interactive map.
You type a location, the app finds its coordinates, centers the map on it,
and shows the current weather inside a popup. It also shows a 5-day forecast.

Made for the Advanced Web Technologies course (Project 2).

## Features

- Search any location by name
- Map centered on the location (Leaflet + OpenStreetMap)
- Current weather in a popup: temperature, description, humidity, wind
- 5-day forecast cards
- Loading spinner and friendly error messages
- Save favorite cities (stored in localStorage)
- Share the weather message (Web Share API or copy to clipboard)

## Built with

- HTML, CSS and plain JavaScript (no frameworks)
- [Leaflet](https://leafletjs.com/) and OpenStreetMap for the map
- [Nominatim](https://nominatim.org/) for geocoding
- [OpenWeatherMap API](https://openweathermap.org/api) for weather data

## How to run

1. Clone or download this repository.
2. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api).
3. Copy `config.example.js` and rename the copy to `config.js`.
4. Open `config.js` and replace `PUT_YOUR_API_KEY_HERE` with your key.
5. Open the folder in VS Code and run `index.html` with the Live Server extension.

Note: a new API key can take a while (up to 2 hours) to become active.

## Project structure

```
index.html          page structure
style.css           all the styling
app.js              map, API calls and app logic
config.try.js   template for the API key file
```

## Author

Eman Elrahid Abdalgader