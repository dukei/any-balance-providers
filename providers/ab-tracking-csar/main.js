/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию из системы Цезарь-Сателлит

Сайт оператора: http://csat.ru
Личный кабинет: http://cp.csat.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk.csat.ru";

	var html = AnyBalance.requestGet(baseurl + '/lk/auth/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+auth_form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var entertype = /@/.test(prefs.login) ? 'email' : /^\d{3,6}$/.test(prefs.login) ? 'pin' : 'phone';
	AnyBalance.trace(prefs.login + ' определен как ' + entertype);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'AUTH_TYPE') {
			return entertype;
		} else if (name == 'USER_LOGIN_PHONE') {
			return entertype == 'phone' ? prefs.login : value;
		} else if (name == 'USER_LOGIN_EMAIL') {
			return entertype == 'email' ? prefs.login : value;
		} else if (name == 'USER_LOGIN_PIN') {
			return entertype == 'pin' ? prefs.login : value;
		} else if (name == 'USER_PASSWORD') {
			return prefs.password;
		}

		return value;
	});

    var html = AnyBalance.requestPost(baseurl + '/lk/auth/', params, addHeaders({Referer: baseurl + '/lk/auth/'}));

    if(!/Logout/i.test(html)){
        var error = getElement(html, /<[^>]*text-danger/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<div[^>]+balance[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<li[^>]+owner[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);

    var divs = getElements(html, /<div[^>]+pinListElementOfPage/ig);
    for(var i=0; i<divs.length; ++i){
    	var div = divs[i];
    	var plate = getElement(div, /<h2/i, replaceTagsAndSpaces);
   		var pin = getParam(div, /data-pin-id="([^"]*)/i, replaceHtmlEntities);
    	AnyBalance.trace('Найден номер ' + plate + ', PIN: ' + pin);
    	if(!prefs.plate || plate.indexOf(prefs.plate) >= 0 || pin.indexOf(prefs.plate) >= 0){
    		getParam(plate, result, 'plate');
    		getParam(div, result, 'status', /Статус:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
    		getParam(pin, result, 'pin');

    		if(pin){
    			html = AnyBalance.requestPost(baseurl + '/lk/ajax/service.php', {
    				ajaxPin:	'Y',
					typeAjaxQuery:	'getInformation',
					pinID:	pin
    			}, addHeaders({Referer: baseurl + '/lk/services/'}));

    			var json = getJson(html);
    			getParam(json.tariff, result, '__tariff', /[\s\S]*?<\/td>/i, replaceTagsAndSpaces);
    		}

    		break;
    	}
    }

    if(i>= divs.length)
    	throw new AnyBalance.Error(prefs.plate ? 'Не удалось найти объекта с номером, содержащим ' + prefs.plate : 'Не удалось найти ни одного объекта');

    AnyBalance.setResult(result);
}
