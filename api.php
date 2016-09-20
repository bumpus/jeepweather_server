<?php

include "forecast_io.php";

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

   private $debug = false;

   function __construct(){ 
      //Explode the request. I expect the following:
      //parameters[0] = "" - Directory path from the root of the server
      //parameters[1] = "api.php" - name of this script file
      //paramteres[2] = "1" - API version. This will let me redirect if I make changes later
      //parameters[3] = "NN.nnnn,EE.eeee" - Location lat/long separated by a comma
      //parameters[4] = Debug flag, 1 for on 0 for off
      $parameters = explode('/',getenv('REQUEST_URI'));

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

      $webservice = new forecast_io($this->location);

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
      


   }

   private function getForecast(){
      $this->forecast_json = file_get_contents($this->forecast_url);
   }

   private function parse_json(){
      //Parse the JSON response from forecast.io to a PHP class object
      $this->forecast_php = json_decode($this->forecast_json);
   }

   function determine_next_hour(){
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

   function determine_next_two_days(){
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

   function debug_enabled(){
      return $this->debug;
   }

   function get_results(){
      $results['naked_jeep_weather'] = $this->naked_jeep_weather;
      if (isset($this->rain_chance_time)){
         $results['rain_chance_time'] = $this->rain_chance_time;
      }
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

