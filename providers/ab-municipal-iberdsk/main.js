
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.iberdsk.ru/personal/profile/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        'AUTH_FORM': 'Y',
        'TYPE': 'AUTH',
        'backurl': '/personal/profile/',
        'USER_LOGIN': prefs.login,
        'USER_PASSWORD': prefs.password,
        'Login': ''
    };

	html = AnyBalance.requestPost(
        baseurl + '?login=yes',
        params,
        AB.addHeaders({
		    Referer: baseurl
	    })
    );

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /errortext[^>]*>([^>]*>)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    html = AnyBalance.requestGet(baseurl + 'receipt/', AB.addHeaders({Referer: baseurl + '?login=yes'}));

	var result = {
		success: true
	};

	AB.getParam(html, result, 'sewerage', /водоотведение(?:[^>]*>){24}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'hot_water', /горячая вода(?:[^>]*>){24}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cold_water', /холодная вода(?:[^>]*>){24}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'heating', /отопление(?:[^>]*>){24}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'housekeeping', /содержание общего(?:[^>]*>){24}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'to_pay', /итого к оплате за расчетный период[^>]*>([^>]*>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'account_number', /лицевой счет:([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'full_name', /"user"[^<]*([^>]*>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /адрес:([^>]*>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'area', /площадь помещения:([^>]*>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'residents_count', /количество проживающих:([^>]*>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'accounting_period', /class="rcpt"(?:[^>]*>){32}([^>]+>)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
