/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

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
	
	var html = AnyBalance.requestPost(baseurl + "login.php", {
		login: prefs.login,
		password: prefs.password,
		r: '',
		p: ''
	}, {'Referer': baseurl + 'login.php'});
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /var login_error\s*=\s*'([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + "lk/");
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*Баланс[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонус\s*<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'userName', /<label>Абонент\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /<label>№ договора\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<label>Тариф\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /<label>Состояние\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
	
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