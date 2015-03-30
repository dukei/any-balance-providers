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

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.mnogo.ru/';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/(\d{2})\D(\d{2})\D(\d{4})/.test(prefs.birthday), 'День рождения должен быть в формате DD-MM-YYYY, например, 28-04-1980');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var matches = /(\d{2})\D(\d{2})\D(\d{4})/.exec(prefs.birthday);
	if(!matches)
		throw new AnyBalance.Error('День рождения должен быть в формате DD-MM-YYYY, например, 28-04-1980');

	var dt = new Date(matches[2]+'/'+matches[1]+'/'+matches[3]);
	if(isNaN(dt))
		throw new AnyBalance.Error('Неверная дата ' + prefs.birthday);
	
	var html = AnyBalance.requestPost(baseurl + 'enterljs.html', {
		UserLogin: prefs.login,
		'UserBirth[d]': dt.getDate(),
		'UserBirth[m]': dt.getMonth()+1,
		'UserBirth[y]': dt.getFullYear()
	}, g_headers);
	
	if (!/^OK$/i.test(html)) {
		var error = html;
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'index.html');
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /top_detals-bonus[^>]*>\s*<span>([^>]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'username', /class="top_detals-info[^>]*>([^<,]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /class="number_card[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);	
	
	AnyBalance.setResult(result);
}

