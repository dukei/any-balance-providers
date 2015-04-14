/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифе для интернет провайдера Мобил ТелеКом Плюс

Site: http://stat.satka.ru/
Личный кабинет: http://utm.сатка.онлайн/index.php
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
    AnyBalance.setDefaultCharset('utf-8'); 
    var baseurl = 'http://utm.xn--80aa3a0ag.xn--80asehdb/';
    
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'index.php'}));

	if (!/\/\?module=zz_logout/i.test(html)) {
		var error = sumParam(html, null, null, /<br><p[^>]*>([\s\S]*?)<\/p>/gi, replaceTagsAndSpaces, html_entity_decode, aggregate_join) || '';
		if (error)
			throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));
		AnyBalance.trace(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	getParam(html, result, 'ID', /ID<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'login', /Логин<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'main_expense', /Основной лицевой счет<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /Кредит<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'nds', /НДС<\/td>\s*<td[^>]*>([\s\S]*?)\%<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'date', /Дата создания<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Состояние интернета<\/td>\s*<td[^>]*>([\s\S]*?)<A[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl + '/?module=40_tariffs', g_headers);
	getParam(html, result, 'TP', /Изменить<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.setResult(result);
}