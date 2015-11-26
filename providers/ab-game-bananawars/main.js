/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://bananawars.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	/* Проверка наличия логина и пароля */
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html;
	
	var data = {
			auth_name: prefs.login,
			auth_pass: prefs.password
	};
	
	html = AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl, data, addHeaders({Referer: baseurl}));
	
	var error = getParam(html, null, null, /(Неправильный пароль)/i, replaceTagsAndSpaces, html_entity_decode);
	
	//console.log("error: " + error);
	
	if (error) {
		//AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout');
		throw new AnyBalance.Error(error, false, true);
	}
	
	var errCode = getParam(html, null, null, /(Неправильный код)/i, replaceTagsAndSpaces, html_entity_decode);
	if(errCode) {
		throw new AnyBalance.Error(errCode, true, true);
	}
	//console.log("errCode: " + errCode);
	/*if(errCode) {
		var captchaimg = AnyBalance.requestGet(baseurl + 'cls/common/code.php');
		var value = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки.", captchaimg, {inputType: 'text'});
		AnyBalance.trace("Capche value: " + value);
		data.Code = value;
		AnyBalance.trace("data: " + data.auth_name + "  " + data.auth_pass + "   " + data.Code);
		html = AnyBalance.requestPost(baseurl, data);
	}*/
	
	//var levelReg = /Уровень:.*?>[^>\d]*?(\d+)[^<\d]*?</i;
	var levelReg = /Уровень:([\s\S]+?)<\/td>/i;
	//var boostersReg = /Бустеры:.*?(?:[^>]*>){4}([\s\S]+?)</i;
	var boostersReg = /Бустеры:([\s\S]+?)<\/td>/i;
	//var moneyReg = /Деньги:.*?(?:[^>]*>){5}([\s\S]+?)</i;
	var moneyReg = /Деньги:([\s\S]+?)<\/td>/i;
	//var ratingReg = /Рейтинг:.*?(?:[^>]*>){4}([\s\S]+?)</i;
	var ratingReg = /Рейтинг:([\s\S]+?)<\/td>/i;
	//var placeReg = /Место:.*?(?:[^>]*>){4}([\s\S]+?)</i;
	var placeReg = /Место:([\s\S]+?)<\/td>/i;
	//var pointsReg = /Очки:.*?(?:[^>]*>){4}([\s\S]+?)</i;
	var pointsReg = /Очки:([\s\S]+?)<\/td>/i;
	//var mailReg = /Почта:.+?<a href=\/mail\/>([\s\S]*?)<\/a>/i;
	var mailReg = /Почта:([\s\S]+?)<\/td>/i;
	
	//var re = [/<td[^>]*?>/im, /Уровень:/i];
	//var els = getElements(html, re, replaceTagsAndSpaces, parseBalance);
	//console.log("els: " + els);
	
	var result = {success: true};
	getParam(html, result, 'level', levelReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'boosters', boostersReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'money', moneyReg, replaceTagsAndSpaces, parseMoney);
	getParam(html, result, 'rating', ratingReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'points', pointsReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'place', placeReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'mail', mailReg, replaceTagsAndSpaces, removeSpaces);
	
	// AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout');
	
	AnyBalance.setResult(result);
}

function removeSpaces(text) {
	var retValue = text.replace(/\s+/g, '');
	return retValue;
}

/* Специальная функция для парсинга денег в игре. Отличие от стандартного парсера parseFloat в том,
 * что здесь точкой разделяются тысячи, а само число представляет собой int */
function parseMoney(text) {	
	return parseInt(parseBalanceSilent(text.replace(/\./g, '')));
}