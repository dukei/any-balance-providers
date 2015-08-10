/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
};

function getPacket(html, name, result, counter){
    //Регулярное выражение для получения строки таблицы с пакетом с именем name
    var re = new RegExp('(<!-- \\*\\*\\*ccArray(?:[\\s\\S](?!</tr))*?' + name + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(tr){
        //Нашли пакет
        getParam(tr, result, counter, /<td[^>]+class="?vtitle[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, counter + '_price', /\[b_price\] => (.*)/, null, parseBalance);
        getParam(tr, result, counter + '_till', /\[ActiveTill\] => (.*)/, null, parseDateISO);
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://billing.zargacum.net/';
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var logonTries = 5;
	var cookie = getParam(html, null, null, /document\.cookie='_ddn_intercept_2_=([^';]+)/i);
	while(cookie && logonTries > 0) {
		logonTries--;
		AnyBalance.setCookie('www.billing.zargacum.net', '_ddn_intercept_2_', cookie);
		//AnyBalance.setCookie('www.zargacum.net', 'max-age', '604800');
		AnyBalance.setCookie('billing.zargacum.net', '_ddn_intercept_2_', cookie);
		//AnyBalance.setCookie('zargacum.net', 'max-age', '604800');		
		html = AnyBalance.requestGet(baseurl + 'login', addHeaders({
			'Referer': 'https://billing.zargacum.net/login',
			'Cache-Control': 'max-age=0',
		}));
		cookie = getParam(html, null, null, /document\.cookie='_ddn_intercept_2_=([^';]+)/i);
	}
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		enter_login: prefs.login,
		enter_pwd: prefs.password,
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if(!/\/quit\//i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }
	
    html = AnyBalance.requestGet('http://billing.zargacum.net/cabinet/', g_headers);
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс:([\S\s]*?)[\(\|<]/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Тип учетки([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'bonus', /Бонус\s*<[^>]*>\s*:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    //Обязательно надо экранировать служебные символы в названии пакета, потому что оно вставляется в регулярное выражение
    getPacket(html, '.', result, 'packet');

    AnyBalance.setResult(result);
}
