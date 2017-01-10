var xmlhttp = new XMLHttpRequest();
var url = "https://jeepweather.bump.us/api.php/1/";

xmlhttp.onreadystatechange = function(){
   console.log("xmlhttp.onreadystatechange");
   if (this.readyState == 4 && this.status == 200){
      var information = JSON.parse(this.responseText);
      chrome.storage.local.set({'weatherdata': information});
      showStatus(information);
   }
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);

function getWeatherInfo(position){
   console.log("getWeatherInfo");
   var locationcoordinates = position.coords.latitude + "," + position.coords.longitude;
   document.getElementById("status").innerHTML = "Getting weather data for: " + locationcoordinates;
   xmlhttp.open("GET", url + locationcoordinates, true);
   xmlhttp.send();
}

function getLocation(){
   console.log("getLocation")
   if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(getWeatherInfo);
   }else{
      document.getElementById("status").innerHTML = "Geolocaiton is not supported by this browser.";
   }
}

function onDOMContentLoaded(){
   console.log("onDOMContentLoaded");
   chrome.storage.local.get('weatherdata', onGetWeatherData);
   document.getElementById("status").innerHTML = "Checking for weather data.";
}

function onGetWeatherData(result){
   console.log("onGetWeatherDAta");
   if (chrome.runtime.lastError) {
      console.log("Error retrieving weatherdata: " + chrome.runtime.lastError);
      getLocation();
      document.getElementById("status").innerHTML = "Getting location";
   }else{
     console.log("found weatherdata in storage");
     console.log(JSON.stringify(result));
     if (null == result['weatherdata']){
        console.log("Weatherdata is empty")
        getLocation();
        document.getElementById("status").innerHTML = "Getting location";
     }else{
        showStatus(result['weatherdata']);
     }
   }
}

function showStatus(myStatus){
   console.log("showStatus");
   var statustext = "";
   var icon = "";
   var rain_time = "Rain is coming ";
   if (myStatus["naked_jeep_weather"]!= null){
      if(myStatus["naked_jeep_weather"]){
         statustext = "Take your top off!!";
         icon = "open.png";
      }else{
         statustext = "Put your top on!";
         icon = "closed.png";
      }
      document.getElementById("status").innerHTML = statustext;
      chrome.browserAction.setIcon({path:icon});
   }

   if (myStatus["rain_chance_time"]!=null){
      rain_time += getPrintedTime(myStatus["rain_chance_time"],1); 
      document.getElementById("time").innerHTML = rain_time;
   }

   if ('next_hour_rain_chance' in myStatus){
      document.getElementById("rain_minute").innerHTML = "<h2>Next Hour Rain Chance</h2>";
      document.getElementById("rain_minute").innerHTML += populateWeatherGraphs(myStatus["next_hour_rain_chance"],true);
   }
   document.getElementById("rain_hour").innerHTML = "<h2>Next Two Days Rain Chance</h2>";
   document.getElementById("rain_hour").innerHTML += populateWeatherGraphs(myStatus["next_two_day_rain_chance"],true);

   document.getElementById("rain_day").innerHTML = "<h2>Next Week Rain Chance</h2>";
   document.getElementById("rain_day").innerHTML += populateWeatherGraphs(myStatus["next_week_rain_chance"],false);
}

function getPrintedTime(time, timeanddate){
      var d = new Date(1000*time);
      var hour;
      var ampm;
      if(d.getHours()<12){
         ampm='am';
      }else{
         ampm='pm';
      }
      if(d.getHours()==0){
         hour=12;
      }else{
         if (d.getHours()>12){
            hour=d.getHours()-12;
         }else{
            hour=d.getHours();
         }
      }

      if(timeanddate){
         return getDayName(d) + " at " + hour + ':' + ('0' + d.getMinutes()).slice(-2) + ampm +'.';
      }else{
         return getDayName(d);
      }
}


function getDayName(d){
   var now = new Date();
   var day = ""
   switch(d.getDate()-now.getDate()){
      case 0:
         day = "today";
         break;
      case 1:
         day = "tomorrow";
         break;
      default:
         switch(d.getDay()){
            case 0:
               day = "Sunday";
               break;
            case 1:
               day = "Monday";
               break;
            case 2:
               day = "Tuesday";
               break;
            case 3:
               day = "Wednesday";
               break;
            case 4:
               day = "Thursday";
               break;
            case 5:
               day = "Friday";
               break;
            case 6:
               day = "Saturday";
         }
   }
   return day;
}


function populateWeatherGraphs(rain_array, timeanddate){
   var graphs = "";
   for (var i in rain_array){
      graphs += "<div class=raingraph id="+i+">"
         +"<span class='info'>"
         +rain_array[i]+"% chance of rain " + getPrintedTime(i, timeanddate)
         +"</span>"
         +"<div class=graphbar style=\"height: "+rain_array[i]/2+"px\" >"
         +"</div>"
         +"</div>"
   }
   return graphs;
}

