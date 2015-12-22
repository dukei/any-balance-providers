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
	var baseurl = 'http://kaliningrad.farfor.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'username')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

    if (params.hasOwnProperty('username') && params.hasOwnProperty('password')) {

        var postHeaders = AB.addHeaders({
            'Referer': baseurl,
            'X-Requested-With': 'With:XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded'
        });

        var res = AnyBalance.requestPost(baseurl + 'login/', params, postHeaders);
        res = AB.getJson(res);

        if (!res.success) {
            throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
        }
    }

    html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var infoHtml = getParam(html, null, null, /personalInfo[\s\S]*?<li>([\s\S]*)<\/li>/i),
	    result = {success: true};

	AB.getParam(infoHtml, result, 'full_name', /user">(.*)/, AB.replaceTagsAndSpaces);
	AB.getParam(infoHtml, result, 'phone', /phone">(.*)/, AB.replaceTagsAndSpaces);
	AB.getParam(infoHtml, result, 'bonuses', /gift">(.*)/, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(infoHtml, result, 'orders', /justify">(.*)/, AB.replaceTagsAndSpaces, AB.parseBalance);
	
	AnyBalance.setResult(result);
}