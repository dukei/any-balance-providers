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
	var baseurl = 'http://gpnbonus.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	checkEmpty(prefs.surname, 'Введите фамилию!');
	checkEmpty(/^(\d{2}).(\d{2}).(\d{4})$/i.test(prefs.date_of_birth), 'Введите дату рождения в формате 31.12.2014!');
    var date = /^(\d{2}).(\d{2}).(\d{4})$/i.exec(prefs.date_of_birth);
    
	var html = AnyBalance.requestGet(baseurl + 'users', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
    html = AnyBalance.requestPost(baseurl + '_run.php?xoadCall=true', 'a:4:{s:6:"source";s:57:"O:9:"front_api":1:{s:6:"result";a:1:{s:7:"captcha";b:1;}}";s:9:"className";s:9:"front_api";s:6:"method";s:6:"xroute";s:9:"arguments";s:242:"a:2:{i:0;a:1:{s:6:"fusers";a:1:{s:11:"getInfoUser";a:5:{s:14:"CardSWNumberID";s:16:"' + prefs.login + '";s:9:"SurNameID";s:14:"' + prefs.surname + '";s:12:"DayOfBirthID";s:2:"' + date[1] + '";s:14:"MonthOfBirthID";s:2:"' + date[2] + '";s:13:"YearOfBirthID";s:4:"' + date[3] + '";}}}i:1;N;}";}', addHeaders({Referer: baseurl + '_run.php?xoadCall=true'}));
	
	if (!/"vxod":"true"/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'users/~showinfousers', g_headers);
	
	var result = {success: true};
	
    function parseBalanceMy(val) {
        return (parseBalance(val) /100).toFixed(0);
    };
    
	getParam(html, result, 'balance', /Доступно к использованию(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceMy);
	getParam(html, result, 'sum_needed', /class="right"(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceMy);
	getParam(html, result, 'fio', /class="name"(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, result, '__tariff', /№\sкарты([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус карты(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'prev_month', /Сумма покупок за предыдущий месяц(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cur_month', /Сумма покупок за текущий месяц(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}