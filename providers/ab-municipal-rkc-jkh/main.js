/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://rkc-jkh.ru/lk/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);

	if(/Личный кабинет закрыт в связи с закрытием месяца/i.test(html))
		throw new AnyBalance.Error('Личный кабинет закрыт в связи с закрытием месяца. Попробуйте позже');
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = AB.getElement(html, /<form[^>]+login[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'search') {
			return prefs.login;
		} else if (name == 'secondname') {
			return prefs.password;
		} else if (name == 'code') {
			var imgurl = getParam(form, /<img[^>]+src=['"]([^'"]*)[^>]+capt?cha/i, replaceHtmlEntities);
			var img = AnyBalance.requestGet(baseurl + imgurl, addHeaders({Referer: baseurl}));

			return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number'});
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'access.php', params, addHeaders({Referer: baseurl + 'login.php'}));
	
	if (!/Задолженность на начало месяца/i.test(html)) {
		var error = getElement(html, /<font[^>]+red/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /не существует/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Год(?:[\s\S]*?<td[^>]*>){8}((?:[\s\S]*?<\/td>){2})/i, [replaceTagsAndSpaces, /\s+/g, ' ']);
	// Задолженность на начало месяца
	getParam(html, result, 'balance', /Задолженность на начало месяца(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// Предварительное начисление
	getParam(html, result, 'plan', /Предварительное начисление(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// Перерасчеты
	getParam(html, result, 'pere', /Перерасчеты(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// Начислено на тек. дату
	getParam(html, result, 'fakt', /Начислено на тек. дату(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// Поступления
	getParam(html, result, 'postup', /Поступления(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// Задолженность на конец месяца без учета пеней
	getParam(html, result, 'debt_end', /Задолженность на конец месяца(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}
