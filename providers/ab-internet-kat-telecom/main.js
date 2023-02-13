/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
};

var baseurl = 'https://cabinet.kat-telecom.ru';
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseTrafficGb(str){
    var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    return parseFloat((val/1024).toFixed(2));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + '/cabinet/welcome/', g_headers);
	
	var form = AB.getElement(html, /<form role="form"[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}
	        
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'LOGIN') {
			return prefs.login;
		} else if (name == 'PASSWD') {
			return prefs.password;
		}
	        
		return value;
	});
			
	var action = getParam(form, null, null, /<form[\s\S]*?action=\"([\s\S]*?)\"/i, replaceHtmlEntities);
			
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
       	'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
       	'Referer': baseurl + '/cabinet/welcome/'
	}), g_headers);
    
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="alert alert-danger"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'to_pay', /Рекомендуемый платеж[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract', /Договор[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'ipAddress', /IP-адрес:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'client', /Клиент[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Ваш тариф[\s\S]*?tarif-current"[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces);
	getParam(html, result, 'tarif', /Ваш тариф[\s\S]*?tarif-current"[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces);
	getParam(html, result, 'login', /Логин[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	var href = getParam(html, null, null, /<a[^>]+href="https:\/\/cabinet\.kat-telecom\.ru([\s\S]*?)">Лицевой сч[е|ё]т<\/a>/i);
	
    if(href){
		html = AnyBalance.requestGet(baseurl + href, g_headers);
        
		if(!result.balance)
            getParam(html, result, 'balance', /<td[^>]*>Баланс([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'account', /<td[^>]*>Номер сч[е|ё]та([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces);
		if(!result.contract)
            getParam(html, result, 'contract', /<td[^>]*>Договор([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces);
		getParam(html, result, 'activate_date', /<td[^>]*>Дата активации([\s\S]*?)<\/tr>/i, [replaceTagsAndSpaces, /(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'], parseDate);
	    if(!result.status)
            getParam(html, result, 'status', /<td[^>]*>Статус([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces);
		if(!result.__tariff)
            getParam(html, result, '__tariff', /<td[^>]*>Тариф([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces);
	    if(!result.tarif)
            getParam(html, result, 'tarif', /<td[^>]*>Тариф([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces);
	}

	AnyBalance.setResult(result);
}
