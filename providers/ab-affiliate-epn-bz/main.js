
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://epn.bz/ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'auth/login', {
    username: prefs.login,
    password: prefs.password,
	}, AB.addHeaders({
		Referer: baseurl + 'auth/login'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<strong[^>]*>([\s\S]*?)<\/strong>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неправильная пара/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

  if(isAvailable(['balance', 'balance_hold'])) {
    html = AnyBalance.requestGet(baseurl + 'profile/get-balance', addHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      Referer: baseurl + 'cabinet/'
    }));

    var json = getJson(html);
    AB.getParam(json.balance + '',      result, 'balance',      null, null, parseBalance);
    AB.getParam(json.balance_hold + '', result, 'balance_hold', null, null, parseBalance);

  }

  if(isAvailable(['clicks', 'cr', 'epc', 'hosts', 'impressions', 'leads', 'leads_hold'])) {
    html = AnyBalance.requestGet(baseurl + 'stats/get-statistic-by-day', addHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      Referer: baseurl + 'cabinet/'
    }));

    var json = getJson(html),
        last = isArray(json) ? (json.length - 1)  : [json].length - 1;

    AB.getParam(json[last].clicks + '',       result, 'clicks',       null, null, parseBalance);
    AB.getParam(json[last].hosts + '',        result, 'hosts',        null, null, parseBalance);
    AB.getParam(json[last].leads + '',        result, 'leads',        null, null, parseBalance);
    AB.getParam(json[last].leads_hold + '',   result, 'leads_hold',   null, null, parseBalance);
    AB.getParam(json[last].impressions + '',  result, 'impressions',  null, null, parseBalance);
    AB.getParam(json[last].epc + '',          result, 'epc',          null, null, parseBalance);
    AB.getParam(json[last].cr + '',           result, 'cr',           null, null, parseBalance);
  }

  if(isAvailable('pct')) {
    html = AnyBalance.requestGet(baseurl + 'profile', addHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      Referer: baseurl + 'cabinet/'
    }));

    var json = getJson(html);

    AB.getParam(json.rate + '', result, 'pct', null, null, parseBalance);
  }
	AnyBalance.setResult(result);
}
