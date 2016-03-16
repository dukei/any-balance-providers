
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
	var baseurl = 'https://my-kolibri.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'user[email]') {
			return prefs.login;
		} else if (name == 'user[password]') {
			return prefs.password;
		}

		return value;
	});

	var postHtml = AnyBalance.requestPost(
        baseurl + 'login',
		params,
	    AB.addHeaders({
		    Referer: baseurl + 'login',
            'X-Requested-With': 'XMLHttpRequest'
	    })
    );
    html = AnyBalance.requestGet(baseurl + 'lk', AB.addHeaders({Referer: baseurl}));

	if (!/logout/i.test(html)) {

        try {
            var json = AB.getJson(postHtml);
        }
        catch (e) {}

		if (json && json.error) {
			throw new AnyBalance.Error(json.error, null, /e-mail или пароль/i.test(json.error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}


	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /((?:[^>]+>){2})текущий баланс/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'purchase', /<div class="number">((?:[^>]+>){2})мои покупки/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'service_package', /пакет услуг:([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'full_name', /пакет услуг:([^>]+>){3}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'cash_back', /<div class="number">((?:[^>]+>){2})cash back/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'money_back_plus', /<div class="number">((?:[^>]+>){2})money back plus/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'friend_bounty', /<div class="number">((?:[^>]+>){2})премия друзья/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'partner_bounty', /<div class="number">((?:[^>]+>){2})премия партнер/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'team_bounty', /<div class="number">((?:[^>]+>){2})премия команда/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
