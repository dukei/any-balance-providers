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
	var baseurl = 'https://lk.npfe.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите пароль!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!isLoggedIn(html)) {

        var params = createFormParams(html, function (params, str, name, value) {
            if (name == '_nonempty_login4')
                return prefs.login;
            else if (name == '_nonempty_password4')
                return prefs.password;

            return value;
        });

        html = AnyBalance.requestPost(
            baseurl,
            params,
            addHeaders({Referer: baseurl})
        );

        if (!isLoggedIn(html)) {
            var error = getParam(html, null, null, /<span class="mess">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
            if (error) {
                throw new AnyBalance.Error(error, null, /(?:не\s+найдены|неверный)/i.test(error));
            }
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    }

	var result = {success: true};
	
	getParam(html, result, 'balance', /всего накоплено(?:[\s\S]*?)<td class="format-sum">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /номер договора(?:[\s\S]*?<\/tr>[\s\S]*?)<td>\s*<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

    if (AnyBalance.isAvailable('balance_income')) {
        var url = getParam(html, null, null, /href="(\/ru\/savings\/nonstate\/[^"]*?)"/i);
        if (url) {
            html = AnyBalance.requestGet(baseurl + url);
            getParam(html, result, 'balance_income', /<div class="top">[\s\S]*?<span class="summ">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

	AnyBalance.setResult(result);
}

function isLoggedIn(html) {
    return /logout/i.test(html);
}