/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий температура воздуха с сайта http://meteo.psu.ru/
*/

var g_headers = {
	'Accept': 		   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':  'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 	   'keep-alive',
	'User-Agent': 	   'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

function main(){
	AnyBalance.setDefaultCharset('UTF-8');
	var baseurl = 'http://meteo.psu.ru/';

	AnyBalance.trace("Loading meteo.psu.ru");

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	if(!/<table[^>]+class="text_r"[^>]*>/i.test(html)) {
		throw new AnyBalance.Error('Не удаётся найти текущую температуру. Сайт изменен?');
	}

	AnyBalance.trace("Parsing current temperature");
	var result = {success: true};
	
	var table = getElement(html, /<table[^>]+class="text_r"[^>]*>/i);

	AB.getParam(table, result, 'temperature', /Температура воздуха(?:[^>]*>){2}([^<]*)/i,   			AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'o_temp', 	  /Ощущаемая температура(?:[^>]*>){2}([^<]*)/i, 			AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'point_dew',   /Точка росы(?:[^>]*>){2}([^<]*)/i, 						AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'atm_davl',    /Атмосферное давление(?:[^>]*>){2}([^<]*)/i, 				AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'otn_vl_vozd', /Относительная влажность воздуха(?:[^>]*>){2}([^<]*)/i, 	AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'v_vetra', 	  /Ветер(?:[^>]*>){4}([^<]*)/i, 							AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'p_vetra', 	  /Порывы до(?:[^>]*>){2}([^<]*)/i, 						AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, 'napr_vetra',  /Ветер(?:[^>]*>){2}([^<]*)/i, 							AB.replaceTagsAndSpaces);


	AnyBalance.setResult(result);
}
