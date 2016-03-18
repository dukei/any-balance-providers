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

function parseTrafficGb(str) {
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
	return parseFloat((val / 1024).toFixed(2));
}

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://portal.2kom.ru/";

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    if (!isLoggedIn(html)) {
        html = AnyBalance.requestPost(baseurl + 'login.php', {
            login: prefs.login,
            password: prefs.password,
            r: '',
            p: ''
        }, {'Referer': baseurl + 'login.php'});

        if (!isLoggedIn(html)) {
            var error = getParam(html, null, null, /var login_error\s*=\s*'([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
            if (error)
                throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    }
	
	html = AnyBalance.requestGet(baseurl + "lk/");
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*Баланс[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонус\s*<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'userName', /<label>Абонент\s*(.*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'licschet', /<label>№ договора\s*(.*)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<label>Тариф\s*(.*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<label>Состояние\s*(.*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'ip', /Доступ в Интернет(?:[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'speed', /Текущая скорость\s*([^\]]*)/i, replaceTagsAndSpaces);

	if (AnyBalance.isAvailable('trafficIn', 'trafficOut', 'period', 'daysleft')) {
		var href = getParam(html, null, null, /<a[^>]*href="(lk\/stat.php[^"]*)/i);
		if (href) {
			html = AnyBalance.requestGet(baseurl + href);
			getParam(html, result, 'trafficIn', /<tr class="current">(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
			getParam(html, result, 'trafficOut', /<tr class="current">(?:[\s\S]*?<td[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
			
			sumParam(html, result, 'period', /"period_dates"(?:[^>]*>){1}[\s\d.,]*-([^<]+)/ig, replaceTagsAndSpaces, parseDate, aggregate_max);
			
			if(isset(result.period)) {
				var dt = new Date().getTime();
				dt = result.period - dt;
				var days = Math.round(dt/86400000);
				AnyBalance.trace('Days left: ' + days);
				
				getParam(days*1, result, 'daysleft');
			}
		} else {
			AnyBalance.trace("Can not find statistics url!");
		}
	}
	AnyBalance.setResult(result);
}

function isLoggedIn(html) {
    return />Выход</i.test(html);
}