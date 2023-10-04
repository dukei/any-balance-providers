
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'connection': 'keep-alive',
	'x-requested-with': 'ru.hoff.app',
	'upgrade-insecure-requests': '1',
	'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; AUM-L29 Build/HONORAUM-L29; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36',
};

var baseurl = 'https://hoff.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	if(!g_savedData)
		g_savedData = new SavedData('hoff', prefs.login);
	
	var token = g_savedData.get('token');

	g_savedData.restoreCookies();

	var html = loadProtectedPage(g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	
	html = AnyBalance.requestGet(baseurl + '/vue/me/', g_headers);

	var json = getJson(html);
	
	if (json.data.error_code === 422) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
	}else{
		AnyBalance.trace('Похоже, мы уже залогинены на имя ' + json.data.name + ' ' + json.data.last_name + ' (' + json.data.phone + ')');
	}
	
	var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'balance_active', 'card', '__tariff', 'soon_available', 'soon', 'burn_count', 'burn', 'fio', 'phone')) {
	    html = AnyBalance.requestGet(baseurl + '/vue/me/', addHeaders({
	    	'accept': 'application/json, text/plain, */*',
			'referer': baseurl + '/personal/',
	    	'x-requested-with': 'XMLHttpRequest'
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	
	    var userData = getJson(html).data;
		if (userData.card && userData.card.length > 0){
		    var firstCard = getParam(userData.card[0]);
	        var cardData = getJson(html).data.card_data[firstCard];
			getParam(cardData.balance, result, 'balance', null, null, parseBalance);
	        getParam(cardData.balance_active, result, 'balance_active', null, null, parseBalance);
	        getParam(userData.card[0], result, 'card');
	        getParam(cardData.number, result, '__tariff');
	        getParam(cardData.withdrawal_count, result, 'burn_count', null, null, parseBalance);
	        getParam(cardData.withdrawal_time, result, 'burn', null, null, parseDate);
		    if (cardData.soon_available && cardData.soon_available.length > 0){
		        getParam(cardData.soon_available[0].amount, result, 'soon_available', null, null, parseBalance);
		        getParam(cardData.soon_available[0].date, result, 'soon', null, null, parseDate);
		    }
		}
		getParam(userData.id, result, 'user_id');
	    getParam(userData.name + ' ' + userData.last_name, result, 'fio');
	    getParam(userData.phone, result, 'phone', null, replaceNumber);
	}

	AnyBalance.setResult(result);
}
	
function loginSite(prefs) {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	
	var login = prefs.login.replace(/[^\d]+/g, '');
	var formattedLogin = login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '7$1$2$3$4');
	
	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if (/iwaf/.test(html)){
       	loadProtectedPage();
    }
	
	html = AnyBalance.requestPost(baseurl + '/api/v2/auth?device_id=b8134bab89a1ad87&isAndroid=true&isGooglePayEnabled=1&isSamsungPayEnabled=0&isAvailableSberPay=0&app_version=8.62.0&location=771&xhoff=eba30b9746c26d8b72d8db53fe43edcf635372f8%3A7477', {
        'type': 'check_contact',
        'phone': formattedLogin
    }, addHeaders({
        'content-type': 'application/x-www-form-urlencoded'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.exists !== true) {
       	throw new AnyBalance.Error('Личный кабинет с указанным номером телефона не существует!');	
    }
	
	html = AnyBalance.requestPost(baseurl + '/api/v2/auth?device_id=b8134bab89a1ad87&isAndroid=true&isGooglePayEnabled=1&isSamsungPayEnabled=0&isAvailableSberPay=0&app_version=8.62.0&location=771&xhoff=4dcb0afd1b7642c95c1f05ed48652063845ee826%3A6139', {
        'type': 'confirm_phone',
		'phone': formattedLogin
    }, addHeaders({
        'content-type': 'application/x-www-form-urlencoded'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.code !== 185) {
		var error = json.message;
      	if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
      	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7' + prefs.login, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurl + '/api/v2/auth?device_id=b8134bab89a1ad87&isAndroid=true&isGooglePayEnabled=1&isSamsungPayEnabled=0&isAvailableSberPay=0&app_version=8.62.0&location=771&xhoff=22e06171291aa736e924c40333291d8bf33e9e4a%3A8250', {
        'phone': formattedLogin,
		'smscode': code
    }, addHeaders({
        'content-type': 'application/x-www-form-urlencoded'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.code) {
		var error = json.message;
      	if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
      	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var token = json.token;
	g_savedData.set('token', token);
	
	g_savedData.setCookies();
	g_savedData.save();
	return html;
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://hoff.ru/';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html) || AnyBalance.getLastStatusCode() == 401) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            provider: 'hoff',
            userAgent: g_headers["user-agent"],
            rules: [{
                url: /^data:/.toString(),
                action: 'abort',
            },{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator\/qauth_utm_v2(?:_\w+)?\.js/.toString(),
                action: 'cache',
                valid: 3600*1000
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico|svg)/.toString(),
                action: 'abort',
            }, {
                url: /hoff\.ru/i.toString(),
                action: 'request',
            }, {
		        url: /.*/.toString(),
		        action: 'abort'
            }],
            debug: AnyBalance.getPreferences().debug
        });

        const r = bro.open(url);
        try {
            bro.waitForLoad(r.page);
            html = bro.content(r.page).content;
            const cookies = bro.cookies(r.page, url);
            BrowserAPI.useCookies(cookies);
        } finally {
            bro.close(r.page);
        }

        if(/__qrator|HTTP 40[31]/.test(html)||AnyBalance.getLastStatusCode() >= 400)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");
        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}
