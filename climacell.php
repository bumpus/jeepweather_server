<?php
include "config.inc";

class climacell{
   private $base_url = BASE_URL;
   private $api_key = CLIMACELL_KEY;
   private $location;
   private $realtime_url;
   private $nowcast_url;
   private $hourly_url;
   private $daily_url;
   private $data;
   
    private function build_url(){
     $this->url = $this->base_url . "timelines"
       . "?location=" . $this->location
       . "&fields=temperature,precipitationProbability,temperatureMin,temperatureMax"
       ."&timesteps=1d,1h,1m"
       . "&apikey=" . $this->api_key;
   }

   private function cToF($c)
   {
     return round(1.8*$c+32);
   }

   private function fetch_data(){
     $ccData = json_decode(file_get_contents($this->url));
     $this->data['current_temp'] = $this->cToF($ccData->data->timelines[2]->intervals[0]->values->temperature);

     foreach (array_slice($ccData->data->timelines[2]->intervals,0,61) as $minute){
       $time = strtotime($minute->startTime); // This is going to be a unix timestamp. 
       $this->data['next_hour_rain_chance'][$time]['rain'] = $minute->values->precipitationProbability;
       $this->data['next_hour_rain_chance'][$time]['temp'] = $this->cToF($minute->values->temperature);
     }

     foreach (array_slice($ccData->data->timelines[1]->intervals,0,49) as $hour){
       $time = strtotime($hour->startTime); // This is going to be a unix timestamp. 
       $this->data['next_two_day_rain_chance'][$time]['rain'] = $hour->values->precipitationProbability;
       $this->data['next_two_day_rain_chance'][$time]['temp'] = $this->cToF($hour->values->temperature);
     }

     foreach(array_slice($ccData->data->timelines[0]->intervals,0,8) as $day){
       $time = strtotime($day->startTime); // This is going to be a unix timestamp. 
       $this->data['next_week_rain_chance'][$time]['rain'] = $day->values->precipitationProbability;
       $this->data['next_week_rain_chance'][$time]['lowtemp'] = $this->cToF($day->values->temperatureMin);
       $this->data['next_week_rain_chance'][$time]['hightemp'] = $this->cToF($day->values->temperatureMax);
     }
   }

   public function get_data(){
     return $this->data;
   }

   public function __construct($search_location){
      $this->location = $search_location;
      $this->build_url();
      $this->fetch_data();
   }

   public function debug_dump(){
     echo json_encode($this->data, JSON_PRETTY_PRINT);
   }

}

# $cc = new climacell("41.9786551,-91.7340449");
# $cc->debug_dump();
?>
