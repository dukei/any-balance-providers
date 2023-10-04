/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
};

var g_level = {
	Classic: 'Базовый',
	Silver: 'Серебряный',
	Gold: 'Золотой',
	Platinum: 'Платиновый',
	undefined: ''
};

var replaceNumberCodeEx = [replaceTagsAndSpaces, /\D/g, '', /(.*)(\d\d\d)(\d\d)(\d\d)$/, ' $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Ведите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "https://leader.belavia.by/";
    
	if(AnyBalance.getData('login') == prefs.login)
	    AnyBalance.restoreCookies();
	
	var html = AnyBalance.requestGet(baseurl + 'loyalty/frame/index/', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
    if(!/logout/.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
        html = AnyBalance.requestGet(baseurl + 'loyalty/frame/login/', g_headers);
		
		var ref = AnyBalance.getLastUrl();
		
		var form = getElement(html, /<form[^>]+name="f1"[^>]*>/i);
        if(!form){
        	AnyBalance.trace(form);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if(name == 'username') {
	   			return prefs.login;
    		}else if(name == 'password'){
	    		return prefs.password;
	    	}else if(name == 'capcha_num' && /ip_error = "1"/i.test(html)){
				AnyBalance.trace('Сайт затребовал капчу');
	    		var img = AnyBalance.requestGet(baseurl + 'loyalty/securimage/securimage_show.php', addHeaders({Referer: ref}));
				return AnyBalance.retrieveCode('Пожалуйста, введите символы с картинки', img, {/*inputType: 'number', minLength: 4, maxLength: 4, */time: 180000});
	    	}
	        
	    	return value;
	    });
		
		html = AnyBalance.requestPost(baseurl + 'loyalty/frame/login/', params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': ref}));
		
		if(!/logout/.test(html)){
		    var error = getElement(html, /<div[^>]+bs-callout-danger[^>]*>/i, replaceTagsAndSpaces);
		    if(error)
			    throw new AnyBalance.Error(error, null, /логин|парол|код/i.test(error));

		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		html = AnyBalance.requestGet(baseurl + 'loyalty/frame/index/', g_headers);
        
		AnyBalance.setData('login', prefs.login);
		AnyBalance.saveCookies();
        AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<div[^>]+card-miles">([\s\S]*?)<\/div>/, replaceTagsAndSpaces,parseBalance);
	getParam(html, result, 'cardnum', /<div[^>]+card-account">([\s\S]*?)<\/div>/, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<div[^>]+card-username">([\s\S]*?)<\/div>/, replaceTagsAndSpaces);
	var curLevel = getParam(html, result, 'type', /<div[^>]+class="card([\s\S]*?)">/, replaceTagsAndSpaces);
	result.__tariff = g_level[curLevel]||curLevel;
	result.level = g_level[curLevel]||curLevel;
	
	if(AnyBalance.isAvailable('email', 'phone', 'fio')){
		html = AnyBalance.requestGet(baseurl + 'loyalty/frame/clientlist/', g_headers);
		
		getParam(html, result, 'email', /<input[^>]+"email_1"[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
		
		var cellPhoneCountry = getParam(html, null, null, /<input[^>]+"cellPhoneCountry"[\s\S]*?value="([^"]*)/, replaceTagsAndSpaces);
		var cellPhoneCountryCodeStr = new RegExp('value="' + cellPhoneCountry + '">[\\s\\S]*?\\(\([\\s\\S]*?\)\\)<', 'i');
		var cellPhoneCountrySelection = getElement(html, /<select[^>]+name="cell_phone_country[^>]*>/i);             
		var countryCode = getParam(cellPhoneCountrySelection, null, null, cellPhoneCountryCodeStr, replaceTagsAndSpaces);
		if(!countryCode)
			countryCode = '()';
		
		var phoneNum = getParam(html, null, null, /<input[^>]+"cell_phone"[\s\S]*?value="([^"]*)/i, replaceNumberCodeEx);
		if(phoneNum)
		    result.phone = '+' + countryCode + phoneNum;
		
		if(!result.fio){
		    var name = getParam(html, null, null, /<input[^>]+"name"[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
		    var surname = getParam(html, null, null, /<input[^>]+"surname"[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
		    result.fio = surname + ' ' + name;
		}
	}
	
//    getParam(html, result, 'ball', /<span class="dt">Квалификационные баллы:[\s\S]*?<div[^>]*?>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'segments', /<span class="dt">Количество сегментов:[\s\S]*?<div[^>]*?>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'forNext', /<span class="dt">До следующего уровня([\s\S]*?<div[^>]*?>[\s\S]*?)<\/div>/, replaceTagsAndSpaces);
    
	AnyBalance.setResult(result);
}