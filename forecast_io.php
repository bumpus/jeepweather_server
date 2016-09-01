<?php
class forecast_io{
   private $base_url = "https://api.forecast.io/forecast/";
   private $api_key = "Insert YOUR KEY here";
   private $location;
   private $service_url;
   
   function __construct($search_location){
      $this->location = $search_location;
      $this->service_url = $this->base_url.$this->api_key.'/'.$this->location;
   }

   function get_url(){
      return $this->service_url;
   }

}
?>

