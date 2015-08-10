/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseTrafficGb(str) {
	var val = parseBalance(str);
	if (isset(val)) 
		return Math.round(val / 1024 * 100) / 100;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (prefs.type == 'new') 
		doNew(prefs);
	else 
		doOld(prefs);
}

function doNew(prefs) {
    AnyBalance.setDefaultCharset('UTF-8');
	
    var baseurl = "http://lk.iflat.ru/";
	
	html = AnyBalance.requestGet(baseurl + 'login');

	function getToken(html) {
		var token = getParam(html, null, null, /"authenticity_token"[^>]*value="([^"]+)"/i);
		checkEmpty(token, 'Не удалось найти токен авторизации, сайт изменен?', true);
		return token;
	}	
	
    html = AnyBalance.requestPost(baseurl + 'login', {
		'utf8':'✓',
		'authenticity_token':getToken(html),
		'user[login]':prefs.login,
		'user[password]':prefs.password,
		'commit':'Войти'
    });
	
	var user = getParam(html, null, null, /HupoApp\(({[\s\S]*?), \{logLevel: "info"\}\);/i);
	var userJson = getJsonEval(user);
	
	if (!/new HupoApp/i.test(html)) {
		var error = getParam(html, null, null, /"error_container"[^>]*>([^<]+)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var data = userJson.data.personal_accounts[0];
	checkEmpty(data, 'Не удалось найти пользователя, сайт изменен?', true);
	
    var result = {success: true};
	
    getParam(data.n_sum_bal+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(data.vc_account+'', result, 'licschet', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(userJson.data.servs[0].vc_name+'', result, '__tariff', null, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);	
}

function doOld(prefs) {
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "https://billing.dream-net.ru/cgi-bin/utm5/";

    html = AnyBalance.requestPost(baseurl + 'aaa5', {
        login:prefs.login,
        password:prefs.password,
        cmd:'login'
    });

    //AnyBalance.trace(html);
    if(!/cmd=logout/i.test(html)){
        var error = getParam(html, null, null, /<BR[^>]*>\s*Ошибка:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс основного счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Основной счет[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /Кредит основного счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Блокировка[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var skey = getParam(html, null, null, /skey=([0-9a-f]{32})/i);

    html = AnyBalance.requestGet(baseurl + "user5?cmd=user_services_list&skey=" + skey);
    getParam(html, result, '__tariff', /Тарифный план(?:[\S\s]*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var now = new Date();
        var begin = new Date(now.getFullYear(), now.getMonth(), 1);
        html = AnyBalance.requestGet(baseurl + "user5?s_hour=0&s_min=0&s_mday=1&s_mon=" + begin.getMonth() + "&s_year=" + begin.getFullYear() + 
                      "&e_hour=23&e_min=59&e_mday=" + now.getDate() + "&e_mon=" + now.getMonth() + "&e_year=" + now.getFullYear() + "&cmd=user_reports_traffic&skey=" + skey);

       getParam(html, result, 'trafficIn', /Входящий[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
       getParam(html, result, 'trafficOut', /Исходящий[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
    }
	
	AnyBalance.setResult(result);	
}