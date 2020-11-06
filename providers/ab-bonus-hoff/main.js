
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
	var baseurl = 'https://hoff.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

    var fwl = Icewood(baseurl);
	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(fwl.isProtected(html))
	    html = fwl.executeScript(html);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + 'ajax/auth/auth_2018.php?backurl=%2F&is_ajax=y', addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl,
	}));

	var form = AB.getElement(html, /<form[^>]+authFormPopup[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'EMAIL') {
			return prefs.login;
		} else if (name == 'PASSWORD') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'ajax/auth/auth_n.php', params, AB.addHeaders({
		Accept: 'application/json, text/plain, */*',
		Referer: baseurl
	}));

	var json = getJson(html);

	if (!json.RESULT) {
		var error = json.MESSAGE && json.MESSAGE.TEXT;
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	var htmlPersonal = AnyBalance.requestGet(baseurl + 'personal/', addHeaders({
		Referer: baseurl
	}));

	html = AnyBalance.requestGet(baseurl + 'local/templates/redesign/components/bitrix/main.profile/main/tabs/loyalty.php', addHeaders({
		Referer: baseurl
	}));

	html = getJson(html).HTML;

	AB.sumParam(html, result, 'balance', /<div[^>]+elem-card__bonus--num[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance, aggregate_sum);
	AB.sumParam(html, result, '__tariff', /<div[^>]+elem-card__num[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, null, create_aggregate_join(', '));
	AB.getParam(htmlPersonal, result, 'fio', /<div[^>]+box-user__name[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(htmlPersonal, result, 'phone', /<input[^>]+PERSONAL_PHONE[^>]*value="([^"]*)/i, AB.replaceHtmlEntities);
	AB.sumParam(html, result, 'burn', /Дата ближайшего сгорания:([^<\(]*)/ig, AB.replaceTagsAndSpaces, AB.parseDate, aggregate_min);

	AnyBalance.setResult(result);
}
