/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифе для интернет провайдера Мобил ТелеКом Плюс

Site: http://stat.satka.ru/
Личный кабинет: http://utm.xn--80aa3a0ag.xn--80asehdb/
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
		username: prefs.login,
		password: prefs.password,
		send: ''
	}, addHeaders({Referer: baseurl + 'index.php'}));

	if (!/\/logout/i.test(html)) {
		var error = sumParam(html, null, null, /<br><p[^>]*>([\s\S]*?)<\/p>/gi, replaceTagsAndSpaces, null, aggregate_join) || '';
		if (error)
			throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));
		AnyBalance.trace(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	getParam(html, result, 'login', /<td[^>]*>\s*Логин:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'main_expense', /<td[^>]*>\s*Основной лицевой счёт:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<td[^>]*>\s*Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /Кредит<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'date', /<td[^>]*>\s*Дата подключения:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<div[^>]+well[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<td[^>]*>\s*Статус интернета[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces);
	getParam(html, result, 'TP', /<th[^>]*>\s*Название тарифа[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/strong>|<\/td>)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<th[^>]*>\s*Название тарифа[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/strong>|<\/td>)/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('incoming', 'outgoing', 'local')){
		var info = AnyBalance.requestPost(baseurl + 'user/traffic', {
			startDate: getFormattedDate({offsetDay: new Date().getDate()}),
			endDate: getFormattedDate(),
			serviceType: 1,
			submit: 'Показать'
		}, g_headers);

        getParam(info, result, 'incoming', /Входящий<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /$/, 'Мб'], parseTraffic);
        getParam(info, result, 'outgoing', /Исходящий<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /$/, 'Мб'], parseTraffic);
        getParam(info, result, 'local', /Локальный<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /$/, 'Мб'], parseTraffic);
	}
       
	AnyBalance.setResult(result);
}