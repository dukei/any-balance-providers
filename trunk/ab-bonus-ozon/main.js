/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.69 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://www.ozon.ru/";
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestGet(baseurl + 'context/login/', g_headers);
	AnyBalance.trace(html);
	var vs = getViewState(html);
	if (!vs) throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен?');
	if (/<input[^>]+name="Answer"/i.test(html)) throw new AnyBalance.Error('Озон ввёл капчу при входе в личный кабинет. Провайдер временно не работает.');
	html = AnyBalance.requestPost(baseurl + 'context/login/', {
		__EVENTTARGET: '',
		__EVENTARGUMENT: '',
		__VIEWSTATE: vs,
		LoginGroup: 'HasAccountRadio',
		CapabilityAgree: 'on',
		'Authentication': 'Продолжить',
		Login: prefs.login,
		Password: prefs.password,
	}, addHeaders({
		Referer: baseurl + 'context/login/'
	}));
	if (!/context\/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="ErrorSpan"[^>]*>([\s\S]*?)<\/span>/i);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	var result = {
		success: true
	};
	if (AnyBalance.isAvailable('balance', 'blocked', 'available')) {
		html = AnyBalance.requestGet(baseurl + 'context/myaccount/', g_headers);
		getParam(html, result, 'balance', /Остаток средств на счете[\s\S]*?<span>([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'blocked', /Заблокировано[\s\S]*?<span>([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'available', /Доступные средства[\s\S]*?<span>([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	}
	if (AnyBalance.isAvailable('bonus')) {
		html = AnyBalance.requestGet(baseurl + 'context/mypoints/', g_headers);
		getParam(html, result, 'bonus', /"eOzonStatus_NumberPoints"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	html = AnyBalance.requestGet(baseurl + 'context/myclient/');
	getParam(html, result, '__tariff', /<div[^>]+class="big1"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.setResult(result);
}

function getViewState(html) {
	return getParam(html, null, null, /name="__VIEWSTATE"[^>]*value="([^"]*)/i) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}