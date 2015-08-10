/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	// 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',    
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'https://lk.mtel.ru'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.mtel.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
    var aut_token = getParam(html, null, null, /name="authenticity_token"\s*type="hidden"\s*value="([^]*?)"/i);
    
	html = AnyBalance.requestPost(baseurl + 'login', {
        'utf8': '✓',
        'authenticity_token': aut_token,
        'user[login]': prefs.login,
        'user[password]': prefs.password,
        'commit': 'Войти'
	}, addHeaders({Referer: baseurl + 'login'}));
    
    var json = getParam(html, null, null, /new\sHupoApp\(([^]*?}),\s*{logLevel/i);    

    json = getJsonEval(json);
    
	if (!json) {
		var error = getParam(html, null, null, /<div[^>]+class="error_container"[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	var result = {success: true};
    
    if (json.data.personal_accounts && json.data.personal_accounts.length) {
        var pers_acc = json.data.personal_accounts[0];
    } else if (json.data.personal_account) {
        var pers_acc = json.data.personal_account;
    } else {
        AnyBalance.trace('Не найдено информации о личных данных.');
    }
	
	getParam(pers_acc.n_sum_bal, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(pers_acc.vc_name + '', result, 'fio', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(pers_acc.vc_account, result, 'acc', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(pers_acc.d_accounting_begin, result, 'beg_period', null, replaceTagsAndSpaces, parseDateISO);
	getParam(pers_acc.d_accounting_end, result, 'end_period', null, replaceTagsAndSpaces, parseDateISO);
	getParam(json.data.servs[0].n_good_sum, result, 'pay_sum', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.data.servs[0].vc_name, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}