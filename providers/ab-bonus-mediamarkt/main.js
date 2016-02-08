/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	//'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.mediamarkt.ru';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
    var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    var loginForm = AB.getElement(html, /<form[^>]+?form-user-enter/i);
    
    if (!loginForm) {
        AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    var captchaCode = '';
    var captchaUrl = getParam(loginForm, null, null, /<img[^>]*?src=["']([^"']+)/i);
    if (captchaUrl) {
        if (!/^https?:/.test(captchaUrl)) {
            captchaUrl = captchaUrl.replace(/^\/?/, baseurl + '/');
        }
        var image = AnyBalance.requestGet(captchaUrl, addHeaders({Referer: baseurl}));
        image = AnyBalance.requestGet(captchaUrl, addHeaders({Referer: baseurl}));
        captchaCode = AnyBalance.retrieveCode('Введите проверочный код', image);
    }
    
    var params = AB.createFormParams(html, function (params, str, name, value) {
        if (name == 'captcha') {
            return captchaCode;
        }
        if (name == 'login') {
            return prefs.login;
        }
        if (name == 'password') {
            return prefs.password;
        }
        return value;
    });
    params.remember_me = 'false';
    delete params.q;
    delete params.url;
    
    html = AnyBalance.requestPost(baseurl + '/user/authenticate', params, addHeaders({
        Referer: baseurl,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Origin: baseurl,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }));

    var json = getJson(html);

    if (!json.success) {
        var errors = [];
        for(var k in json.errors)
            errors.push(json.errors[k]);

        var error = errors.join(', ');
        if (errors.length > 0) {
            error = error.replace(/Not Found/i, 'Неверное имя пользователя или пароль');
            throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

	var result = {success: true};
	
	getParam((json.user.name || '') + ' ' + (json.user.surname || ''), result, 'fio', null, replaceTagsAndSpaces);
	getParam(json.user.mobile_phone, result, 'phone', null, replaceTagsAndSpaces);
	
	html = AnyBalance.requestPost(baseurl + '/ajax/crm_get_user', {
		_token: params._token
	}, addHeaders({Referer: baseurl}));
	
	json = getJson(html);
	
	getParam(json.html, result, 'balance', /<a href="#" class="link border-dotted">([\s\S]*?)&nbsp;баллов<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(json.html, result, 'available', /Можно потратить: <b>([\s\S]*?)&nbsp;баллов<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(json.html, result, 'inactive', /Неактивных: <b>([\s\S]*?)&nbsp;баллов<\/b>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
