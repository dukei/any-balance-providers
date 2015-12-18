/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.myenergy.dn.ua/ru/customer/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl+'login', {
		login: prefs.login,
		passwd: prefs.password,
		loginButton: 'Войти'
	}, addHeaders({Referer: baseurl+'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="form_description alert alert-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте, пожалуйста, правильность Вашего логина\/пароля./i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var json = getJson(AnyBalance.requestGet(baseurl+'get-billing-info?_='+ new Date().getTime(), addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	})));

	if(!json.data)
		throw new AnyBalance.Error("Не удалось получить json с ответом, сайт изменен?");

	//Если есть ошибка подключения к РЭС
	if(!/Персональная информация/i.test(json.data.billingDataHtml)) {
		var error = getParam(json.data.billingDataHtml, null, null, /<div[^>]+class="alert alert-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error);

		throw new AnyBalance.Error("Не удалось получить данные по счету, попробуйте позднее");
	}

	getParam(json.data.billingDataHtml, result, 'balance', /Текущая задолженность(?:[^>]*>){9}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(json.data.billingDataHtml, result, 'adress', /<td[^>]*>Адрес(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(json.data.billingDataHtml, result, 'fio', /<td[^>]*>ФИО(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(json.data.billingDataHtml, result, 'lastValue', /<td[^>]*>Значение последнего измерения(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(json.data.billingDataHtml, result, 'lastDate', /<td[^>]*>Дата съёма показаний счётчика(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}