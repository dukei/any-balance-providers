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
    
    checkEmpty(prefs.login, 'Введите логин!');
    
    var html = AnyBalance.requestGet(baseurl + 'user/session/login.do', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var params = { password: prefs.password };
    
    if (/^[a-z0-9_\.-]+@[a-z0-9_\.-]+$/i.test(prefs.login)) {
        checkEmpty(prefs.password, 'Введите пароль!');
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
            checkEmpty(prefs.login, 'Введите логин!');
        }
    }
    
    var html = AnyBalance.requestPost(baseurl + 'user/session/login.do?continue=%2Fcatalog%2Fproduct%2Fwelcome.do&', params, addHeaders({
        Referer: baseurl + 'user/session/login.do'
    }));

    //if (!/userId/i.test(html) || /<input\s[^>]*type="password"/i.test(html)) {
    if (!/<a\s[^>]*?data-bind="[^"]*?username"[^>]*>([^<]+)/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]+class="sm-form__errors-block"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error) {
            var fatal = /Неверный логин или пароль/i.test(error);
            if (fatal) {
                if (params.cardNumber) {
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
	
	getParam(html, result, '__tariff', /smProfile__level[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /<h3>\s*Номер карты\s*<\/h3>\s*<div>\s*([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /smProfile__total-amount[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nextlevel', /Совершите покупки еще на([^<]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable('all')) {
		var table = getParam(html, null, null, /<table[^>]*sm-profile__bonustable[^>]*>(?:[\s\S](?!<\/table>))[\s\S]*?<\/table>/i);
		if(table) {
			var string = '';
			var array = sumParam(table, null, null, /<tr>\s*<td[^>]*>\s*[\s\S]*?<\/tr>/ig, replaceTagsAndSpaces);
			for(var i = 0; i < array.length; i++) {
				var current = getParam(array[i], null, null, null, [/(\d{4})$/i, '$1\n', /(\d{2})-(\d{2})-(\d{4})/, '$1/$2/$3']);
				string += current;
			}
			getParam(string, result, 'all');
		}
	}

    AnyBalance.setResult(result);
}

function getDataByCardNum(baseurl, prefs) {
    var html = AnyBalance.requestGet(baseurl + 'user/clubpro/state.do', g_headers);
    var capdata = AnyBalance.requestGet(baseurl + 'newCaptcha.do', addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    var capJson = AB.getJson(capdata);
    var image = AnyBalance.requestGet(baseurl + 'captcha.do?captchaKey=' + capJson.captchaKey, g_headers);
    var code = AnyBalance.retrieveCode('Введите проверочный код', image);
    
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
    AB.getParam(html, result, 'balance', /бонусов[^<]*<span[^>]*>([^<]+)/, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, '__tariff', /<span[^>]*?bonusdetails-level[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}