var xmlhttp = new XMLHttpRequest();
var url = "https://jeepweather.bump.us/api.php/1/";

xmlhttp.onreadystatechange = function(){
   if (this.readyState == 4 && this.status == 200){
      var information = JSON.parse(this.responseText);
      showStatus(information);
   }
};

function getWeatherInfo(position){
   var locationcoordinates = position.coords.latitude + "," + position.coords.longitude;
   document.getElementById("status").innerHTML = "Getting weather data for: " + locationcoordinates;
   xmlhttp.open("GET", url + locationcoordinates, true);
   xmlhttp.send();
}

function getLocation(){
   if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(getWeatherInfo);
   }else{
      document.getElementById("status").innerHTML = "Geolocaiton is not supported by this browser.";
   }
}


