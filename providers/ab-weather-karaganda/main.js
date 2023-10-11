 
function getValue(result, data, paramName){
         if(AnyBalance.isAvailable(paramName)){
                result[paramName] = getParam(data, result, paramName, new RegExp("\\b" + paramName + "=\"(\\d+)"), replaceHtmlEntities, parseBalance);
        }

} 


function main(){
        AnyBalance.trace('Connecting to http://meteoclub.kz/meteoXML.php...');
      
        var result = {success: true};

        var info = AnyBalance.requestGet('http://meteoclub.kz/meteoXML.php', {
          "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryIu4PwUJhm5qcpsdI",
          "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"});
        
	getValue(result,info,'temperature');
        getValue(result,info,'pressure');
        getValue(result,info,'wind');       
      
        AnyBalance.setResult(result);
}
