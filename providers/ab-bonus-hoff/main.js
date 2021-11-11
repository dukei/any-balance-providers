
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'max-age=0',
	'Connection': 'keep-alive',
	'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var baseurl = 'https://hoff.ru/';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	

	
	if(!g_savedData)
		g_savedData = new SavedData('hoff', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var fwl = Icewood(baseurl);
	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(fwl.isProtected(html))
	    html = fwl.executeScript(html);
	
	html = AnyBalance.requestGet(baseurl + 'vue/me/', g_headers);

	
	var json = getJson(html);
	AnyBalance.trace(html);
	
	if (json.data.error_code === 422) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
		}else{
		AnyBalance.trace('Похоже, мы уже залогинены на имя ' + json.data.name + ' ' + json.data.last_name + ' (' + prefs.login + ')');
	}
	
	var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'balance_active', 'card', '__tariff', 'soon_available', 'burn_count', 'burn', 'fio', 'phone')) {
	    html = AnyBalance.requestGet(baseurl + 'vue/me/', addHeaders({
	    	'accept': 'application/json, text/plain, */*',
	    	'x-requested-with': 'XMLHttpRequest',
	    	Referer: 'https://hoff.ru/personal/'
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	
	    var userData = getJson(html).data;
	    var firstCard = getParam(userData.card[0]);
	    var cardData = getJson(html).data.card_data[firstCard];
	
	    getParam(cardData.balance, result, 'balance', null, null, parseBalance);
	    getParam(cardData.balance_active, result, 'balance_active', null, null, parseBalance);
	    getParam(cardData.number, result, 'card');
	    getParam(cardData.number, result, '__tariff');
	    getParam(cardData.soon_available, result, 'soon_available', null, null, parseBalance);
	    getParam(cardData.withdrawal_count, result, 'burn_count', null, null, parseBalance);
	    getParam(cardData.withdrawal_time, result, 'burn', null, null, parseDate);
	    getParam(userData.name + ' ' + userData.last_name, result, 'fio');
	    getParam(userData.phone, result, 'phone');
	}

	AnyBalance.setResult(result);
}
	
function loginSite(prefs) {
    var prefs = AnyBalance.getPreferences();
	
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
		Referer: baseurl + 'iwaf-challenge',
	    }));
	if(fwl.isProtected(html))
	    html = fwl.executeScript(html);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
	    throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

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

	AnyBalance.trace(html);
	
	g_savedData.setCookies();
	g_savedData.save();
	return html;
//POST /sso/oauth2/revoke?token=7b8a3d20-6e98-4b23-ad1c-e441046ffadd&token_type_hint=access_token
/*
	var json = getJson(html);

	if (!json.RESULT) {
		var error = json.MESSAGE && json.MESSAGE.TEXT;
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
*/
}
