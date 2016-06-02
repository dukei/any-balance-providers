
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

    var url = getParam(postHtml, null, null, /window.location.href\s*=\s*'([^']*)/);

    html = AnyBalance.requestGet(joinUrl(baseurl, url), AB.addHeaders({Referer: baseurl}));

	if (!url) {

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

	AB.getParam(html, result, 'full_name', /<div[^>]+user-place[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'balance', /<div[^>]+coints-place[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'service_package', /Мой пакет:([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /Мой пакет:([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
	AB.getParam(getElement(html, /<div[^>]+my-buy[^>]*>/i), result, 'money_back_plus', /<div[^>]+progress[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	var cashList = getElement(html, /<div[^>]+cash-list[^>]*>/i);
	var rows = getElements(cashList, /<div[^>]+row[^>]*>/ig);
	for(var i=0; i<rows.length; ++i){
		var row = replaceAll(rows[i], [/<div[^>]+success[\s\S]*?<\/div>/ig, '']);

		AB.getParam(row, result, 'friend_bounty', /Друзья[\s\S]*?<div[^>]+col[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(row, result, 'friend_count', /Друзья(?:[\s\S]*?<div[^>]+col[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	    
		AB.getParam(row, result, 'team_bounty', /Команда[\s\S]*?<div[^>]+col[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(row, result, 'team_count', /Команда(?:[\s\S]*?<div[^>]+col[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	    
		AB.getParam(row, result, 'partner_bounty', /Партнеры[\s\S]*?<div[^>]+col[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(row, result, 'partner_count', /Партнеры(?:[\s\S]*?<div[^>]+col[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

		AB.getParam(row, result, 'internetshop_bounty', /Интернет-магазин[\s\S]*?<div[^>]+col[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(row, result, 'internetshop_count', /Интернет-магазин(?:[\s\S]*?<div[^>]+col[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

		AB.getParam(row, result, 'shop_bounty', /Розничные[\s\S]*?<div[^>]+col[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(row, result, 'shop_count', /Розничные(?:[\s\S]*?<div[^>]+col[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	html = AnyBalance.requestGet(baseurl + 'private/orders/web', g_headers);
	AB.getParam(html, result, 'purchase', /Подтверждённые:([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'purchase_wait', /В ожидании:([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
