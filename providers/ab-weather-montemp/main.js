/**

Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущую температуру воздуха с сайта https://listratenkov.com/. Для измерения температуры используется температурный 
датчик LM75AD под управлением UsbTenkiMux (http://www.schmut.com/other-stuff/usbtenki-mux), расположенный в 
п. Монастырщина Смоленской области и защищенный от воздействия внешних факторов, что позволяет довольно точно 
определять температуру воздуха. 

*/

function main(){
	AnyBalance.setDefaultCharset('UTF-8');
	
	var result = {success: true};
	AnyBalance.trace("Loading https://listratenkov.com/temps/temp22");
	var html = AnyBalance.requestGet('https://listratenkov.com/temps/temp22');
	
	AnyBalance.trace("Parsing current temperature");
	var regexp = /\S+/;
	result.temperature = parseFloat(html.match(regexp)[0]);
	
	AnyBalance.setResult(result);
}
