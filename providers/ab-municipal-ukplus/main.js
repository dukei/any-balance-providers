/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'en-XA,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,en-US;q=0.6',
	'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': 1
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('Windows-1251');

	var formattedPhone = getParam(prefs.phone || '', null, null, /\d{10}$/, [/^.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '($1) $2-$3-$4']);
	AnyBalance.trace(formattedPhone);

	checkEmpty(formattedPhone, 'Введите номер телефона, используемый для входа в личный кабинет (10 цифр). Вы ввели: "' + (prefs.phone || 'пустое значение') + '"!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var baseurl = 'https://lk.ukplus.ru/';

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'phone')
			return formattedPhone;
		else if (name == 'password')
			return prefs.password;

		return value;
    });

    html = AnyBalance.requestPost(baseurl + '?act=login', params, addHeaders({Referer: baseurl}));

	if (/d_err/i.test(html)) {
		var error = getParam(html, /<div[^>]+class="d_err[^>]*>(.*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Введите корректный пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Забыли пароль?');
	}

	var result = {success: true};

	if (AnyBalance.isAvailable('address') || AnyBalance.isAvailable('fio') || AnyBalance.isAvailable('provider')) {
		html = AnyBalance.requestGet(baseurl + '?type=profile', addHeaders({'Referer': baseurl + '?act=login'}));

		getParam(html, result, 'address', /Адрес:<\/span>([^>]+)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		result['fio'] = getParam(html, /ФИО:<\/span>([^>]+)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		result['provider'] = getParam(html, /Управляющая компания:<\/span>([^>]+)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	}
    html = AnyBalance.requestGet(baseurl + '?type=balance', addHeaders({'Referer': baseurl + '?act=login'}));

	result['account'] = getParam(html, /<div[^>]+class="item">(\d+) \|/i, replaceTagsAndSpaces, html_entity_decode);
	result['__tariff'] = getParam(html, /<div[^>]+class="item">\d+ \| ([^<]+)<br>/i, replaceTagsAndSpaces, html_entity_decode);
	var balance = getParam(html, /<div[^>]+class="item">.+<b>(.+)<\/b>/i, [/руб\./, '.', / коп\./, '']);
	result['balance'] = parseBalance(balance);

	result['period'] = getParam(html, /<div[^>]+id="accruals"><div[^>]+class="item">([^\|]+) \|/i);
	var accruals = getParam(html, /<div[^>]+id="accruals"><div[^>]+class="item">[^<]+<br>Начислено: ([^<]+)<br>/i, [/руб\./, '.', /коп\./, '']);
	result['accruals'] = parseBalance(accruals);
	var penalty = getParam(html, /<div[^>]+id="accruals"><div[^>]+class="item">[^<]+<br>[^<]+<br>Пени: ([^<]+)<br>/i, [/руб\./, '.', /коп\./, '']);
	result['penalty'] = parseBalance(penalty);
	var debt = getParam(html, /<div[^>]+id="accruals"><div[^>]+class="item">[^<]+<br>[^<]+<br>[^<]+<br>Задолженность: ([^<]+)<br>/i, [/руб\./, '.', /коп\./, '']);
	result['debt'] = parseBalance(debt);

	var replaceDivToBr = [/<\/*[^>]*>/ig, ' ', /\s+/ig, ' ', /^\s(.*)\s$/ig, '$1'];
	if (AnyBalance.isAvailable('messages')) {
		html = AnyBalance.requestGet(baseurl + '?type=messages', addHeaders({'Referer': baseurl + '?type=balance'}));
		var messages = getElements(html, /<div class="item"[^>]*>/ig, replaceDivToBr, html_entity_decode);
		result['messages'] = messages.slice(0, 5).join('<br>');
	}
	if (AnyBalance.isAvailable('notifications')) {
		html = AnyBalance.requestGet(baseurl + '?type=alert', addHeaders({'Referer': baseurl + '?type=balance'}));
		var notifications = getElements(html, /<div class="item"[^>]*>/ig, replaceDivToBr, html_entity_decode);
		result['notifications'] = notifications.slice(0, 5).join('<br>');
	}
	AnyBalance.setResult(result)

}
