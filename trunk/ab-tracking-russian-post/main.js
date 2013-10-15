/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления Почты России

Сайт оператора: http://www.russianpost.ru
Личный кабинет: http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo
*/
function main() {
	var prefs = AnyBalance.getPreferences();
	if (!prefs.code) //Код отправления, введенный пользователем
		throw new AnyBalance.Error("Введите код отправления!");
	
	mainRussianPost();
	
	/*if (prefs.type == 'rp')
		mainRussianPost();
	else if (/^\d+$/.test(prefs.code)) {
		AnyBalance.trace('Идентификатор ' + prefs.code + ' похож на идентификатор почты России, а не на EMS. Попытаемся обработать его через russianpost.ru');
		mainRussianPost();
	} else 
		mainEms();*/
}

function myGetJson(html) {
	var json = getJson(html);
	if (!json.d) {
		AnyBalance.trace(html);
		if (json.Message)
			throw new AnyBalance.Error(json.Message);
		throw new AnyBalance.Error("Неверный ответ от сервера!");
	}
	json = json.d;
	if (json.errorMessage)
		throw new AnyBalance.Error(json.errorMessage);
	return json;
}

function mainEms() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Connecting to ems...');
	var info = AnyBalance.requestGet("http://www.emspost.ru/ru/tracking/?id=" + prefs.code.toUpperCase(), {	Referer: 'http://www.emspost.ru/ru/' });
	var table = getParam(info, null, null, /<div[^>]+id="trackingResult"[^>]*>([\s\S]*?)<\/div>/i);
	if (!table)
		throw new AnyBalance.Error('Не найдены данные по отправлению. Неверный номер отправления или сайт изменен.');
	var lasttr = getParam(table, null, null, /(<tr>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<\/tr>\s*<\/tbody>)/i);
	if (!lasttr) {
		var error = getParam(table, null, null, /<td[^>]+style=['"]color:#ff0000[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('В этом отправлении нет зарегистрированных операций!');
	}
	var date = getParam(lasttr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	var location = getParam(lasttr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	var operation = getParam(lasttr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	var addcost = getParam(table, null, null, /Наложенный платеж[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	var result = {success: true};
	if (AnyBalance.isAvailable('date')) 
		result.date = date;
	if (AnyBalance.isAvailable('location'))
		result.location = location;
	if (AnyBalance.isAvailable('operation'))
		result.operation = operation;
	if (AnyBalance.isAvailable('addcost'))
		result.addcost = addcost;
	if (AnyBalance.isAvailable('fulltext')) {
		//Все поддерживаемые атрибуты (кроме img) находятся здесь
		//http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html
		result.fulltext = '<small>' + date + '</small>: <b>' + operation + '</b><br/>\n' + location + '<br/>\n' + (addcost ? 'Н/п ' + addcost + 'руб.' : '');
	}
	AnyBalance.setResult(result);
}

function checkForErrors(info) {
	var matches;
	if (matches = /<p[^>]*class="red"[^>]*>([\s\S]*?)<\/p>/i.exec(info)) //Проверяем на сообщение об ошибке
		throw new AnyBalance.Error(matches[1]);
	if (/<h1>Server is too busy<\/h1>/i.test(info))
		throw new AnyBalance.Error("Сервер russianpost.ru перегружен. Попробуйте позже.");
	var error = getParam(info, null, null, /<div[^>]+id="CaptchaErrorCodeContainer"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
}

function checkForRedirect(info, baseurl) {
	//<html><head></head><body onload="document.myform.submit();"><form method="post" name="myform" style="visibility:hidden;"><input id="key" name="key" value="288041"/><input type="submit"/></form></body></html> 
	var form = getParam(info, null, null, /<form[^>]+name="myform"[^>]*>([\s\S]*?)<\/form>/i);
	if (form) { //Зачем-то редирект. Что придумали, зачем?...
		AnyBalance.trace('Вернули форму редиректа...');
		var params = createFormParams(form);
		info = AnyBalance.requestPost(baseurl, params);
		checkForErrors(info);
	}
	if (/window.location.replace\(window.location.toString/.test(info)) {
		AnyBalance.trace('Ещё разок редиректнули...');
		info = AnyBalance.requestGet(baseurl);
		checkForErrors(info);
	}
	return info;
}

function mainRussianPost() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Connecting to russianpost...');
	var baseurl = 'http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo';
	var info = AnyBalance.requestGet(baseurl);
	info = checkForRedirect(info, baseurl);
	var form = getParam(info, null, null, /<form[^>]+name="F1"[^>]*>([\s\S]*?)<\/form>/i);
	if (!form) {
		checkForErrors(info);
		throw new AnyBalance.Error('Не удалось найти форму запроса. На сайте обед?');
	}
	var captcha = '';
	if (AnyBalance.getLevel() >= 7) {
		var captchaimg = getParam(form, null, null, /<img[^>]+id='captchaImage'[^>]*src=['"]([^'"]*)/, null, html_entity_decode);
		if (captchaimg) {
			captchaimg = AnyBalance.requestGet('http://www.russianpost.ru' + captchaimg);
			captcha = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки. Если вы хотите получать статус отправления Почты России без ввода кода, воспользуйтесь провайдером \"Моя посылка\".", captchaimg);
		}
	}
	var params = createFormParams(info, function(params, input, name, value) {
		var undef;
		if (name == 'BarCode')
			value = prefs.code.toUpperCase();
		else if (name == 'searchsign')
			value = 1;
		else if (name == 'searchbarcode')
			value = undef;
		else if (name == 'InputedCaptchaCode')
			value = captcha;
		return value;
	});
	var dt = new Date();
	var info = AnyBalance.requestPost(baseurl, params);
	AnyBalance.trace('Проверяем, нет ли ошибок...');
	checkForErrors(info);
	info = checkForRedirect(info, baseurl);
	var result = {success: true}, matches;
	result.__tariff = prefs.code;
	AnyBalance.trace('trying to find table');
	//Сначала найдём таблицу, содержащую все стадии отправления
	var alltable = getParam(info, null, null, /<table[^>]+id="tbl_track_results"[^>]*>([\s\S]*?)<\/table>/i);
	if (alltable) {
		AnyBalance.trace('found table');
		var firstRow = getParam(alltable, null, null, /<tr[^>]*>(\s*<td[\s\S]*?)<\/tr>/i);
		var addcost = getParam(firstRow, result, 'addcost', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		//Потом найдем там последнюю строку
		var lasttr = alltable.lastIndexOf('<tr');
		AnyBalance.trace('found last row at ' + lasttr);
		info = alltable.substring(lasttr);
		AnyBalance.trace(info);
		//Потом найдем отдельные поля
		if (matches = info.match(/<tr[^>]*><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/i)) {
			AnyBalance.trace('parsed fields');
			var operation, date, location, attribute;
			if (AnyBalance.isAvailable('fulltext', 'operation'))
				operation = matches[1];
			if (AnyBalance.isAvailable('fulltext', 'date'))
				date = matches[2];
			if (AnyBalance.isAvailable('index')) 
				result.index = getParam(matches[3], null, null, /(.*)/, replaceTagsAndSpaces);
			if (AnyBalance.isAvailable('fulltext', 'location')) 
				location = matches[4];
			if (AnyBalance.isAvailable('fulltext', 'attribute')) 
				attribute = matches[5];
			if (AnyBalance.isAvailable('weight')) 
				weight = matches[6];
			if (AnyBalance.isAvailable('operation')) 
				result.operation = operation;
			if (AnyBalance.isAvailable('date')) 
				result.date = date;
			if (AnyBalance.isAvailable('date')) 
				result.date = date;
			if (AnyBalance.isAvailable('location')) 
				result.location = location;
			if (AnyBalance.isAvailable('attribute')) 
				result.attribute = attribute;
			if (AnyBalance.isAvailable('fulltext')) {
				//Все поддерживаемые атрибуты (кроме img) находятся здесь
				//http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html
				result.fulltext = '<small>' + date + '</small>: <b>' + operation + '</b><br/>\n' + location + '<br/>\n' + attribute + (addcost ? ', Н/п ' + addcost + 'р' : '');
			}
			AnyBalance.setResult(result);
		}
	}
	if (!AnyBalance.isSetResultCalled()) {
		var error = getParam(info, null, null, /<div[^>]+CaptchaErrorCodeContainer[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error('ВНИМАНИЕ! Для получения информации по отправления Почты России пользуйтесь провайдером "Моя посылка". Напрямую получить информацию об отправлении не удаётся в связи с капчей на сайте почты россии.');
		throw new AnyBalance.Error("Отправление не найдено.")
	}
}