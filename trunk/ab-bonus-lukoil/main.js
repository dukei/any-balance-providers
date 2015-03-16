/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.licard.com/';
    var baseurlFizik = 'https://club-lukoil.ru/';
	
    AnyBalance.setDefaultCharset('utf-8');
    
	var result = {success: true};
	
    if (prefs.type == 'likard') {
		var html = AnyBalance.requestGet(baseurl + 'ru/login', g_headers);
		
		try {
			html = AnyBalance.requestPost(baseurl + 'ru/login', [
				['login', prefs.login],
				['pass' , prefs.password],
				['submit', 'Войти'],
			], addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		} catch(e) {
			html = AnyBalance.requestGet(baseurl + 'ru', addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		}
        //получим id пользователя
        var usedId = /\/([\s\S]{1,15})\/client/i.exec(html);
        if (!usedId)
			throw new AnyBalance.Error('Не удалось найти пользователя, проверьте логин и пароль');
		
        getParam(prefs.login, result, 'cardnum');
        getParam(html, result, 'balance', /Баланс[\s\S]*?>[\s\S]*?>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'last_payment', /Последний платёж[\s\S]*?payments">([\s\S]*?)<\/a/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'name', /class="value user-name">\s*<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
    } else {
        var html = AnyBalance.requestGet(baseurlFizik + 'login', g_headers);
		
        html = AnyBalance.requestPost(baseurlFizik + 'login', {
            username: prefs.login,
            password: prefs.password,
        }, g_headers);
		
        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, [/<p[^>]+class="err"[^>]*>([\s\S]*?)<\/p>/i, /class="error">([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
            if (error)
				throw new AnyBalance.Error(error);
			
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
        getParam(html, result, 'balance', /Количество&nbsp;баллов(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cardnum', /cardNumber"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'name', /"user-FIO"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'phonenumber', /"userPhoneTableCell"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
        //getParam(html, result, '__tariff', /<li><span>Ваш статус в Программе:<\/span>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, null);
        //getParam(html, result, 'region', /Регион Программы:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    }
	
    AnyBalance.setResult(result);
}