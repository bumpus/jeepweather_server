var xmlhttp = new XMLHttpRequest();
var url = "api.php/2/";
var locationcoordinates = "";
var myStatus;

xmlhttp.onreadystatechange = function(){
   if (this.readyState == 4 && this.status == 200){
      var information = JSON.parse(this.responseText);
      showStatus(information);
   }
};

function drawChart() {
   showStatus();
}

function showStatus(myStatus){
   document.getElementById("temp").innerHTML = myStatus['current_temp']+"&deg;F";
   var statustext = "";
   var icon = "";
   var rain_time = "Rain is coming ";
   if (myStatus["naked_jeep_weather"]!= null){
      if(myStatus["naked_jeep_weather"]){
         statustext = "Take your top off!!";
         icon = "open.ico";
      }else{
         statustext = "Put your top on!";
         icon = "closed.ico";
      }
      document.getElementById("status").innerHTML = statustext;
      document.querySelector("link[rel='shortcut icon']").href = icon;
   }

   if (myStatus["rain_chance_time"]!=null){
      rain_time += moment(myStatus["rain_chance_time"]*1000).calendar(); 
      document.getElementById("time").innerHTML = rain_time;
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
            label: "% Chance of Rain",
            borderColor: 'green',
            backgroundColor: 'green',
            data: []
         }]
      }

      for (var i in myStatus['next_hour_rain_chance']){
         minuteDataSets.labels.push(moment(i*1000))
         minuteDataSets.datasets[0].data.push(Math.round(myStatus["next_hour_rain_chance"][i]*100));
      }

      var minuteOptions = {
         title: { text: "Next Hour Forecast by Minute"},
         scales: {
            xAxes: [{
               type: 'time',
               barPercentage: 0.2,
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
                  labelString: "% Rain Chance",
                  display: true
               },
               ticks:{
                  max: 100,
                  min: 0
               }
            }]
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
      hourDataSets.datasets[1].data.push(Math.round(myStatus["next_two_day_rain_chance"][i].rain*100));
   }

   var hourOptions = {
      title: { text: "Next Two Days Forecast by Hour" },
      scales: {
         xAxes: [{
            type: 'time',
            barPercentage: 0.15,
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
         label: "% Chance of Rain",
         yAxisID: 'rainChance',
         borderColor: 'green',
         backgroundColor: 'green',
         data: []
      }]
   };

   for (var i in myStatus['next_week_rain_chance']){
      dayDataSets.labels.push(moment(1000*i));
      dayDataSets.datasets[0].data.push(myStatus["next_week_rain_chance"][i].lowtemp);
      dayDataSets.datasets[1].data.push(myStatus["next_week_rain_chance"][i].hightemp);
      dayDataSets.datasets[2].data.push(Math.round(myStatus["next_week_rain_chance"][i].rain*100));
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
      }
   };

   var dayChart = new Chart(document.getElementById('rain_day'), {
      type: 'bar',
       data: dayDataSets,
       options: dayOptions
   });
}

function getWeatherInfo(position){
   var locationcoordinates = position.coords.latitude + "," + position.coords.longitude;
   document.getElementById("status").innerHTML = "Getting weather data for: " + locationcoordinates;
   xmlhttp.open("GET", url + locationcoordinates, true);
   xmlhttp.send();
}

function getWeatherInfoIP(position){
   document.getElementById("status").innerHTML = "Getting weather data for your estimated location";
   xmlhttp.open("GET", url + "IP", true);
   xmlhttp.send();
}

function getLocation(){
   if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(getWeatherInfo, getWeatherInfoIP);
   }else{
      document.getElementById("status").innerHTML = "Geolocation is not supported by this browser.";
   }
}

document.getElementById("status").innerHTML = "Getting Location";
getLocation();
