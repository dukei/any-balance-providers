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
	var baseurl = 'https://lk.zkh-kraskovo.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'response.php?chp=regform_smp&act=login', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
    
    var json = getJson(html);
    
	if (!json) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl, g_headers);

    if(prefs.accnum && !/^\d{4}$/.test(prefs.accnum))
        throw new AnyBalance.Error("Введите 4 последних цифры лицевого счета или не вводите ничего, чтобы показать информацию по первому счету");
        
	var acc = getParam(html, null, null, new RegExp('/account/(\\d{4,10}' + (prefs.accnum || '') + ')', 'i'));
	checkEmpty(acc, 'Не удалось найти ' + (prefs.accnum ? 'лицевой счет с последними цифрами ' + prefs.accnum : 'ни одного счета!'), true); 	
    
    html = AnyBalance.requestGet(baseurl + 'response.php?chp=account&act=payments_history&aid=' + acc, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
   
    json = getJson(html);
    html = AnyBalance.requestGet(baseurl + 'account/' + acc, g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Долг(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sum', /Начисления за(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}