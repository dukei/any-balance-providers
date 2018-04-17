
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
	var baseurl = 'http://s-inform.net/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'private-office/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        login: prefs.login,
        password: prefs.password,
        auth: 'Войти'
    };

	html = AnyBalance.requestPost(
        baseurl + 'private-office/',
        params,
	    AB.addHeaders({Referer: baseurl + 'private-office/'})
    );

	if (/<input[^>]*"auth"/i.test(html)) {
		var error = AB.getParam(html, null, null, /class="error">([^<]+)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /счёта и пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'internet_balance', /ваших балансах[\s\S]*?интернет\D+([\d.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'tv_balance', /ваших балансах[\s\S]*?ТВ\D+([\d.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'phone_balance', /ваших балансах[\s\S]*?телефония\D+([\d.]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'address', /адрес подключения[\s\S]*?<br>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'full_name', /Абонент[\s\S]*?<br>([^<]+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
