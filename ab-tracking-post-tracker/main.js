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
	var baseurl = 'http://post-tracker.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ajax/userLogin.php', {
		act: 'checkLogin',
		user: prefs.login,
		password: prefs.password,
		remember:'0'
	}, addHeaders({Referer: baseurl + 'login.php'}));
	
	if (!/go\('\/my'\)/i.test(html)) {
		var error = getParam(html, null, null, /formError\('[^"']*','([^"']*)'/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'my', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	
	var tracks = sumParam(html, null, null, /<tr>[^>]*>[^>]*class="trackcode"(?:[^>]*>){34,37}\s*<\/tr>/ig);
	if(tracks && tracks.length > 0 && isAvailable('all')) {
		var totalText = '';
		for(var i = 0; i < tracks.length; i++) {
			var code = getParam(tracks[i], null, null, /class="trackcode"([^>]*>){2}/i, replaceTagsAndSpaces);
			var status = getParam(tracks[i], null, null, /class="status"([^>]*>){2}/i, replaceTagsAndSpaces);
			var date = getParam(tracks[i], null, null, /class="date"([^>]*>){2}/i, replaceTagsAndSpaces);
			
			totalText += '<b>' + code + ':</b><br>' + date + ' - ' + status + '<br><br>';
		}
		getParam(totalText, result, 'all', null, [/<br><br>$/i, '']);
	}
	
	AnyBalance.setResult(result);
}