/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru,en-US;q=0.8,en;q=0.6',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.npfe.ru';

    AnyBalance.setOptions({
        DEFAULT_CHARSET: 'windows-1251',
        SSL_ENABLED_PROTOCOLS: ['TLSv1.2']
    });

	checkEmpty(prefs.login, 'Введите пароль!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = createFormParams(html, function (params, str, name, value) {
        if (name == '_nonempty_login4')
            return prefs.login;
        else if (name == '_nonempty_password4')
            return prefs.password;

        return value;
    });

    try {
    	AnyBalance.sleep(3000); //Иначе не пускает
        html = AnyBalance.requestPost(baseurl + '/', params, addHeaders({
        	Origin: baseurl,
            Referer: baseurl + '/'
        }));
    } catch (e) {
        html = AnyBalance.requestGet(baseurl + '/ru/calc/', g_headers);
    }

    if (!/exit/.test(html)) {
        var error = AB.getParam(html, null, null, /<span class="mess">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /(?:не\s+найдены|неверный\s*пароль)/i.test(error));
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


	var result = {success: true};

    html = AnyBalance.requestGet(baseurl + '/ru/savings/', g_headers);

    // Всего накоплено (руб)
	AB.getParam(html, result, 'balance',   [/Накопительная пенсия(?:[\s\S]*?<td[^>]+format-sum[^>]*>){2}([^<]*)/i,
                                            /всего накоплено[\s\S]*?<td[^>]+format-sum[^>]*>([^<]*)/i],            AB.replaceTagsAndSpaces, AB.parseBalance);
	//Накопительная пенсия, страховые взносы (руб)
    AB.getParam(html, result, 'insurance',  /Накопительная пенсия(?:[\s\S]*?<td[^>]+format-sum[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    // Номер договора
    AB.getParam(html, result, '__tariff',  [/Накопительная пенсия(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
                                            /Номер договора(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i],            AB.replaceTagsAndSpaces);

    if (AnyBalance.isAvailable('balance_income')) {
        var url = getParam(html, null, null, /Накопительная пенсия(?:[\s\S]*?<td[^>]*>){4}[\s\S]*?<a[^>]+href="([^"]*)/i);
        if (url) {
            html = AnyBalance.requestGet(baseurl + url, g_headers);
            getParam(html, result, 'balance_income', /Инвестиционный доход(?:[\s\S]*?<span[^>]+summ[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        } else AnyBalance.trace("Не удалось найти ссылку на информацию об инвестиционном доходе.")
    }

	AnyBalance.setResult(result);
}