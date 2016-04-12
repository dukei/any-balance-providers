/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://pc.ekgas.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

  var params = {
    'ls':    prefs.login,
    'pass':  prefs.password
  };

	html = requestPostMultipart(baseurl + 'login.php', params, AB.addHeaders({
		Referer: baseurl + 'login.php',
	}));

	if (!/exit/i.test(html)) {
		var error = AB.getParam(html, null, null, /<center[^>]+red[^>]*>([\s\S]*?)<\/center>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверно введен пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance',    /Баланс:([\s\S]*?)<\//i,  AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio',        /ФИО:([\s\S]*?)<\//i,     AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address',     /Адрес:([\s\S]*?)<\//i,   AB.replaceTagsAndSpaces);

  if(isAvailable([''])) {
    var kvHREF = AB.getParam(html, null, null, /<a[^>]+href='.\/([^']*)'[^>]*>Квитанция/i);
    if(!kvHREF) {
      AnyBalance.trace(html);
      AnyBalance.trace("Не удалось найти ссылку на квитанцию.");
    } else {
      html = AnyBalance.requestGet(baseurl + kvHREF, g_headers);
      AB.getParam(html, result, 'debt',              /Задолженность за предыдущие периоды([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'a_payment',         /Аванс на начало расчетного период([^<]*)/i,   AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'to_pay',            /<b[^>]*>Всего к оплате([^<]*)/i,              AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'accrued',           /Итого:(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'last_payment_date', /Дата последней поступившей оплаты([^<]*)/i,   AB.replaceTagsAndSpaces, AB.parseDate);
    }
  }

	AnyBalance.setResult(result);
}
