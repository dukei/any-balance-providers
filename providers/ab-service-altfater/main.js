
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
	var baseurl = 'http://altfater.ru/index.php/proverit-zadolzhennost/proverit-zadolzhennost-naselenie';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите номер лицевого счета!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var payload = {
        'NLS': prefs.login,
        'button6': 'Проверить'
    };

    html = AB.requestPostMultipart(baseurl + '?chronoform=Proverka-dolgov&event=submit', payload);

    if (!/<p>лицевой счет/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div class="gbs3"[\s\S]*?<form[^>]*>[\s\S]*?<\/form>([\s\S]+?)</i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error);
        }

        throw new AnyBalance.Error('Не удалось получить данные по лицевому счету. Сайт изменен?');
    }

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Внес(?:ё|е)н\s*аванс\s*=([\s\S]*?)</i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'personal_account', /<p>лицевой счет([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'address', /<p>адрес:([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
