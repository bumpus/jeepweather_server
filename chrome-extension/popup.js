var xmlhttp = new XMLHttpRequest();
var url = "https://jeepweather.bump.us/api.php/3/";
var debug = false;

function dbgPrint(text){
   if(debug){
      console.log(text);
   }
}


xmlhttp.onreadystatechange = function(){
   dbgPrint("xmlhttp.onreadystatechange");
   if (this.readyState == 4 && this.status == 200){
      var information = JSON.parse(this.responseText);
      chrome.storage.local.set({'weatherdata': information});
      showStatus(information);
   }
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);

function getWeatherInfo(position){
   dbgPrint("getWeatherInfo");
   var locationcoordinates = position.coords.latitude + "," + position.coords.longitude;
   document.getElementById("status").innerHTML = "Getting weather data for: " + locationcoordinates;
   xmlhttp.open("GET", url + locationcoordinates, true);
   xmlhttp.send();
}

function getLocation(){
   dbgPrint("getLocation")
   if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(getWeatherInfo);
   }else{
      document.getElementById("status").innerHTML = "Geolocaiton is not supported by this browser.";
   }
}

function onDOMContentLoaded(){
   dbgPrint("onDOMContentLoaded");
   chrome.storage.local.get('weatherdata', onGetWeatherData);
   document.getElementById("status").innerHTML = "Checking for weather data.";
}

function onGetWeatherData(result){
   dbgPrint("onGetWeatherDAta");
   if (chrome.runtime.lastError) {
      dbgPrint("Error retrieving weatherdata: " + chrome.runtime.lastError);
      getLocation();
      document.getElementById("status").innerHTML = "Getting location";
   }else{
     dbgPrint("found weatherdata in storage");
     dbgPrint(JSON.stringify(result));
     if (null == result['weatherdata']){
        dbgPrint("Weatherdata is empty")
        getLocation();
        document.getElementById("status").innerHTML = "Getting location";
     }else{
        showStatus(result['weatherdata']);
     }
   }
}

