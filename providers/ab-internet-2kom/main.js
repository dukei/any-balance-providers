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
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://2kom.ru/";

    var html = AnyBalance.requestGet(baseurl + 'lk/', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    if (!isLoggedIn(html)) {
        html = AnyBalance.requestPost(baseurl + 'lk/login.php', {
            login: prefs.login,
            password: prefs.password,
            p: ''
        }, {'Referer': baseurl + 'lk/login.php'});

        if (!isLoggedIn(html)) {
            var error = getElement(html, /<div[^>]+login-error-text[^>]*>/i, [replaceTagsAndSpaces, /\s*Если вы забыли.*/i, '']);
            if (error)
                throw new AnyBalance.Error(error, null, /неправильные данные/i.test(error));

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
		html = AnyBalance.requestGet(baseurl + "lk/", g_headers);
    }
	
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<span[^>]+lk--order_balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Накопленные бонусы[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'userName', /<div[^>]+lk--persona[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'licschet', /<div[^>]+lk--pact[^>]*>([\s\S]*?)<\/div>/i, [/<h\d[^>]*>[\s\S]*?<\/h\d>/i, '', replaceTagsAndSpaces]);
	getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	getParam(html, result, 'ip', /<div[^>]+lk--ip[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'speed', /Текущая скорость[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

	getParam(html, result, 'trafficIn', /Входящий[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseTrafficGb);
	getParam(html, result, 'trafficOut', /Исходящий[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseTrafficGb);

	var periodDiv = getElement(html, /<div[^>]+lk--order_current-day_content[^>]*>/i, replaceTagsAndSpaces);
	getParam(periodDiv, result, 'period', /по (.*)/i, null, parseDate);
	getParam(html, result, 'daysleft', /Осталось:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}

function isLoggedIn(html) {
    return /lk--profile/i.test(html);
}