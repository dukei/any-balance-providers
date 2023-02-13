/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var baseurl = 'https://bill.zastava.net.ua:9443';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+38 ($1) $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('zastava-net', prefs.login);

	g_savedData.restoreCookies();
	
	html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
	
		var form = AB.getElement(html, /<form[^>]+id=\'form_login\'[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
		}
	        
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'user') {
				return prefs.login;
			} else if (name == 'passwd') {
				return prefs.password;
			} else if (name == 'REFERER') {
				return baseurl + '/';
			} else if (name == 'language') {
				return 'russian';
			}
	        
			return value;
		});
			
		var action = getParam(form, null, null, /<form[\s\S]+action=\'([^\']*)/i, replaceHtmlEntities);
			
		html = AnyBalance.requestPost(action, params, addHeaders({
        	'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': baseurl,
        	'Referer': baseurl + '/'
		}), g_headers);

	    if (/alert-danger/i.test(html)) {
	    	var error = getParam(html, null, null, /<div[^>]+class="\s?alert[\s\S]*?\/h[4|3|2|1][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /password|парол/i.test(error));
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	
	    g_savedData.setCookies();
	    g_savedData.save();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс[\s\S]*?deposit\'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_pay', /Последняя оплата[\s\S]*?payment-sum\'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	var payDate = getParam(html, null, null, /Последняя оплата[\s\S]*?credit-block\'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	if(payDate)
	    getParam(payDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'last_pay_date', null, null, parseDate);
	
	var tillAlert = getParam(html, null, null, /<div[^>]+class="\s?alert[\s\S]*?<\/h[4|3|2|1][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	if(tillAlert){
		var tillDate = getParam(tillAlert, null, null, /\(([\s\S]*?)\)/i, replaceTagsAndSpaces);
		if(tillDate)
		    getParam(tillDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'till_date', null, null, parseDate);
		getParam(tillAlert, result, 'till_days', /(?:через|до)([\s\S]*?)(?:дн|мес|ч)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	getParam(html, result, 'contract', /Договор[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	var contractDate = getParam(html, null, null, /Договор Дата[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	if(contractDate)
		getParam(contractDate.replace(/(\d{4})-(\d\d)-(\d\d)(.*)/i, '$3.$2.$1'), result, 'contract_date', null, null, parseDate);
	
	getParam(html, result, 'status', /<td[^>]*>Статус[\s\S]*?[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<td[^>]*>(?:<strong>)?Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<a/i, replaceTagsAndSpaces);
	getParam(html, result, 'abon_month', /<td[^>]*>Абон\. плата за месяц[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abon_day', /<td[^>]*>Дневная а\/п[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tarif_activate', /<td[^>]*>Активация тарифного плана[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ip_address', /<td[^>]*>Статический IP[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'mac_address', /<td[^>]*>MAC[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /<td[^>]*>Мобильный телефон[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceNumber);
	getParam(html, result, 'fio', /<td[^>]*>ФИО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
