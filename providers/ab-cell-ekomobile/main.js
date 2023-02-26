/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
};

var baseurl = 'https://lk.ekomobile.ru';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	var login = prefs.login.replace(/[^\d]+/g, '');
	
    if (/^\d+$/.test(login)){
	    checkEmpty(/^\d{10}$/.test(login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
		var formattedLogin = login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 ($1) $2-$3-$4');
	}
	
	checkEmpty(prefs.password, 'Введите пароль!');
	
	html = AnyBalance.requestGet(baseurl + '/user/login', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var form = getElement(html, /<form[^>]+"login-form"[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}
	        
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'LoginForm[msisdn]') {
			return formattedLogin;
		} else if (name == 'LoginForm[password]') {
			return prefs.password;
		}
	        
		return value;
	});
			
	var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);
			
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
    	'Content-Type': 'application/x-www-form-urlencoded',
    	'Referer': baseurl + '/user/login'
	}), g_headers);
	
	if (!/logout/i.test(html)){
		var error = getParam(html, null, null, /<p[^>]+class="help-block help-block-error[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /<div[^>]*>\s*?Баланс:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'messages', /<div[^>]*>\s*?Cообщени[й|я]:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<div[^>]*>\s*?Тариф:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<div[^>]*>\s*?Статус:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<div[^>]*>\s*?ФИО:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /<div[^>]*>\s*?Телефон:\s*?([\s\S]*?)<\/div>/i, replaceNumber);
	
	if(AnyBalance.isAvailable('bonuses')) {
	    html = AnyBalance.requestGet(baseurl + '/bonus/index', g_headers);
		getParam(html, result, 'bonuses', /Ваш баланс:\s*?<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}