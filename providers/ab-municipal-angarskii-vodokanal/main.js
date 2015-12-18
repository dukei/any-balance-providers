/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://lk.ang-vodokanal.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	//16.00
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'avtoris/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var xhtml = AnyBalance.requestPost(baseurl+'ajax/ajax1/', {
		'action': 'avtoris',
		name: prefs.login,
		pasw: prefs.password
	}, addHeaders({
		Referer: baseurl+'avtoris/',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	if (!/yes/i.test(xhtml))
			throw new AnyBalance.Error('Пользователь с такими данными не найден', null, true);

	var result = {success: true};
	html = AnyBalance.requestGet(baseurl+'scet/', g_headers);
	getParam(html, result, 'balance', /<span[^>]*>Состояние счёта(?:[^>]*>){7}([\s\S]*?)<\/li/i, [replaceTagsAndSpaces, /задолженность:/i, '-'], parseBalance);
	getParam(html, result, 'acc_num', /Ваш номер лицевого счета:([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'lastDate', /<span[^>]*>Состояние счёта(?:[\s\S]*?<li[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}