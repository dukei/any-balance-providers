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

var g_cardTypes = [
    {},
    { auth: 'COMMON', check: '300', name: 'Обычный' },
    { auth: 'SILVER', check: '301', name: 'Серебряный' },
    { auth: 'GOLD', check: '302', name: 'Золотой' }
];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.sportmaster.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');

    var html = AnyBalance.requestGet(baseurl + 'user/session/login.do', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var form = getElement(html, /<form[^>]+loginForm/i);
    if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
    
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'email') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

    if (/^[a-z0-9_\.-]+@[a-z0-9_\.-]+$/i.test(prefs.login)) {
        AB.checkEmpty(prefs.password, 'Введите пароль!');
        params.option = 'email';
        params.email = prefs.login;
    } else {
        if (/^\d{5,15}$/.test(prefs.login)) {
            if (prefs.cardType == '0') {
                throw new AnyBalance.Error('Укажите статус карты!');
            }
            if (!prefs.password) {
                getDataByCardNum(baseurl, prefs);
                return;
            }
            params.option = 'cardNumber';
            params.cardType = g_cardTypes[prefs.cardType].auth;
            params.cardNumber = prefs.login;
        } else {
    		throw new AnyBalance.Error('В качестве логина надо ввести либо е-мейл, либо номер карты, содержащий только цифры. Убедитесь, что в логине нет лишних символов, например, пробелов.', null, true);
        }
    }

    var html = AnyBalance.requestPost(baseurl + 'user/session/login.do?continue=%2F', params, addHeaders({
        Referer: baseurl + 'user/session/login.do'
    }));

    //if (!/userId/i.test(html) || /<input\s[^>]*type="password"/i.test(html)) {
    if (!/<a\s[^>]*?data-bind="[^"]*?username"[^>]*>([^<]+)/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div[^>]+sm-form__errors-block[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
        if (!error)
        	error = AB.getParam(html, null, null, /content:\s*'<div[^>]+clr-red[^>]*>([\s\S]*?)'/i, AB.replaceTagsAndSpaces);
        if (error) {
            var fatal = /Неверный логин или пароль|пароль устарел/i.test(error);
            if (fatal) {
                if (params.cardNumber) {
        			AnyBalance.trace('ОШИБКА: ' + error);
        			AnyBalance.trace('Пробуем получить данные только по номеру карты');
                    getDataByCardNum(baseurl, prefs);
                } else {
                    throw new AnyBalance.Error(error, false, true);
                }
                return;
            } else {
                throw new AnyBalance.Error(error);
            }
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'user/profile/bonus.do', g_headers);

    var result = {success: true};

    AB.getParam(html, result, '__tariff',  /smProfile__level[^>]*>([^<]*)/i,                 AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'cardnum',   /<h3>\s*Номер карты\s*<\/h3>\s*<div>\s*([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'balance',   /smProfile__total-amount[^>]*>([^<]*)/i,          AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'nextlevel', /Совершите покупки еще на([^<]*?)руб/i,           AB.replaceTagsAndSpaces, AB.parseBalance);

    var bonuses = getParam(html, /bonuses:\s*(\[\{[\s\S]*?\}\])/, replaceHtmlEntities, getJson);
    var tillbonus = (bonuses || []).reduce(function(b, prev) { if(!prev || b.dateEnd < prev.dateEnd) prev = b; return prev }, 0);
    getParam(tillbonus && tillbonus.dateEnd, result, 'till');
    getParam(tillbonus && tillbonus.amount, result, 'sumtill');
	
	if(isAvailable('all')) {
		var table = AB.getParam(html, null, null, /<table[^>]*sm-profile__bonustable[^>]*>(?:[\s\S](?!<\/table>))[\s\S]*?<\/table>/i);
		if(table) {
			var string = '';
			var array = AB.sumParam(table, null, null, /<tr>\s*<td[^>]*>\s*[\s\S]*?<\/tr>/ig, replaceTagsAndSpaces);
			for(var i = 0; i < array.length; i++) {
				var current = AB.getParam(array[i], null, null, null, [/(\d{4})$/i, '$1\n', /(\d{2})-(\d{2})-(\d{4})/, '$1/$2/$3']);
				string += current;
			}
			getParam(string, result, 'all');
		}
	}

    AnyBalance.setResult(result);
}

function getDataByCardNum(baseurl, prefs) {
    var html    = AnyBalance.requestGet(baseurl + 'user/clubpro/state.do', g_headers);
    var capdata = AnyBalance.requestGet(baseurl + 'newCaptcha.do', addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    var capJson = AB.getJson(capdata);
    var image   = AnyBalance.requestGet(baseurl + 'captcha.do?captchaKey=' + capJson.captchaKey, g_headers);
    var code    = AnyBalance.retrieveCode('Введите проверочный код', image);
    
    var url = baseurl + 'user/clubpro/event_check_by_cardnumber.do?cardType=' + 
                g_cardTypes[prefs.cardType].check +
                '&cardNumber=' + prefs.login +
                '&captchaKey=' + encodeURIComponent(capJson.captchaKey) +
                '&captchaText=' + code;
    
    html = AnyBalance.requestGet(url, addHeaders({
        'X-Requested-With': 'XMLHttpRequest',
        Referer: baseurl + 'user/session/login.do'
    }));
    
    if (/<h1[^>]*>Ошибка<\/h1[^>]*>/i.test(html)) {
        var error = AB.getElement(html, /<p/i, AB.replaceTagsAndSpaces);
        AnyBalance.trace(html);
        throw new AnyBalance.Error(error || 'Ошибка получения данных.', false, /номер карты не найден/i.test(error));
    }
    
    if (/captchaText[\s\S]{1,20}Код введен неверно/i.test(html)) {
        throw new AnyBalance.Error('Код введен неверно.');
    }
    
    var result = {success: true};
    AB.getParam(prefs.login, result, 'cardnum');
    AB.getParam(html, result, 'balance',  /бонусов[^<]*<span[^>]*>([^<]+)/,                AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'till',     /Дата сгорания(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, '__tariff', /<span[^>]*?bonusdetails-level[^>]*>([^<]+)/i,   AB.replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}