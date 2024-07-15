<?php
include "config.inc";

class tomorrow_io{
   private $base_url = BASE_URL;
   private $api_key = TOMORROW_IO_KEY;
   private $location;
   private $realtime_url;
   private $nowcast_url;
   private $hourly_url;
   private $daily_url;
   private $data;

    private function build_url(){
     $this->url = $this->base_url . "forecast"
       . "?location=" . urlencode(preg_replace("/[,]/", "", $this->location))
       . "&units=imperial"
       . "&apikey=" . $this->api_key;
   }

   private function fetch_data(){
     $ccData = json_decode(file_get_contents($this->url));

     $this->data['current_temp'] = round($ccData->timelines->minutely[0]->values->temperature);

     foreach (array_slice($ccData->timelines->minutely,0,61) as $minute){
       $time = strtotime($minute->time); // This is going to be a unix timestamp.
       $this->data['next_hour_rain_chance'][$time]['rain'] = round($minute->values->precipitationProbability);
       $this->data['next_hour_rain_chance'][$time]['temp'] = round($minute->values->temperature);
     }

     foreach (array_slice($ccData->timelines->hourly,0,49) as $hour){
       $time = strtotime($hour->time); // This is going to be a unix timestamp.
       $this->data['next_two_day_rain_chance'][$time]['rain'] = round($hour->values->precipitationProbability);
       $this->data['next_two_day_rain_chance'][$time]['temp'] = round($hour->values->temperature);
     }

     foreach(array_slice($ccData->timelines->daily,0,8) as $day){
       $time = strtotime($day->time); // This is going to be a unix timestamp.
       $this->data['next_week_rain_chance'][$time]['rain'] =     round($day->values->precipitationProbabilityAvg);
       $this->data['next_week_rain_chance'][$time]['lowtemp'] =  round($day->values->temperatureMin);
       $this->data['next_week_rain_chance'][$time]['hightemp'] = round($day->values->temperatureMax);
     }

     if (isset($ccData->location)){
       $this->data['location'] = $ccData->location;
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

# $cc = new tomorrow_io("41.9786551,-91.7340449");
# $cc = new tomorrow_io("toledo, oh");
# $cc->debug_dump();
?>
