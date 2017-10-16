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
	var baseurl = 'http://partner.0kopeek.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = {
        Email: prefs.login,
        Password: prefs.password
    };
	
	html = AnyBalance.requestPost(
        baseurl + 'Account/SignIn',
		params,
        AB.addHeaders({ Referer: baseurl })
    );
	
	if (!/SignOut/i.test(html)) {
		var error = AB.getParam(html, null, null, /field-validation-error[^>]*>([^>]+>)/i, AB.replaceTagsAndSpaces);
		if (error) {
            throw new AnyBalance.Error(error, null, /e-mail или пароль/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

    AB.getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'paid', /Выплачено(?:[^>]*>){6}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'earned', /Заработано(?:[^>]*>){10}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'not_paid', /Ещё не выплачено(?:[^>]*>){6}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'fio', /Здравствуйте,(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'user_id', /Ваш ID:(?:[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	
    var table = AB.getParam(html, null, null, /table class="referral-program-table"([\s\S]*?)<\/table>/i);
    var trs = AB.sumParam(table, null, null, /<tr>\s*?<td>[\s\S]*?<\/tr>/ig);
    
	if (AnyBalance.isAvailable('fulltext')) {
        var res = [];
        for (var i = 0; i < trs.length; i++) {       
            var refer = AB.getParam(trs[i], null, null, /<td>[\s\S]*?<\/td>{1}/i, AB.replaceTagsAndSpaces);
            var people = AB.getParam(trs[i], null, null, /<td>([^>]*>){3}/i, AB.replaceTagsAndSpaces);
            var reward = AB.getParam(trs[i], null, null, /<td>([^>]*>){5}/i, AB.replaceTagsAndSpaces);
            var money = AB.getParam(trs[i], null, null, /<td>([^>]*>){7}/i, AB.replaceTagsAndSpaces);
            res.push('<b>' + refer + ':</b> ' + 'Привлечено ' + people + ' Вознаграждение ' + reward + '. Заработано ' + money);
        }
        result.fulltext = res.join('<br/>');
	}
    
	AnyBalance.setResult(result);
}