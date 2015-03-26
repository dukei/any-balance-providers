/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://user.infolink.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://user.infolink.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	// HttpOnly cookie
	var cookie = AnyBalance.getLastResponseHeader('Set-Cookie'),
		session = getParam(cookie, null, null, /_lk_session=([^;]+)/i);
	AnyBalance.setCookie('user.infolink.ru', '_lk_session', session);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl+ 'login'})); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
	
	getParam(html, result, '__tariff', /(Интернет[^>]*>[^>]*href="\/services\/list[^>]*>[^>]*>[^>]*>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /ID абонента[^]+?(\d+)\s+<span class=['"]caret['"]>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /Баланс:[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /Бонус[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	// Посчитаем дату отключения, чтобы можно было назначить нотиф на нее
	// if(isAvailable('deadline')){
	// 	var days = getParam(html, null, null, /До отключения:\s*(\d+)\s*дн/i, null, parseBalance);
	// 	var date = new Date().getTime();
	// 	//      day in ms
	// 	date += 86400000 * days;
	// 	getParam(date, result, 'deadline', null, null, parseBalance);
	// }
	// if(isAvailable('incoming_traf')){
	// 	html = AnyBalance.requestGet(baseurl+'detailing/internet', addHeaders({Referer: baseurl+ 'index.php'}));
	// 	getParam(html, result, 'incoming_traf', /Всего:([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	// }
    AnyBalance.setResult(result);
}