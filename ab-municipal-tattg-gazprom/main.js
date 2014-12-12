/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',

};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://tattg.gazprom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	
	var html = AnyBalance.requestGet(baseurl + 'MyAccount', g_headers);
    
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    html = AnyBalance.requestGet(baseurl + 'MyAccount/viewdata.html?ap=' + (prefs.ap || '01') + '&account=' + prefs.login, g_headers);
    
    html = AnyBalance.requestGet(baseurl + 'MyAccount/' + getDataPath(prefs.ap, prefs.login),  addHeaders({Referer: baseurl + 'MyAccount/viewdata.html?ap=' + prefs.ap + '&account=' + prefs.login}));
    
	var abonentdata = getParam(html, null, null, new RegExp('<abonentdata><account>' + prefs.login + '</account>[\\s\\S]*?</abonentdata>', 'i'))
	
	if (!abonentdata) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
    
	getParam(abonentdata, result, 'period', /<abonent><moment>([\s\S]*?)<\/moment/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(abonentdata, result, '__tariff', /<account>([\s\S]*?)<\/account>/i, replaceTagsAndSpaces, html_entity_decode);
    
    
	getParam(abonentdata, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(abonentdata, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(abonentdata, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(abonentdata, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function getDataPath(ap, account) {
    account = (account - account % 10) +'';
    var cnt = 8 - account.length;
    for(var i = 0; i < cnt; i++) {
        account = "0" + account;
    }
    return 'datastore/'+ap+'/'+account+'.xml';
}