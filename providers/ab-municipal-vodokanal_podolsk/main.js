/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
};

var baseurl = 'https://cab.vodokanalpodolsk.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('vodokanalpodolsk', prefs.login);

	g_savedData.restoreCookies();

    var html = AnyBalance.requestGet(baseurl + '/home', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();

	    html = AnyBalance.requestGet(baseurl + '/login', g_headers);
		
		var form = getElement(html, /<form[^>]+id="email-form"[^>]*>/i);
        if(!form){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if (name == 'email') {
	   			return prefs.login;
    		} else if (name == 'password') {
	    		return prefs.password;
	    	}
	        
	    	return value;
	    });
		
	    var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);

		html = AnyBalance.requestPost(action, params, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': baseurl,
			'Referer': baseurl + '/email'
		}));
	
	    if (!/logout/i.test(html)) {
			var error = getParam(html, null, null, /<span[^>]+role="alert"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /(?:Задолженность|Переплата)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Лицевой счет:([\s\S]*?)\(/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /Лицевой счет:([\s\S]*?)\(/i, replaceTagsAndSpaces);
	getParam(html, result, 'living_area', /Лицевой счет:[\s\S]*?\(([\s\S]*?),/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lodgers', /Лицевой счет:[\s\S]*?,([\s\S]*?)\)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'address', /Лицевой счет:[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'last_pay_date', /Последняя оплата([\s\S]*?)</i, [replaceTagsAndSpaces, /(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'], parseDate);
	getParam(html, result, 'last_upd_date', /Последнее обновление([\s\S]*?)</i, [replaceTagsAndSpaces, /(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'], parseDate);
	getParam(html, result, 'tariff_sanitation', /<td>Водоотведение[\s\S]*?(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tariff_coldwater', /<td>Холодное водоснабжение[\s\S]*?(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'countervalue', /<td>Показания[\s\S]*?(?:[^>]*>){11}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'counternum', /<td>Сч[е|ё]тчик[\s\S]*?(?:[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'countertype', /<td>Сч[е|ё]тчик[\s\S]*?(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable(['phone', 'fio'])){
	    html = AnyBalance.requestGet(baseurl + '/settings/profile/view', g_headers);
	
	    getParam(html, result, 'phone', /id="phone"[\s\S]*?value="([^"]*)/i, replaceNumber);
	    getParam(html, result, 'fio', /id="name"[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	}
	
	AnyBalance.setResult(result);
}
