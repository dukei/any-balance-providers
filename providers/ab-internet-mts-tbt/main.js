/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lkkazan.pv.mts.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 	'Введите логин!');
	checkEmpty(prefs.password, 	'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers),
		csrf = AB.getParam(html, null, null, /<input[^>]+name="_csrf"[^>]+value="([^"]*)/i);

	html = AnyBalance.requestPost(baseurl + 'index.php?r=login'+ encodeURIComponent('/')+'login', {
		'_csrf': 			   csrf,
		'LoginForm[username]': prefs.login,
		'LoginForm[password]': prefs.password
	}, addHeaders({
		Referer: baseurl + 'index.php?r=login'+ encodeURIComponent('/')+'index',
		'Origin': baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+popup-newlk-error[^>]*>(?:[^>]*>){4}([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'account', /Номер лицевого счета[\s\S]*?<option[^>]+selected[^>]*>([^<]*)/i, 						AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'balance', /<div[^>]*>Баланс(?:[\s\S]*?<b[^>]+summ[^>]*>)([\s\S]*?)<\/b>/i,  						AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost', 	 /<div[^>]+block__tarif[^>]*>([^<]*)/i,  						   						AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['currency','balance', 'cost'], /<div[^>]*>Баланс(?:[\s\S]*?<b[^>]+summ[^>]*>)([\s\S]*?)<\/b>/i,  AB.replaceTagsAndSpaces, AB.parseCurrency);
	AB.getParam(html, result, 'fio', 	 /Персональная информация(?:[^>]*>){2}([^<]*)/i, 				   						AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}