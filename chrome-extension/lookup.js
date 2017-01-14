var xmlhttp = new XMLHttpRequest();
var url = "https://jeepweather.bump.us/api.php/1/";
var refreshPeriod = 30;

xmlhttp.onreadystatechange = function(){
   console.log("in onreadystatechange()");
   if (this.readyState == 4 && this.status == 200){
      var information = JSON.parse(this.responseText);
      var icon = "";
      if(information['jeepweather']){
         console.log("Good Jeep weather");
         icon="open-16.png";
      }else{
         console.log("Bad Jeep weather");
         icon="closed-16.png";
      }
      chrome.browserAction.setIcon({path:icon});
      chrome.storage.local.set({'weatherdata': information});
   }
};

function getWeatherInfo(position){
   console.log("In getWeatherInfo()");
   var locationcoordinates = position.coords.latitude + "," + position.coords.longitude;
   console.log("Getting weather data for: ", locationcoordinates);
   xmlhttp.open("GET", url + locationcoordinates, true);
   xmlhttp.send();
}

function getLocation(){
   console.log("In getLocation()");
   if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(getWeatherInfo);
   }else{
      console.log("Geolocaiton is not supported by this browser.");
   }
}

function onInit(){
   console.log("in onInit()");
   chrome.alarms.create('refreshWeatherData', {periodInMinutes:refreshPeriod});
   chrome.storage.local.set({'weatherdata': ""},getLocation());
}

function onAlarm(alarm){
   console.log("in onAlarm()", alarm);
   if(alarm && alarm.name == 'refreshWeatherData'){
      chrome.browerAction.setIcon({path:unknown-16.png});
      chrome.storage.local.set({'weatherdata': ""},getLocation());
   }
}

chrome.runtime.onInstalled.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);
