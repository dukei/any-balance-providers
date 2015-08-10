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
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите лицевой счет!');
	
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
	
	AnyBalance.trace(abonentdata);
	
	var result = {success: true};
    
	getParam(html, result, 'period', /<abonent>\s*<moment>([\s\S]*?)<\/moment>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(abonentdata, result, '__tariff', /<account>([\s\S]*?)<\/account>/i, replaceTagsAndSpaces, html_entity_decode);
	
    var gasp = getParam(abonentdata, null, null, /<gasp>([\s\S]*?)<\/gasp>/i, replaceTagsAndSpaces, html_entity_decode);
    var dat_gasp = getParam(abonentdata, null, null, /<dat_gasp>([\s\S]*?)<\/dat_gasp>/i, replaceTagsAndSpaces, html_entity_decode);
    
	if(gasp && dat_gasp) 
		result.gasp = gasp + ' на дату ' + dat_gasp;
	
	// ГАЗ
    getParam(abonentdata, result, 'barcode_gas', /газоснабжение(?:[^>]*>){6,14}<barcode>(\d{10,})/i, replaceTagsAndSpaces, html_entity_decode);    
	getParam(abonentdata, result, 'begsaldo_gas', /газоснабжение(?:[^>]*>){1,14}<begsaldo>([\s\S]*?)<\/begsaldo>/i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, 'charged_gas', /газоснабжение(?:[^>]*>){1,14}<charged>([\s\S]*?)<\/charged>/i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, 'paid_gas', /газоснабжение(?:[^>]*>){1,14}<paid>([\s\S]*?)<\/paid>/i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, 'endsaldo_gas', /газоснабжение(?:[^>]*>){1,14}<endsaldo>([\s\S]*?)<\/endsaldo>/i, replaceTagsAndSpaces, parseBalance);    
	// Техобслуживание
	getParam(abonentdata, result, 'barcode_tech', /техобслуживание(?:[^>]*>){6,14}<barcode>(\d{10,})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(abonentdata, result, 'begsaldo_tech', /техобслуживание(?:[^>]*>){1,14}<begsaldo>([\s\S]*?)<\/begsaldo>/i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, 'charged_tech', /техобслуживание(?:[^>]*>){1,14}<charged>([\s\S]*?)<\/charged>/i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, 'paid_tech', /техобслуживание(?:[^>]*>){1,14}<paid>([\s\S]*?)<\/paid>/i, replaceTagsAndSpaces, parseBalance);
	getParam(abonentdata, result, 'endsaldo_tech', /техобслуживание(?:[^>]*>){1,14}<endsaldo>([\s\S]*?)<\/endsaldo>/i, replaceTagsAndSpaces, parseBalance);
	
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