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
      rain_time += getPrintedTime(myStatus["rain_chance_time"],1); 
      document.getElementById("time").innerHTML = rain_time;
   }

   //Make a formatter for Percentages
   var formatter = new google.visualization.NumberFormat({pattern: '#%'});

   //Only include the minute by minute forecast if we have that data.
   if (myStatus.hasOwnProperty('next_hour_rain_chance')){
      var minuteData = new google.visualization.DataTable();
      minuteData.addColumn('datetime', 'Time');
      minuteData.addColumn('number', 'Rain Chance');
      for (var i in myStatus["next_hour_rain_chance"]){
         minuteData.addRow([new Date(i*1000),myStatus["next_hour_rain_chance"][i]]);
      }
      var minuteOptions = {
         title : 'Next Hour Rain Chance',
         vAxis: {title: '% Rain Chance', format: 'percent', maxValue:1, minValue:0},
         hAxis: {title: 'Time'},
         seriesType: 'bars'
       };
       formatter.format(minuteData, 1);
       // Instantiate and draw our chart, passing in some options.
       var hourChart = new google.visualization.ComboChart(document.getElementById('rain_minute'));
       hourChart.draw(minuteData, minuteOptions);
   }
   var hourData = new google.visualization.DataTable();
   hourData.addColumn('datetime', 'Time');
   hourData.addColumn('number', 'Rain Chance');
   hourData.addColumn('number', 'Temperature');
   for (var i in myStatus["next_two_day_rain_chance"]){
      hourData.addRow([new Date(i*1000),myStatus["next_two_day_rain_chance"][i].rain,myStatus["next_two_day_rain_chance"][i].temp]);
   }
   var options = {
      title : 'Next Two Days Rain Chance',
      vAxes: [
         //Define left Axis for % rain chance
         {title: '% Rain Chance', format: 'percent', maxValue:1, minValue:0},
         //Define right Axis for Temperature
         {title: 'Temperature'}
              ],
      hAxis: {title: 'Time'},
      seriesType: 'bars',
      series: { 1: { targetAxisIndex:1, type: 'line' } }
    };
   formatter.format(hourData, 1);
   // Instantiate and draw our chart, passing in some options.
   var hourChart = new google.visualization.ComboChart(document.getElementById('rain_hour'));
   hourChart.draw(hourData, options);


   var dayData = new google.visualization.DataTable();
   dayData.addColumn('date', 'Date');
   dayData.addColumn('number', 'Rain Chance');
   dayData.addColumn('number', 'High Temperature');
   dayData.addColumn('number', 'Low Temperature');
   for (var i in myStatus["next_week_rain_chance"]){
      dayData.addRow([new Date(i*1000),myStatus["next_week_rain_chance"][i].rain,myStatus["next_week_rain_chance"][i].hightemp,myStatus["next_week_rain_chance"][i].lowtemp]);
   }
   var options = {
      title : 'Next Week Rain Chance',
      vAxes: [
         //Define left Axis for % rain chance
         {title: '% Rain Chance', format: 'percent', maxValue:1, minValue:0},
         //Define right Axis for Temperature
         {title: 'Temperature'}
              ],
      hAxis: {title: 'Time'},
      seriesType: 'bars',
      series: {
         1: { targetAxisIndex:1, type: 'line' },
         2: { targetAxisIndex:1, type: 'line' }
      }
    };
   formatter.format(dayData, 1);
   // Instantiate and draw our chart, passing in some options.
   var dayChart = new google.visualization.ComboChart(document.getElementById('rain_day'));
   dayChart.draw(dayData, options);

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
// Load the Visualization API and the corechart package.
google.charts.load('current', {'packages':['corechart']});

// Set a callback to run when the Google Visualization API is loaded.
google.charts.setOnLoadCallback(getLocation);
