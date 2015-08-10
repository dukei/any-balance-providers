/**

Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущую погоду с сайта http://www.flags8192.ru/temps/. Для измерения температуры используется температурный 
датчик собственного производства под управлением UsbTenkiMux (тоже собственного производства), расположенный в 
п. Монастырщина Смоленской области и защищенный от воздействия внешних факторов, что позволяет довольно точно 
определять температуру воздуха. 

*/

function main(){
	AnyBalance.setDefaultCharset('UTF-8');
	
	var result = {success: true};
	AnyBalance.trace("Loading http://www.flags8192.ru/temps/");
	var html = AnyBalance.requestGet('http://www.flags8192.ru/temps/temp2');
	
	AnyBalance.trace("Parsing current temperature");
	var regexp = /\S+/;
	result.temperature = parseFloat(html.match(regexp)[0]);
	
	AnyBalance.setResult(result);
}
