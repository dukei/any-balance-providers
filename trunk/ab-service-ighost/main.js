/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.i-ghost.biz/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);

	// var cookie = getParam(html, null, null, /document\.cookie='_ddn_intercept_2_=([^';]+)/i);
	
	// checkEmpty(cookie, 'Не удалось обойти защиту от роботов, сайт изменен?', true);
	// AnyBalance.setCookie('www.i-ghost.net', '_ddn_intercept_2_', cookie);	
	
	html = requestPostMultipart(baseurl + 'auth/login', {
		'username': prefs.login,
		'password': prefs.password,
		'submit_login': ''
	}, addHeaders({Referer: baseurl + 'auth/login'}));
	
	//html = AnyBalance.requestGet(baseurl, g_headers);
	
	if (!/logout/i.test(html)) {
		var error = sumParam(html, null, null, /color="red"(?:[^>]*>){1}([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable('referer_balance')) {
		html = AnyBalance.requestGet(baseurl + 'referer', g_headers);
		getParam(html, result, 'referer_balance', /Баланс партнерки:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(isAvailable('active_till')) {
		html = AnyBalance.requestGet(baseurl + 'settings', g_headers);
		
		sumParam(html, result, 'active_till', /<tr[^>]*class="baseorderline(?:[^>]*>){14}([^<]*)/i, replaceTagsAndSpaces, parseDateGibdd, aggregate_min);
	}
	
	AnyBalance.setResult(result);
}

/** Получает дату из строки, почему-то parseDateISO на устройстве не может распарсить вот такую дату 2013-11-23 21:16:00 */
function parseDateGibdd(str){
	//new Date(year, month, date[, hours, minutes, seconds, ms] )
	//2013-11-23 21:16:00

    var matches = /(\d{4})\D(\d{2})\D(\d{2})\D(\d{1,2}):(\d{1,2}):(\d{1,2})/.exec(str);
    if(matches){
          var date = new Date(matches[1], matches[2]-1, +matches[3], matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}