/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

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
	
	AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout');
	html = AnyBalance.requestPost(baseurl, data);
	
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
	
	var levelReg = /Уровень:.*?>[^>\d]*?(\d+)[^<\d]*?</im;
	var boostersReg = /Бустеры:.*?(?:[^>]*>){4}(\d+)</im;
	var moneyReg = /Деньги:.*?(?:[^>]*>){4}(\d+)</im;
	var ratingReg = /Рейтинг:.*?(?:[^>]*>){4}(\d+)</im;
	var placeReg = /Место:.*?(?:[^>]*>){4}(\d+)</im;
	var pointsReg = /Очки:.*?(?:[^>]*>){4}(\d+)</im;
	var mailReg = /Почта:.+?<a href=\/mail\/>(.*?)<\/a>/im;
	
	
	var result = {success: true};
	getParam(html, result, 'level', levelReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'boosters', boostersReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'money', moneyReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'rating', ratingReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'points', pointsReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'place', placeReg, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'mail', mailReg, replaceTagsAndSpaces, removeSpaces);
	
	AnyBalance.requestGet(baseurl + 'xml/main/logout.php?do=logout');
	
	AnyBalance.setResult(result);
}

function removeSpaces(text) {
	var retValue = text.replace(/\s+/g, '');
	return retValue;
} 