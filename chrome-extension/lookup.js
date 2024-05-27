const url = "https://jeepweather.bump.us/api.php/3/";
const refreshPeriod = 30;
const inactivityTimeout = 5 * 60;
const debug = false;
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
let creating; // A global promise to avoid concurrency issues with offscreen document
importScripts('moment.min.js');

function dbgPrint(text){
   if(debug){
      console.log(text);
   }
}

chrome.contextMenus.removeAll(function() {
   chrome.contextMenus.create({"title": "Reload Weather", "contexts":["action"], "id": "reload"});

   chrome.contextMenus.onClicked.addListener( function(info, tab){
      dbgPrint("Context Menu was clicked " + info.menuItemId);
      if ("reload" == info.menuItemId){
         getLocation();
      }
   });
});

async function getWeatherInfo(position){
   dbgPrint("In getWeatherInfo()");
   var queryurl = url;
  if (null==position){
    dbgPrint("Getting weather data by IP");
    queryurl += "IP";
  }else if (position.hasOwnProperty('coords')){
    let locationcoordinates = position.coords.latitude + "," + position.coords.longitude;
    dbgPrint("Getting weather data for: ", locationcoordinates);
    queryurl += locationcoordinates;
  }else{
    //just use whatever string we got
    queryurl += position;
  }

   const response = await fetch(queryurl);

   dbgPrint("fetch resolved to a response");
   if(response.ok){
      var information = await response.json();
      var icon = "";
      var title = "";
      if(information['naked_jeep_weather']){
         dbgPrint("Good Jeep weather");
         icon="open-16.png";
         title = "Take your top off!!";
      }else{
         dbgPrint("Bad Jeep weather");
         icon="closed-16.png";
         title = "Put your top on!";
      }
      chrome.action.setIcon({path:icon});
      chrome.action.setBadgeText({text: information['current_temp']+""});
      if(information['rain_chance_time']!= null){
         title += " Rain is coming " + moment(information['rain_chance_time']*1000).calendar();
      }
      chrome.action.setTitle({title:title});
      chrome.storage.local.set({'weatherdata': information});
   }
}

function getWeatherInfoIP(position){
  //Calls getWeatherInfo() with a null object to handle getCurrentPosition() Errors
  //the position parameter is ignored, but will be passed by getCurrentPosition()'s
  //error handling
  getWeatherInfo(null);
}

async function getLocation(){
  dbgPrint("In getLocation()");
  items = await chrome.storage.local.get(['autoLocation', 'manualLocation']);
  console.log(items);
  if (items['autoLocation']){
    getGeoLocation();
  }
  else{
    dbgPrint("Getting weather for manual location");
    getWeatherInfo(items['manualLocation']);
  }
}

async function getGeoLocation(){
  dbgPrint("In getGeoLocation()");
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  try{
    geolocation = await chrome.runtime.sendMessage({
      type: 'get-geolocation',
      target: 'offscreen'
    });
  } catch (e) {
    geolocation = null;
  }
  await closeOffscreenDocument();

  getWeatherInfo(geolocation);

  //if(navigator.geolocation){
  //   navigator.geolocation.getCurrentPosition(getWeatherInfo, getWeatherInfoIP);
  //}else{
  //   dbgPrint("Geolocation is not supported by this browser.");
  //   getWeatherInfo(null);
  //}
}

async function hasDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const matchedClients = await clients.matchAll();

  return matchedClients.some(c => c.url === offscreenUrl)
}

async function setupOffscreenDocument(path) {
  //if we do not have a document, we are already setup and can skip
  if (!(await hasDocument())) {
    // create offscreen document
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.GEOLOCATION || chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'add justification for geolocation use here',
      });

      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function idleCheck(){
   dbgPrint("in idleCheck()");
   chrome.idle.queryState(inactivityTimeout,idleResults);
}

function idleResults(newState){
   dbgPrint("in idleResults() newState is: ", newState);
   if (newState=="active"){
      getLocation();
   }else{
      chrome.storage.local.set({'inactivity':true});
   }
}

async function onInit(){
  dbgPrint("in onInit()");
  chrome.alarms.create('refreshWeatherData', {periodInMinutes:refreshPeriod});
  await chrome.storage.local.set({'weatherdata': ""});
  await getLocation();
}

function onAlarm(alarm){
   dbgPrint("in onAlarm() ", alarm);
   if(alarm && alarm.name == 'refreshWeatherData'){
      chrome.action.setIcon({path:"unknown-16.png"});
      chrome.storage.local.set({'weatherdata': ""},idleCheck());
   }
}

function onIdleStateChanged(newState){
   dbgPrint("in onIdleStateChanged: new state is ", newState);
   if (newState=="active"){
      chrome.storage.local.get('inactivity', checkInactivity);
   }
}

function checkInactivity(result){
   dbgPrint("in checkInactivity()");
   if(result['inactivity']){
      chrome.storage.local.set({'inactivity':false});
      getLocation();
   }
}

//chrome.runtime.onMessage.addListener(handleMessages);
chrome.runtime.onInstalled.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.idle.onStateChanged.addListener(onIdleStateChanged);
chrome.idle.setDetectionInterval(inactivityTimeout);

