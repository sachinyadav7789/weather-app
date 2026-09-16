const weatherForm=document.getElementById("weatherForm");
const cityInput=document.getElementById("cityInput");
const searchBtn=document.getElementById("searchBtn");
const statusBox=document.getElementById("status");
const weatherCard=document.getElementById("weatherCard");
const emptyState=document.getElementById("emptyState");
const locationEl=document.getElementById("location");
const conditionEl=document.getElementById("condition");
const temperatureEl=document.getElementById("temperature");
const feelsLikeEl=document.getElementById("feelsLike");
const humidityEl=document.getElementById("humidity");
const windEl=document.getElementById("wind");
const pressureEl=document.getElementById("pressure");
const visibilityEl=document.getElementById("visibility");
const coordinatesEl=document.getElementById("coordinates");
const updatedEl=document.getElementById("updated");
const weatherIcon=document.getElementById("weatherIcon");

function setStatus(message,type=""){
 statusBox.textContent=message;
 statusBox.className=`status ${type}`.trim();
}
function formatTime(timestamp){
 return new Intl.DateTimeFormat("en-IN",{hour:"2-digit",minute:"2-digit"}).format(new Date(timestamp*1000));
}
function renderWeather(data){
 const weather=data.weather?.[0];
 locationEl.textContent=`${data.name}${data.sys?.country?`, ${data.sys.country}`:""}`;
 conditionEl.textContent=weather?.description||"Weather data unavailable";
 temperatureEl.textContent=Math.round(data.main.temp);
 feelsLikeEl.textContent=Math.round(data.main.feels_like);
 humidityEl.textContent=`${data.main.humidity}%`;
 windEl.textContent=`${data.wind.speed} m/s`;
 pressureEl.textContent=`${data.main.pressure} hPa`;
 visibilityEl.textContent=data.visibility?`${(data.visibility/1000).toFixed(1)} km`:"—";
 coordinatesEl.textContent=`Lat ${data.coord.lat.toFixed(2)} · Lon ${data.coord.lon.toFixed(2)}`;
 updatedEl.textContent=`Updated ${formatTime(data.dt)}`;
 if(weather?.icon){
  weatherIcon.src=`https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  weatherIcon.alt=weather.description||"Weather icon";
  weatherIcon.hidden=false;
 }else weatherIcon.hidden=true;
 weatherCard.classList.remove("hidden");
 emptyState.classList.add("hidden");
 setStatus(`Live weather loaded for ${data.name}.`,"success");
}
async function fetchWeather(city){
 const cleanCity=city.trim();
 if(!cleanCity){setStatus("Please enter a city name.");return}
 searchBtn.disabled=true;
 setStatus(`Checking the weather in ${cleanCity}...`,"loading");
 try{
  const response=await fetch(`/api/weather?city=${encodeURIComponent(cleanCity)}`);
  const contentType=response.headers.get("content-type")||"";
  if(!contentType.includes("application/json")) throw new Error("Weather service is not responding correctly. Please try again.");
  const data=await response.json();
  if(!response.ok) throw new Error(data.message||"Unable to fetch weather data.");
  renderWeather(data);
 }catch(error){
  setStatus(error.message||"Something went wrong. Please try again.");
 }finally{searchBtn.disabled=false;}
}
weatherForm.addEventListener("submit",e=>{e.preventDefault();fetchWeather(cityInput.value);});
document.querySelectorAll("[data-city]").forEach(button=>{
 button.addEventListener("click",()=>{const city=button.dataset.city;cityInput.value=city;fetchWeather(city);});
});
