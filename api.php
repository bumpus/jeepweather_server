<?php

include "darksky.php";
include "ipinfo.io.php";

header('Content-Type: application/json');

class JeepForecast{

   //Some defined constant items
   const minute_tolerance = 0.45;
   const today_tolerance = 0.30;
   const tomorrow_tolerance = 0.60;
   
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

   private $naked_jeep_weather;

   private $current_temp;

   private $debug = false;

   private $next_hour_rain_chance;
   private $next_two_day_rain_chance;
   private $next_week_rain_chance;

   function __construct(){ 
      //Explode the request. I expect the following:
      //parameters[0] = "" - Directory path from the root of the server
      //parameters[1] = "api.php" - name of this script file
      //paramteres[2] = "1" - API version. This will let me redirect if I make changes later
      //parameters[3] = "NN.nnnn,EE.eeee" - Location lat/long separated by a comma
      //parameters[4] = Debug flag, 1 for on 0 for off
      $parameters = explode('/',$_SERVER['PHP_SELF']);

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
         }
      }

      //Determine if debug is enabled
      if (isset($_GET["debug"])){
         $this->debug = (bool)$_GET["debug"];
      }else{
         if(isset($parameters[4]) && $parameters[4]!=""){
            $this->debug = (bool) $parameters[4];
         }
      }


      if($this->location == "IP"){
         // Client has failed to get location from browser
         // Check to see if the Google Cloud API has a location guess for us.
         if (isset($_SERVER['HTTP_X_APPENGINE_CITYLATLONG'])){
            $this->location = $_SERVER['HTTP_X_APPENGINE_CITYLATLONG'];
         }else{
            // Request IP base location from web service.
            $locationservice = new ipinfo($_SERVER['REMOTE_ADDR']);
            $this->location = $locationservice->get_location();
         }
      }

      // If somehow we still haven't got a location, use the location of the Jeep factory in Toledo
      if(""==$this->location){
         $this->location = "41.7012082,-83.5238018";
      }

      $webservice = new darksky($this->location);

      $this->forecast_url = $webservice->get_url();
      $this->getForecast();
      $this->parse_json();

      //Analyze the data;
      $this->naked_jeep_weather = true;
      //Not all locations have minutely forecasts available.
      //If this data is available, use it.
      if(isset($this->forecast_php->minutely)){
         $this->determine_next_hour();
      }
      //If the next hour is bad, don't even check the next two days
      if($this->naked_jeep_weather){
         $this->determine_next_two_days();
      }

      $this->package_rain_chance();

      $this->current_temp = round($this->forecast_php->currently->temperature);
      


   }

   private function getForecast(){
      $this->forecast_json = file_get_contents($this->forecast_url);
   }

   private function parse_json(){
      //Parse the JSON response from forecast.io to a PHP class object
      $this->forecast_php = json_decode($this->forecast_json);
   }

   private function determine_next_hour(){
      for($i=2; $i<sizeof($this->forecast_php->minutely->data); $i++){
         $three_minute_rainchance = $this->forecast_php->minutely->data[$i-2]->precipProbability +
                                    $this->forecast_php->minutely->data[$i-1]->precipProbability +
                                    $this->forecast_php->minutely->data[$i]->precipProbability;
         if( $three_minute_rainchance > JeepForecast::minute_tolerance){
            //Greater than 15% chance of rain three minutes in a row
            //Determine when the rain chance starts
            for($j=($i-2); $j<=$i; $j++){
               if($this->forecast_php->minutely->data[$j]->precipProbability >= (JeepForecast::minute_tolerance/3)){
                  $this->rain_chance_time = $this->forecast_php->minutely->data[$j]->time;
                  break;
               }
            }
            $this->naked_jeep_weather = false;
            break;
         }
      }
   }

   private function determine_next_two_days(){
      //Skip the current hour if minute by minute data is available
      //This avoids a condition where the current hour may have a
      //rain chance that has already passed.
      if(isset($this->forecast_php->minutely)){
         $startindex = 3;
      }else{
         $startindex = 2;
      }
      for($i=$startindex; $i<sizeof($this->forecast_php->hourly->data); $i++){
         $three_hour_rainchance = $this->forecast_php->hourly->data[$i-2]->precipProbability +
            $this->forecast_php->hourly->data[$i-1]->precipProbability +
            $this->forecast_php->hourly->data[$i]->precipProbability;

         //I have a different tolerance for rain more than 24 hours away
         if($i>26){ //More than a day away
            $tolerance = JeepForecast::tomorrow_tolerance;
         }else{
            $tolerance = JeepForecast::today_tolerance;
         }

         //If the chance of rain over a 3 hour period is too high note the starting time and quit.
         if($three_hour_rainchance > $tolerance){
            //Determine when the rain chance starts
            for($j=($i-2); $j<=$i; $j++){
               if($this->forecast_php->hourly->data[$j]->precipProbability >= ($tolerance/3)){
                  $this->rain_chance_time = $this->forecast_php->hourly->data[$j]->time;
                  break;
               }
            }
            $this->naked_jeep_weather = false;
            break;
         }
      }
   }

   private function package_rain_chance(){
      //I'll move from a decimal to a percent at this point for version 1 api
      //version 2 api will return the result as a decimal
      $factor = 100;
      if(1<$this->api_version){
         $factor = 1;
      }
      //Make an array of times and hourly rain chance
      //Include forecast temperatures if available on API v2 or later
      for($i=0; $i<sizeof($this->forecast_php->hourly->data); $i++){
         if(1<$this->api_version){
            $this->next_two_day_rain_chance[$this->forecast_php->hourly->data[$i]->time] = [
               'rain'=> $this->forecast_php->hourly->data[$i]->precipProbability,
               'temp'=> round($this->forecast_php->hourly->data[$i]->temperature)
            ];
         }else{
            $this->next_two_day_rain_chance[$this->forecast_php->hourly->data[$i]->time] =
               $factor * $this->forecast_php->hourly->data[$i]->precipProbability;
         }
      }

      //Make an array of rain chance by the minute
      if(isset($this->forecast_php->minutely)){
         for($i=0;$i<sizeof($this->forecast_php->minutely->data); $i++){
            $this->next_hour_rain_chance[$this->forecast_php->minutely->data[$i]->time] =
               $factor * $this->forecast_php->minutely->data[$i]->precipProbability;
         }
      }

      //Make an array of rain chance by the day for next week or so
      //Include max/min forecast temperatures if available on API v2 or later
      for($i=0; $i<sizeof($this->forecast_php->daily->data); $i++){
         if(1<$this->api_version){
            $this->next_week_rain_chance[$this->forecast_php->daily->data[$i]->time] = [
               'rain'=> $this->forecast_php->daily->data[$i]->precipProbability,
               'hightemp'=> round($this->forecast_php->daily->data[$i]->temperatureMax),
               'lowtemp'=> round($this->forecast_php->daily->data[$i]->temperatureMin)
            ];
         }else{
            $this->next_week_rain_chance[$this->forecast_php->daily->data[$i]->time] =
               $factor * $this->forecast_php->daily->data[$i]->precipProbability;
         }
      }
   }

   function debug_enabled(){
      return $this->debug;
   }

   function get_results(){

      if(1<$this->api_version){
         $results['location'] = $this->location;

         $results['client_ip'] = $_SERVER['REMOTE_ADDR']; 
      }
      $results['naked_jeep_weather'] = $this->naked_jeep_weather;

      if (isset($this->rain_chance_time)){
         $results['rain_chance_time'] = $this->rain_chance_time;
      }

      $results['next_two_day_rain_chance'] = $this->next_two_day_rain_chance;

      if (isset($this->forecast_php->minutely)){
         $results['next_hour_rain_chance'] = $this->next_hour_rain_chance;
      }

      $results['next_week_rain_chance'] = $this->next_week_rain_chance;

      $results['current_temp'] = $this->current_temp;

      $results['city'] = ucwords($_SERVER['HTTP_X_APPENGINE_CITY']);
      $results['city'] .= ", ";
      $results['city'] .= strtoupper($_SERVER['HTTP_X_APPENGINE_REGION']);

      return json_encode($results);
   }


   //Functions for printing data for debug purposes.

   function print_date(){
      return date($this->timeformat."\n",$this->forecast_php->currently->time);
   } 

   function print_minute_rain(){
      $string = "";
      foreach($this->forecast_php->minutely->data as $minute_forecast){
         $string .= date($this->timeformat." ",$minute_forecast->time);
         $string .= 100*$minute_forecast->precipProbability . "%\n";
      }
      return $string;
   }

   function print_hour_rain(){
      $string = "";
      foreach($this->forecast_php->hourly->data as $hour_forecast){
         $string .= date($this->timeformat." ",$hour_forecast->time);
         $string .= 100*$hour_forecast->precipProbability."%\n";
      }
      return $string;

   }

   function print_day_rain(){
      $string = "";
      foreach($this->forecast_php->daily->data as $day_forecast){
         $string .= date($this->timeformat." ",$day_forecast->time);
         $string .= 100*$day_forecast->precipProbability."%\n";
      }
      return $string;
   }

   function export_forecast_data(){
      ob_start();
      var_export($this->forecast_php);
      $string = ob_get_contents();
      ob_end_clean();
      return $string;
   }

   function print_summary(){
      ob_start();
      echo "\$naked_jeep_weather: ";
      var_dump($this->naked_jeep_weather);
      if(isset($this->rain_chance_time)){
         echo "\$rain_chance_time: ".date($this->timeformat,$this->rain_chance_time)."\n";
      }
      $string = ob_get_contents();
      ob_end_clean();
      return $string;
   }
}

$myForecast = new JeepForecast;
echo $myForecast->get_results();
if($myForecast->debug_enabled()){
   echo "\n\n\n****************\n\n\n";
   echo $myForecast->print_date();
   echo "\n\n\n****************\n\n\n";
   echo $myForecast->print_summary();
   echo "\n\n\n****************\n\n\n";
   echo $myForecast->print_minute_rain();
   echo "\n\n\n****************\n\n\n";
   echo $myForecast->print_hour_rain();
   echo "\n\n\n****************\n\n\n";
   echo $myForecast->print_day_rain();
   echo "\n\n\n****************\n\n\n";
   echo $myForecast->export_forecast_data();
}

?>

