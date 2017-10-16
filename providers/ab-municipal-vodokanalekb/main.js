
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://abon.vodokanalekb.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'physics/Default.aspx', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$MainContent$LoginTb') {
			return prefs.login;
		} else if (name == 'ctl00$MainContent$PasswordTb') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'physics/Default.aspx?AcceptsCookies=yes', params, AB.addHeaders({
		Referer: baseurl + 'physics/Default.aspx?AcceptsCookies=yes'
	}));

	if (!/LoginView1_LoginStatus1/i.test(html)) {
		var error = AB.getParam(html, null, null, /<span[^>]+MainContent_ErrLabel[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Ошибка входа/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

  if(isAvailable(['balance', 'accrued', 'paid', 'benefit'])) {
    html = AnyBalance.requestGet(baseurl + 'physics/Balance.aspx', g_headers);

    AB.getParam(html, result, 'balance',  /Сальдо[^>]*>([^<]*)/i,    AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'accrued',  /Начислено[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'paid',     /Оплачено[^>]*>([^<]*)/i,  AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'benefit',  /Льготы[^>]*>([^<]*)/i,    AB.replaceTagsAndSpaces, AB.parseBalance);
  }

  if(isAvailable(['fio', 'address'])) {
    html = AnyBalance.requestGet(baseurl + 'physics/AbonPage.aspx', g_headers);

    AB.getParam(html, result, 'fio',      /ФИО(?:[^>]*>){3}([^<]*)/i,   AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'address',  /Адрес(?:[^>]*>){3}([^<]*)/i, AB.replaceTagsAndSpaces);

  }

	AnyBalance.setResult(result);
}
