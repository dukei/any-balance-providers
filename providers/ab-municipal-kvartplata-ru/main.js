
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

function normLogin(login) {
    var m = /^(?:\+7|8)?(\d{3})(\d{3})(\d{4})$/.exec(login);
    return m ? '+7 (' + m[1] + ') ' + m[2] + '-' + m[3] : null;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://pay.kvartplata.ru';
	AnyBalance.setDefaultCharset('utf-8');
    
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
    
    var login = normLogin(prefs.login);
    checkEmpty(login, 'Введите корректный логин!');

	var html = AnyBalance.requestGet(baseurl + '/pk/login.action', g_headers);

	if (!html || AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    var form = AB.getElement(html, /<form[^>]+?loginForm/i);

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'userName') {
			return login;
		} else if (name == 'userPass') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + '/pk/doLogin!enter.action', params, AB.addHeaders({
		Referer: baseurl + '/pk/login.action'
	}));

	if (!/logout.action/i.test(html)) {
        var ulErr = AB.getElement(html, /<ul[^>]+?errorMessage/i);
        var error = AB.getElement(ulErr, /<li/i, AB.replaceTagsAndSpaces);
    
		if (error) {
			throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    

	var result = {
		success: true
	};
    
    AB.getParam(login, result, 'user');
    
    if (AnyBalance.isAvailable('balance')) {
        var dataForm = AB.getElement(html, /<form[^>]+?myServices\.action/i);
        //var table = AB.getElement(dataForm, /<table[^>]+?grid/i);
        var sums = aggregate_sum(AB.getElements(dataForm, /<td[^>]+?rec-sum/ig, AB.replaceTagsAndSpaces, AB.parseBalance));
        AB.getParam(sums, result, 'balance');
    }
    
	AnyBalance.setResult(result);
}
