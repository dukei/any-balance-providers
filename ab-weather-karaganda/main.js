 
function getParam(result, data, paramName){
         if(AnyBalance.isAvailable(paramName)){
                result[paramName] = parseFloat($(data).find("point_1").attr(paramName));
        }

} 


function main(){
        AnyBalance.trace('Connecting to http://meteoclub.kz/meteoXML.php...');
      
        var result = {success: true};

        var info = AnyBalance.requestGet('http://meteoclub.kz/meteoXML.php', {
          "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryIu4PwUJhm5qcpsdI",
          "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"});
        var xmlDoc = $.parseXML(info), $xml = $(xmlDoc);
        getParam(result,$xml,'temperature');
        getParam(result,$xml,'pressure');
        getParam(result,$xml,'wind');       
      
        AnyBalance.setResult(result);
}
