# WeatherScope — Week 3 Weather App

A professional responsive weather application built for the Skill Nexis Week 3 assignment.

## Assignment requirements covered
- City name input
- Current temperature
- Humidity
- Weather condition
- OpenWeatherMap API
- JavaScript `fetch()`
- JSON parsing
- Responsive card UI

## Extra features
- Wind speed, pressure and visibility
- Feels-like temperature
- OpenWeather weather icon
- Popular city shortcuts
- Loading and error states
- Responsive desktop/mobile layout
- Server-side API proxy so the OpenWeather API key is not shipped to the browser

## Secure API setup for Vercel
The API key is **not** stored in `index.html` or `script.js`.

1. Deploy this project to Vercel.
2. Open the Vercel project → **Settings → Environment Variables**.
3. Add:
   - Name: `OPENWEATHER_API_KEY`
   - Value: your OpenWeatherMap API key
   - Environment: Production (and Preview/Development if needed)
4. Redeploy the project.
5. Open the website and search a city. Visitors do not enter an API key.

The browser calls `/api/weather?city=...`; the server-side function adds the secret API key before contacting OpenWeatherMap.

## Local development
For the secure proxy to work locally, use the Vercel CLI and a local `.env` file. Do not commit `.env` to GitHub.

Example `.env`:
```env
OPENWEATHER_API_KEY=your_real_key
```

## Important
Never put a real API key in `script.js`, `index.html`, README files, screenshots, or a public GitHub repository.
