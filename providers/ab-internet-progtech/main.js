/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Получает баланс и информацию о тарифном плане для интернет провайдера Прогтех

 Сайт: http://progtech.ru/
 Личный кабинет: https://stat.progtech.ru/
 */

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var baseurl = 'https://stat.progtech.ru/';

	AnyBalance.setDefaultCharset('koi8-r');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl, {
		'form_data[action]': 'startup',
		'form_data[logname]': prefs.login,
		'form_data[password]': prefs.password
	}, AB.addHeaders({Referer: baseurl}));

	if(!/выход/i.test(html)){
		var error = AB.getParam(html, null, null, /<p[^>]align="center">([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
		if(error){
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test());
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /Текущее\s+состояние\s+счета:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'disableLimit', /Порог\s+отключения:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'access', /Состояние\s+доступа:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'paymentIn', /Приход\s+за\s+текущий\s+период:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'paymentOut', /Расход\s+за\s+текущий\s+период:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'currentTariff', /Действующий\s+тариф:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'futureTariff', /Будущий\s+тариф\s+\([^)]*\)[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'changeTariffDate', /Будущий\s+тариф([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, 'trafficBalance', /Остаток\s+предоплаченного\sтрафика:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'currentLimit', /Действующий лимит:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

        AnyBalance.setResult(result);
}