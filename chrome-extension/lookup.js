var xmlhttp = new XMLHttpRequest();
var url = "https://jeepweather.bump.us/api.php/2/";
var refreshPeriod = 30;
var inactivityTimeout = 5 * 60;
chrome.contextMenus.create({"title": "Reload Weather", "contexts":["browser_action"], "id": "reload"}); 

chrome.contextMenus.onClicked.addListener( function(info, tab){
   console.log("Context Menu was clicked " + info.menuItemId);
   if ("reload" == info.menuItemId){
      getLocation();
   }
});

xmlhttp.onreadystatechange = function(){
   console.log("in onreadystatechange()");
   if (this.readyState == 4 && this.status == 200){
      var information = JSON.parse(this.responseText);
      var icon = "";
      var title = "";
      if(information['naked_jeep_weather']){
         console.log("Good Jeep weather");
         icon="open-16.png";
         title = "Take your top off!!";
      }else{
         console.log("Bad Jeep weather");
         icon="closed-16.png";
         title = "Put your top on!";
      }
      chrome.browserAction.setIcon({path:icon});
      chrome.browserAction.setBadgeText({text: information['current_temp']+""});
      if(information['rain_chance_time']!= null){
         title += " Rain is coming " + moment(information['rain_chance_time']*1000).calendar();
      }
      chrome.browserAction.setTitle({title:title});
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

function getWeatherInfoIP(position){
   console.log("Getting weather data for your estimated location");
   xmlhttp.open("GET", url + "IP", true);
   xmlhttp.send();
}

function getLocation(){
   console.log("In getLocation()");
   if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(getWeatherInfo, getWeatherInfoIP);
   }else{
      console.log("Geolocation is not supported by this browser.");
      getWeatherInfoIP(null);
   }
}

function idleCheck(){
   console.log("in idleCheck()");
   chrome.idle.queryState(inactivityTimeout,idleResults); 
}

function idleResults(newState){
   console.log("in idleResults() newState is: ", newState);
   if (newState=="active"){
      getLocation();
   }else{
      chrome.storage.local.set({'inactivity':true});
   }
}

function onInit(){
   console.log("in onInit()");
   chrome.alarms.create('refreshWeatherData', {periodInMinutes:refreshPeriod});
   chrome.storage.local.set({'weatherdata': ""},getLocation());
}

function onAlarm(alarm){
   console.log("in onAlarm() ", alarm);
   if(alarm && alarm.name == 'refreshWeatherData'){
      chrome.browserAction.setIcon({path:"unknown-16.png"});
      chrome.storage.local.set({'weatherdata': ""},idleCheck());
   }
}

function onIdleStateChanged(newState){
   console.log("in onIdleStateChanged: new state is ", newState);
   if (newState=="active"){
      chrome.storage.local.get('inactivity', checkInactivity);
   }
}

function checkInactivity(result){
   console.log("in checkInactivity()");
   if(result['inactivity']){
      chrome.storage.local.set({'inactivity':false});
      getLocation();
   }
}

chrome.runtime.onInstalled.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.idle.onStateChanged.addListener(onIdleStateChanged);
chrome.idle.setDetectionInterval(inactivityTimeout);

