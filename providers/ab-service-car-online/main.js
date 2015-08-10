/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://panel.car-online.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var action = getParam(html, null, null, /"mainForm"[^>]*action="([^"]*)/i);
	if(!action)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
	html = AnyBalance.requestPost(baseurl + action, {
		'navigatorInfo':'Safari 537.36 (windows) ; GMT:+3',
		'screenResolution':'1600x900',
		'speedRate':'249',
		'mainContentFrame':'70',
		'eventId':'',
		'date':'',
		'login':prefs.login,
		'password':prefs.password,
		'image.x':'77',
		'image.y':'4',
    }, addHeaders({Referer: baseurl}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"except"[^>]*color=red[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var ss = getParam(html, null, null, /&ss=([^"]*)/i);
	var result = {success: true};
	
	if(isAvailable('balance')) {
		var bhtml = AnyBalance.requestGet(baseurl+'protocol2/lastBalance.jsp?lastBalance&ss=' + ss, g_headers);
		getParam(bhtml, result, 'balance', /<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(isAvailable(['power_on_board', 'power_reserv', 'last_online_min', 'ligthWayBox', 'maxSpeedBox', 'lightTimeWaysBox', 'lightTimeStandsBox'])) {
		var href = getParam(html, null, null, /getMainContentFrame\(\)\.location\s*=\s*"([^"]*\/heater\/[^"]*)/i);
		html = AnyBalance.requestGet(href, g_headers);
		
		getParam(html, result, 'power_on_board', /"Бортовое питание"[^>]*>([^<]*)V/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'power_reserv', /"Резервное питание"[^>]*>([^<]*)V/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'last_online_min', /class="timeSmall"(?:[^>]*>){2}([^<]*)мин/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'ligthWayBox', /id="ligthWayBox"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'maxSpeedBox', /id="maxSpeedBox"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		
		getParam(html, result, 'lightTimeWaysBox', /id="lightTimeWaysBox"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'lightTimeStandsBox', /id="lightTimeStandsBox"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
    AnyBalance.setResult(result);
}