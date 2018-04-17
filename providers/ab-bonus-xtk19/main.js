
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
	var baseurl = 'http://bonus.xtk19.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    if (/<meta[^>]*url=/i.test(html)) {
        html = AnyBalance.requestGet(baseurl, g_headers);
    }

	var params = {
        login: prefs.login,
        password: prefs.password,
        usersession: AB.getParam(html, null, null, /<input[^>]*usersession[^>]*value=["']([^"']+)/i),
        enteruser: 'ВХОД'
    };

	var postHtml = AnyBalance.requestPost(baseurl, params, AB.addHeaders({Referer: baseurl}));

    html = AnyBalance.requestGet(baseurl + 'cards', g_headers);

	if (!/logout/i.test(html)) {
        var error = AB.getParam(postHtml, null, null, /enter_message[^>]*>([\s\S]+?)<\/div>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /(?:логин|пароль)/i.test(error));
        }

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'full_name', /<div class="owncard"[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'card_number', /<div class="owncard"[^>]*>[\s\S]*?<span[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', /<div class="owncard"[^>]*>[\s\S]*?Статус([^<]+)/i, AB.replaceTagsAndSpaces);

	if (AnyBalance.isAvailable('bonuses')) {
        params = {
            action: 'getCardBalance',
            card: result['card_number']
        };

        html = AnyBalance.requestPost(
            baseurl + 'view/common/php/cards.lib.php',
            params,
            AB.addHeaders({
                Referer: baseurl + 'cards',
                'X-Requested-With': 'XMLHttpRequest'
            })
        );

        AB.getParam(html, result, 'bonuses', null, null, AB.parseBalance);
    }

	AnyBalance.setResult(result);
}
