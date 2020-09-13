<?php
include "config.inc";

class ipinfo{
   private $base_url = "https://ipinfo.io/";
   private $api_key = IPINFO_KEY;
   private $url_suffix = "loc";
   private $client_ip;
   private $service_url;
   private $location;
   // Set this value if you have clients that will access the service
   // Using private LAN IP addresses. If these addresses are detected,
   // then the server will use its public IP for getting location.
   private $LANSUBNET = "192.168.0";
   

   function __construct($client_ip){
      $this->client_ip = $client_ip;

      //If the API key is set, then setup the URL to use it
      if (""!=$this->api_key){
         $this->url_suffix .= "?token=" . $this->api_key;
      }

      // If something is set in $LANSUBNET and it's found at the
      // beginning of the client ip, then we will make a bare request
      // to ipinfo.io to estimate the server's location.
      if(""!=$this->LANSUBNET && 0==strpos($this->client_ip,$this->LANSUBNET,0)){
         $this->service_url = $this->base_url . $this->url_suffix;
      }else{
         $this->service_url = $this->base_url .
                              $this->client_ip .
                              '/' .
                              $this->url_suffix;
      }
      
      // Make the call and store the response in location
      $this->location = trim(file_get_contents($this->service_url));
   }

   function get_location(){
      return $this->location;
   }
}
?>
