<?php

include "forecast_io.php";

class JeepForecast{
   //Define a string for date formate
   //Y = Four digit year
   //m = Month with leading zeros
   //d = Day of month with leading zeros
   //h = 12-hour hour with leading zeros
   //i = minutes as two digits leading zeros
   //s = seconds as two digits with leading zeros
   //a = am/pm
   private $timeformat = "Y-m-d h:i:s a";

   private $forecast_json;
   private $forecast_php;

   private $location = "41.7012082,-83.5238018"; //Default location is Jeep factory in Toledo
   private $forecast_url;

   private $api_version;

   function __construct(){
      //Explode the request. I expect the following:
      //parameters[0] = "" - Directory path from the root of the server
      //parameters[1] = "api.php" - name of this script file
      //paramteres[2] = "1" - API version. This will let me redirect if I make changes later
      //parameters[3] = "NN.nnnn,EE.eeee" - Location lat/long separated by a comma
      $parameters = explode('/',getenv('REQUEST_URI'));
      var_dump($parameters);

      if ($parameters[0] != "" || $parameters[1]!="api.php"){
         throw new Exception("Invalid API parameters");
      }

      //Use parameter from URL path or query string or default
      if (isset($_GET["version"])){
         $this->api_version = $_GET["version"];
      }else{
         if(isset($parameters[2]) && $parameters[2]){
            $this->api_version = $parameters[2];
         }else{
            $this->api_version = 1;
         }
      }
      
      //Use parameter from URL path or query string or default
      if (isset($_GET["location"])){
         $this->location = $_GET["location"];
      }else{
         if(isset($parameters[3]) && $parameters[3]!=""){
            $this->location = $parameters[3];
         }else{
                     echo "using default location";
         }
      }
      $webservice = new forecast_io($this->location);

      $this->forecast_url = $webservice->get_url();
      $this->getForecast();
      $this->parse_json();
   }

   private function getForecast(){
      $this->forecast_json = file_get_contents($this->forecast_url);
   }

   private function parse_json(){
      //Parse the JSON response from forecast.io to a PHP class object
      $this->forecast_php = json_decode($this->forecast_json);
   }

   function print_date(){
      echo date($this->timeformat."\n",$this->forecast_php->currently->time);
   } 

   function print_minute_rain(){
      foreach($this->forecast_php->minutely->data as $minute_forecast){
         echo date($this->timeformat." ",$minute_forecast->time);
         echo 100*$minute_forecast->precipProbability . "%\n";
      }
   }

   function print_hour_rain(){
      foreach($this->forecast_php->hourly->data as $hour_forecast){
         echo date($this->timeformat." ",$hour_forecast->time);
         echo 100*$hour_forecast->precipProbability."%\n";
      }

   }

   function print_day_rain(){
      foreach($this->forecast_php->daily->data as $day_forecast){
         echo date($this->timeformat." ",$day_forecast->time);
         echo 100*$day_forecast->precipProbability."%\n";
      }
   }

   function export_forecast_data(){
      var_export($this->forecast_php);
   }
}
?>
<html>
<head>
<title>Jeep Weather App Scratch Space</title>
</head>
<body>
<pre>
<?php
$myForecast = new JeepForecast;
$myForecast->print_date();
echo "\n\n\n****************\n\n\n";
$myForecast->print_minute_rain();
echo "\n\n\n****************\n\n\n";
$myForecast->print_hour_rain();
echo "\n\n\n****************\n\n\n";
$myForecast->print_day_rain();
echo "\n\n\n****************\n\n\n";
$myForecast->export_forecast_data();

?>
</pre>
</body>
</html>

