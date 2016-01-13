/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Получает баланс и информацию из личного кабинета "Мониторинг Жилищного Фонда" Тверской области
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

	var baseurl = 'https://portal-tver.itgkh.ru/';
	var helpStr = 'index/login/';
	var heptStrForGet = '';
	var helpStrAccount = 'account';
	var helpStrAccrual = 'account/accrual';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');


	var html = AnyBalance.requestGet(baseurl + heptStrForGet, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		}
		else if (name == 'password') {
			return prefs.password;
		}
		return value;
	});

	html = AnyBalance.requestPost(baseurl + helpStr, {
		'form[login]': prefs.login,
		'form[password]': prefs.password
	}, AB.addHeaders({
		Referer: baseurl + helpStr
	}));
	AnyBalance.trace(html);


	var json = AB.getJson(html);
	if (!json.status) {
		//  var error = json.error;
		var errorCode = json.code;
		// var message = json.message;
		if (errorCode) {
			var errorMessage = json.message;
			throw new AnyBalance.Error(error, null, /пользователь не найден!/i.test(
				message));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + helpStrAccount, g_headers);

	 if (!/logout/i.test(html)) {
	 	//var error = AB.getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
	 	//if (error)
	 	//	throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
	 	AnyBalance.trace(html);
	 	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	 }

	var result = {
		success: true
	};

	var dataForm = AB.getElement(html, /\<form[^>]+class=\"\s*form-horizontal\s*\"[^>]*\>/i);

	AB.getParam(dataForm, result, 'debt', /Задолженность по сч[ёе]ту[\s\S]*?<input[^>]*\bvalue=\"(\s*-?\d+(\.\d+)?\s*)\"/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	html = AnyBalance.requestGet(baseurl + helpStrAccrual, g_headers);

	var tableData = AB.getElement(html,
		/<table\s+class="[^"]*data_table[^"]*"[^>]*>/i);

	AB.getParam(tableData, result, 'freshPeriod', /<td>[а-я\s\d]+<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDateWord);
	AB.getParam(tableData, result, 'accruedMoney', /<a[^>]*\bhref="[/\w]*credited[/\w\d]*[^>]*\>(\s*-?\d+(\.\d+)?\s*)\<\/a\>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(tableData, result, 'paidMoney', /<a[^>]*\bhref="[/\w]*paid[/\w\d]*[^>]*\>(\s*-?\d+(\.\d+)?\s*)\<\/a\>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
