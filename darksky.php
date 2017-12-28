<?php
class darksky{
   private $base_url = "https://api.darksky.net/forecast/";
   private $api_key = "dfd9d40971ae2f366b33808a85264dc9";
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