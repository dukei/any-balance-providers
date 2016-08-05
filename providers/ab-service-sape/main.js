/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для биржи ссылок Sape.

Сайт оператора: http://www.sape.ru
Личный кабинет: https://auth.sape.ru
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var url = 'https://auth.sape.ru/login/';

    html = AnyBalance.requestGet(url, g_headers);

    var html = AnyBalance.requestPost(url, {
    	r: '',
        username:prefs.login,
        password:prefs.password,
        bindip: 0,
        submit: 'Войти'
    }, addHeaders({Referer: url}));

   	var form = getElement(html, /<form[^>]+id="reg"[^>]*>/i);
    if(form && /Пустая капча/i.test(form)){
    	AnyBalance.trace('Черт, попали на капчу...');

		var params = AB.createFormParams(html, function(params, str, name, value) {
			if (name == 'username') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;
			else if (name == 'captcha[input]'){
				var img = getParam(form, null, null, /<dd[^>]+captcha-element[^>]*>\s*<img[^>]+src="data:image[^,"]*,([^"]*)/i, replaceHtmlEntities);
				return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img);
			}
	    
			return value;
		});

		html = AnyBalance.requestPost(url, params);
    }

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="errors?"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet('https://widget.sape.ru/widget-info/?alt=json&charset=utf-8&subSysId=2', addHeaders({Referer: 'https://www.sape.ru/'}));

    var json = getJson(html);

    var result = {success: true};

    getParam(json.balance.total, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.balance.available, result, 'available', null, replaceTagsAndSpaces, parseBalance);
    getParam(prefs.login, result, '__tariff');
    
    AnyBalance.setResult(result);
}
