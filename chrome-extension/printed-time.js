function getPrintedTime(time, timeanddate){
      var d = new Date(1000*time);
      var hour;
      var ampm;
      if(d.getHours()<12){
         ampm='am';
      }else{
         ampm='pm';
      }
      if(d.getHours()==0){
         hour=12;
      }else{
         if (d.getHours()>12){
            hour=d.getHours()-12;
         }else{
            hour=d.getHours();
         }
      }

      if(timeanddate){
         return getDayName(d) + " at " + hour + ':' + ('0' + d.getMinutes()).slice(-2) + ampm +'.';
      }else{
         return getDayName(d);
      }
}


function getDayName(d){
   var now = new Date();
   var day = ""
   switch(d.getDate()-now.getDate()){
      case 0:
         day = "today";
         break;
      case 1:
         day = "tomorrow";
         break;
      default:
         switch(d.getDay()){
            case 0:
               day = "Sunday";
               break;
            case 1:
               day = "Monday";
               break;
            case 2:
               day = "Tuesday";
               break;
            case 3:
               day = "Wednesday";
               break;
            case 4:
               day = "Thursday";
               break;
            case 5:
               day = "Friday";
               break;
            case 6:
               day = "Saturday";
         }
   }
   return day;
}