function showStatus(myStatus){
   dbgPrint("showStatus");
   document.getElementById("temp").innerHTML = myStatus['current_temp']+"&deg;F";
   var statustext = "";
   var icon = "";
   var rain_time = "Rain is coming ";
   if (myStatus["naked_jeep_weather"]!= null){
      if(myStatus["naked_jeep_weather"]){
         statustext = "Take your top off!!";
         icon = "open-16.png";
      }else{
         statustext = "Put your top on!";
         icon = "closed-16.png";
      }
      document.getElementById("status").innerHTML = statustext;
      chrome.browserAction.setIcon({path:icon});
   }

   if (myStatus["rain_chance_time"]!=null){
      rain_time += moment(myStatus["rain_chance_time"]*1000).calendar(); 
      document.getElementById("time").innerHTML = rain_time;
      chrome.browserAction.setTitle({title:statustext + " " + rain_time});
   }

   if (myStatus["city"]!=null){
      document.getElementById("city").innerHTML = myStatus["city"];
   }

   //Here is where the charts are drawn

   // Start with some settings that will be common to the chart on this page
   Chart.defaults.global.maintainAspectRatio = true;
   Chart.defaults.global.responsive = false;
   Chart.defaults.global.title.display = true;
   
   //First do the chart for the minute by minute, if that data is available
   if (myStatus.hasOwnProperty('next_hour_rain_chance')){
      var minuteRainData =[];

      var minuteDataSets = {
         labels: [],
         datasets: [{
            type: 'bar',
            label: "Rain Intensity",
            borderColor: 'green',
            backgroundColor: 'green',
            data: []
         }]
      }

      for (var i in myStatus['next_hour_rain_chance']){
         minuteDataSets.labels.push(moment(i*1000))
         minuteDataSets.datasets[0].data.push(myStatus["next_hour_rain_chance"][i].rain);
      }

      var minuteOptions = {
         title: { text: "Next Hour Forecast by Minute"},
         scales: {
            xAxes: [{
               type: 'time',
               unit: 'minute',
               unitStepSize: 1,
               time: {
                  displayFormats:{
                     minute: 'h:mm a'
                  },
                  tooltipFormat: 'h:mm a'

               }
            }],
            yAxes:[{
               scaleLabel:{
                  labelString: "Rain Intensity",
                  display: true
               },
               ticks:{
//                  max: 1,
                  min: 0
               }
            }]
         },
         tooltips: {
            callbacks: {
               label: function(tooltipItems, data){
                  return data.datasets[tooltipItems.datasetIndex].label +': ' + tooltipItems.yLabel + 'in/hour';
               }
            }
         }
      };

      var minuteChart = new Chart(document.getElementById('rain_minute'), {
         type: 'bar',
         data: minuteDataSets,
         options: minuteOptions
      });
   }

   //Now populate the graph for the next 48 hours, hour by hour
   //includes % precipitation chance and temperature
   var hourDataSets = {
      labels: [],
      datasets: [
         {
            type: 'line',
            label: "Temperature",
            yAxisID: 'temp',
            borderColor: 'red',
            backgroundColor: 'red',
            fill: false,
            data: []
         },
         {
            type: 'bar',
            label: "Rain Chance",
            yAxisID: 'rainChance',
            borderColor: 'green',
            backgroundColor: 'green',
            data: []
         }
      ]
   };

   for (var i in myStatus['next_two_day_rain_chance']){
      hourDataSets.labels.push(moment(1000*i));
      hourDataSets.datasets[0].data.push(myStatus["next_two_day_rain_chance"][i].temp);
      hourDataSets.datasets[1].data.push(myStatus["next_two_day_rain_chance"][i].rain);
   }

   var hourOptions = {
      title: { text: "Next Two Days Forecast by Hour" },
      scales: {
         xAxes: [{
            type: 'time',
            unit: 'hour',
            time: {
               displayFormats:{
                  hour: 'ddd h a'
               },
               tooltipFormat: 'dddd h:mm a'
            },
         }],
         yAxes:[{
            scaleLabel:{
               labelString: "% Rain Chance",
               display: true
            },
            id: 'rainChance',
            ticks:{
               max: 100,
               min: 0
            }
         },
         {
            scaleLabel:{
               labelString: "Temperature "+String.fromCharCode(176)+"F",
               display: true
            },
            id: 'temp',
            position: 'right'
         }]
      },
      tooltips: {
         callbacks: {
            label: function(tooltipItems, data){
               var suffix;
               if(0 == tooltipItems.datasetIndex){
                  suffix = String.fromCharCode(176)+'F';
               }else{
                  suffix = '%';
               }
               return data.datasets[tooltipItems.datasetIndex].label +': ' + tooltipItems.yLabel + suffix;
            }
         }
      }
   };

   var hourChart = new Chart(document.getElementById('rain_hour'), {
      type: 'bar',
       data: hourDataSets,
       options: hourOptions
   });

   //Finally, make a graph for % rain chance, daily high and daily low temps
   //Covers the next week
   var dayDataSets = {
      labels: [],
      datasets: [{
         type: 'line',
         label: 'Low Temperature',
         yAxisID: 'temp',
         borderColor: 'blue',
         backgroundColor: 'blue',
         fill: false,
         data: []
      },
      {
         type: 'line',
         label: 'High Temperature',
         yAxisID: 'temp',
         borderColor: 'red',
         backgroundColor: 'red',
         fill: false,
         data: []
      },{
         type: 'bar',
         label: "Rain Chance",
         yAxisID: 'rainChance',
         borderColor: 'green',
         backgroundColor: 'green',
         data: []
      }]
   };

   for (var i in myStatus['next_week_rain_chance']){
      dayDataSets.labels.push(moment(i));
      dayDataSets.datasets[0].data.push(myStatus["next_week_rain_chance"][i].lowtemp);
      dayDataSets.datasets[1].data.push(myStatus["next_week_rain_chance"][i].hightemp);
      dayDataSets.datasets[2].data.push(myStatus["next_week_rain_chance"][i].rain);
   }


   var dayOptions = {
      title: { text: "Next Week Forecast by Day" },
      scales: {
         xAxes: [{
            type: 'time',
            unit: 'day',
            time: {
               displayFormats:{
                  day: 'dddd'
               },
               tooltipFormat: 'dddd MMMM Do'
            }
         }],
         yAxes:[{
            scaleLabel:{
               labelString: "% Rain Chance",
               display: true
            },
            id: 'rainChance',
            ticks:{
               max: 100,
               min: 0
            }
         },
         {
            scaleLabel:{
               labelString: "Temperature "+String.fromCharCode(176)+"F",
               display: true
            },
            id: 'temp',
            position: 'right'
         }]
      },
      tooltips: {
         callbacks: {
            label: function(tooltipItems, data){
               var suffix;
               if(2 == tooltipItems.datasetIndex){
                  suffix = '%';
               }else{
                  suffix = String.fromCharCode(176)+'F';
               }
               return data.datasets[tooltipItems.datasetIndex].label +': ' + tooltipItems.yLabel + suffix;
            }
         }
      }
   };

   var dayChart = new Chart(document.getElementById('rain_day'), {
      type: 'bar',
       data: dayDataSets,
       options: dayOptions
   });

}

