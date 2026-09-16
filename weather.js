export default async function handler(req, res) {
  const city = String(req.query?.city || "").trim();
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: "Weather service is not configured." });
  }

  if (!city) {
    return res.status(400).json({ message: "Please enter a city name." });
  }

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("q", city);
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(502).json({ message: "Weather API key is invalid." });
      }
      if (response.status === 404) {
        return res.status(404).json({ message: "City not found. Check the spelling." });
      }
      return res.status(response.status).json({
        message: data.message || "Weather service request failed."
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to reach weather service right now."
    });
  }
}
