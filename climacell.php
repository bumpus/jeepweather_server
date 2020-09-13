<?php
include "config.inc";

class climacell{
   private $base_url = BASE_URL;
   private $api_key = CLIMACELL_KEY;
   private $latitude;
   private $longitude;
   private $realtime_url;
   private $nowcast_url;
   private $hourly_url;
   private $daily_url;
   private $data;
   
    private function build_realtime_url(){
     $this->realtime_url = $this->base_url . "realtime"
       . "?lat=" . $this->latitude 
       . "&lon=" . $this->longitude
       . "&unit_system=us"
       . "&fields=temp"
       . "&apikey=" . $this->api_key;
   }
   
   private function build_nowcast_url(){
     // Start time will be the next whole minute using floor() to throw away the remainder
     $start_time = floor((time()+60)/60) * 60;
     $end_time = $start_time + 60*60; // one hour later
     $this->nowcast_url = $this->base_url . "nowcast"
       . "?lat=" . $this->latitude 
       . "&lon=" . $this->longitude
       . "&unit_system=us&timestep=1"
       . "&start_time=" . date("c", $start_time) // "c" provides an ISO8601 formatted date string
       . "&end_time=" . date("c", $end_time) // "c" provides an ISO8601 formatted date string
       . "&fields=precipitation,temp"
       . "&apikey=" . $this->api_key;
     // Climacell isn't liking the timezone being specified as +00:00 replace with Z instead
     $this->nowcast_url = preg_replace("/\+00:00/", "Z", $this->nowcast_url);
   }

   private function build_hourly_url(){
     // Start time will be the current whole hour using floor() to throw away the remainder
     $start_time = floor(time() / (60 * 60)) * (60 * 60);
     $end_time = $start_time + (48 * 60 * 60); // 48 hours later
     $this->hourly_url = $this->base_url . "forecast/hourly"
       . "?lat=" . $this->latitude 
       . "&lon=" . $this->longitude
       . "&unit_system=us"
       . "&start_time=" . date("c", $start_time) // "c" provides an ISO8601 formatted date string
       . "&end_time=" . date("c", $end_time) // "c" provides an ISO8601 formatted date string
       . "&fields=precipitation_probability,temp"
       . "&apikey=" . $this->api_key;
     // Climacell isn't liking the timezone being specified as +00:00 replace with Z instead
     $this->hourly_url = preg_replace("/\+00:00/", "Z", $this->hourly_url);
   }

   private function build_daily_url(){
     // Start time will be the current day using floor() to throw away the remainder
     $start_time = floor(time() / (24 * 60 * 60)) * (24 * 60 * 60);
     $end_time = $start_time + (7 * 24 * 60 * 60); // 7 days later
     $this->daily_url = $this->base_url . "forecast/daily"
       . "?lat=" . $this->latitude 
       . "&lon=" . $this->longitude
       . "&unit_system=us"
       . "&start_time=" . date("c", $start_time) // "c" provides an ISO8601 formatted date string
       . "&end_time=" . date("c", $end_time) // "c" provides an ISO8601 formatted date string
       . "&fields=precipitation_probability,temp" // Note that max and min temperatures will be returned for daily forecast
       . "&apikey=" . $this->api_key;
     // Climacell isn't liking the timezone being specified as +00:00 replace with Z instead
     $this->daily_url = preg_replace("/\+00:00/", "Z", $this->daily_url);
   }

   private function fetch_data(){
     $realtime = json_decode(file_get_contents($this->realtime_url));
     $this->data['current_temp'] = round($realtime->temp->value);

     $nowcast =  json_decode(file_get_contents($this->nowcast_url));
     foreach ($nowcast as $minute){
       $this->data['next_hour_rain_chance'][strtotime($minute->observation_time->value)]['rain'] = $minute->precipitation->value;
       $this->data['next_hour_rain_chance'][strtotime($minute->observation_time->value)]['temp'] = $minute->temp->value;
     }

     $hourly = json_decode(file_get_contents($this->hourly_url));
     foreach ($hourly as $hour){
       $time = strtotime($hour->observation_time->value); // This is going to be a unix timestamp. 
       $this->data['next_two_day_rain_chance'][$time]['rain'] = $hour->precipitation_probability->value;
       $this->data['next_two_day_rain_chance'][$time]['temp'] = round($hour->temp->value);
     }

     $daily = json_decode(file_get_contents($this->daily_url));
     foreach($daily as $day){
       $time = $day->observation_time->value; // Climacell provides only a date here. Don't convert until the client states their preferred timezone.
       $this->data['next_week_rain_chance'][$time]['rain'] = $day->precipitation_probability->value;
       $this->data['next_week_rain_chance'][$time]['lowtemp'] = round($day->temp[0]->min->value);
       $this->data['next_week_rain_chance'][$time]['hightemp'] = round($day->temp[1]->max->value);
     }
   }

   public function get_data(){
     return $this->data;
   }

   public function __construct($search_location){
      $location = explode(",", $search_location);
      $this->latitude = $location[0];
      $this->longitude = $location[1];
      $this->build_realtime_url();
      $this->build_nowcast_url();
      $this->build_hourly_url();
      $this->build_daily_url();
      $this->fetch_data();
   }

   public function debug_dump(){
     echo json_encode($this->data, JSON_PRETTY_PRINT);
   }

}

# $cc = new climacell("41.9786551,-91.7340449");
# $cc->debug_dump();
?>
