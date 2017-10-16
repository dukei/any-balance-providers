/**

Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущую температуру воздуха с сайта https://www.flags8192.ru/. Для измерения температуры используется температурный 
датчик LM75AD под управлением UsbTenkiMux (http://www.schmut.com/other-stuff/usbtenki-mux), расположенный в 
п. Монастырщина Смоленской области и защищенный от воздействия внешних факторов, что позволяет довольно точно 
определять температуру воздуха. 

*/

function main(){
	AnyBalance.setDefaultCharset('UTF-8');
	
	var result = {success: true};
	AnyBalance.trace("Loading https://www.flags8192.ru/temps/temp22");
	var html = AnyBalance.requestGet('https://www.flags8192.ru/temps/temp22');
	
	AnyBalance.trace("Parsing current temperature");
	var regexp = /\S+/;
	result.temperature = parseFloat(html.match(regexp)[0]);
	
	AnyBalance.setResult(result);
}
