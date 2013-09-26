function getRate(result, item, code){
        if($(item).find("title").text() == code && AnyBalance.isAvailable(code)){
                       result[code] = $(item).find("description").text();
         }

} 
        
function main(){
        AnyBalance.trace('Connecting to www.nationalbank.kz');        
        var result = {success: true};          
        var info = AnyBalance.requestGet('http://www.nationalbank.kz/rss/rates_all.xml');
        var xmlDoc = $.parseXML(info), $xml = $(xmlDoc);
        $xml.find("item").each(
                function(){
                   getRate(result,$(this),'USD');
                   getRate(result,$(this),'EUR');
                   getRate(result,$(this),'RUB');
                }); 
         AnyBalance.setResult(result);
}
