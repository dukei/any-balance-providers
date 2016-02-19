
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
	var baseurl = 'https://cabinet.st.uz/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '', {
		'LoginForm[username]': prefs.login,
		'LoginForm[password]': prefs.password
	}, AB.addHeaders({
		Referer: baseurl + ''
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /Вход\s+в\s+личный\s+кабинет[\s\S]*?error[\s\S]*?<\/div>([\s\S]*?)<\/div>/i,
			AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /автор|парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, '__tariff', /Тариф:([\s\S]*?)<table/i, AB.replaceTagsAndSpaces);
	//состояние счёта

	AB.getParam(html, result, 'c_p_b_balance',
		/(?:Финансовая\s+история|Молиявий\s+тарих)[\s\S]*?(?:периода|ҳолати):([\s\S]*?)(?:Текущее|Шахсий)/i,
		AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency', 'c_p_b_balance'],
		/(?:Финансовая\s+история|Молиявий\s+тарих)[\s\S]*?(?:периода|ҳолати):([\s\S]*?)(?:Текущее|Шахсий)/i,
		AB.replaceTagsAndSpaces, AB.parseCurrency);
	AB.getParam(html, result, 'c_balance', /(?:Финансовая\s+история|Молиявий\s+тарих)[\s\S]*?(?:Текущее|Шахсий)([\s\S]*?)(?:Расход|Мавжуд)/i,
		AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'expense', /(?:Финансовая\s+история|Молиявий\s+тарих)[\s\S]*?(?:Расход|Мавжуд)([\s\S]*?)<div/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	//персональные данные
	AB.getParam(html, result, 'id', /\(ID\):([\s\S]*?)</i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date', /(?:Дата\s+регистрации|Рўйхатдан\s+ўтилган\s+сана):\s*<\/td>([\s\S]*?<\/td>)/i,
		AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'login', /Логин:\s*<\/td>([\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /(?:Мобильный\s+телефон|Уяли\s+телефон):([\s\S]*?)<div/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'exchange', /(<h4>Курс\s+валют[\s\S]*?<\/table>)/i, AB.replaceTagsAndSpaces);
	//Трафик
	var
		table = AB.getElement(html, /<div[^>]*class="[^"]*traffic[^"]*"[^>]*>[\s\S]*?(<table[^>]*>)/i),
		traffic = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi, AB.replaceTagsAndSpaces);

	AB.getParam(traffic.join(', '), result, 'traffic');


	// AB.getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
