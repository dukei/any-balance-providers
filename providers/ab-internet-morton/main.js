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
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
    var aut_token = AB.getParam(html, null, null, /name="authenticity_token"\s*type="hidden"\s*value="([^]*?)"/i);
    
	html = AnyBalance.requestPost(baseurl + 'login', {
        'utf8': '✓',
        'authenticity_token': aut_token,
        'user[login]': prefs.login,
        'user[password]': prefs.password,
        'commit': 'Войти'
	}, AB.addHeaders({Referer: baseurl + 'login'}));
    
    var json = AB.getParam(html, null, null, /new\sHupoApp\(([^]*?}),\s*\{logLevel/i);

    json = AB.getJsonEval(json);
    
	if (!json) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="error_container"[^>]*>([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	var result = {success: true},
        persAccount;
    
    if (json.data && json.data.personal_accounts && json.data.personal_accounts.length) {
        persAccount = json.data.personal_accounts[0];
    } else {
        AnyBalance.trace('Не найдено информации о личных данных.');
    }

    AB.getParam(persAccount.n_sum_bal, result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.data.person.vc_name + '', result, 'fio', null, AB.replaceTagsAndSpaces);
    AB.getParam(persAccount.vc_account, result, 'acc', null, AB.replaceTagsAndSpaces);
    AB.getParam(persAccount.d_accounting_begin, result, 'beg_period', null, AB.replaceTagsAndSpaces, AB.parseDateISO);
    AB.getParam(persAccount.d_accounting_end, result, 'end_period', null, AB.replaceTagsAndSpaces, AB.parseDateISO);
    AB.getParam(json.data.servs[0].n_good_sum, result, 'pay_sum', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.data.servs[0].vc_name, result, '__tariff', null, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}