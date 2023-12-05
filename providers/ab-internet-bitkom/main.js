/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Origin': 'https://user.line-net.ru',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://user.line-net.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 500)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var form = getElement(html, /<form[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
	   	if(name == 'login_number') {
	   		return prefs.login;
    	}else if(name == 'login_password'){
	    	return prefs.password;
	    }
        	        
	    return value;
	});
		
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Referer': AnyBalance.getLastUrl(),
	}));
	
	if(!/logout/i.test(html)){
		var error = getParam(html, /<ul[^>]+class="messages"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущий баланс сч[её]та:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<p[^>]*>\s*?Действующий тарифный план:([\s\S]*?)\((?:[\s\S]*?)\)/i, replaceTagsAndSpaces);
	getParam(html, result, 'lic_schet', /<h1[^>]*>\s*?Состояние договора №([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Состояние договора:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
	getParam(html, result, 'tarif_desc', /<p[^>]*>\s*?Действующий тарифный план:(?:[\s\S]*?)\(([\s\S]*?)\)/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /<p[^>]*>\s*?Адрес:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
//	getParam(html, result, 'fio', /<div[^>]+lk_account__name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_desc', 'last_oper_state')){
	    var table = getElement(html, /<table[^>]+class="log">/i);
	    var hists = getElements(table, /<tr[^>]+class[^>]*>/ig);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено операций: ' + hists.length);
		    for(var i=0; i<hists.length; ++i){
	    	    var hist = hists[i];
				
				getParam(hist, result, 'last_oper_date', /<td[^>]+class="date">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		        getParam(hist, result, 'last_oper_type', /<td[^>]+class="action\d*?">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
				getParam(hist, result, 'last_oper_desc', /<td[^>]+class="text">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				getParam(hist, result, 'last_oper_sum', /<td[^>]+class="balance">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_state', /<td[^>]+class="state\d*?">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
	
	AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
