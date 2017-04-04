/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = [
	['Host', 'www.ozon.ru'],
	['Connection', 'keep-alive'],
	['Pragma', 'no-cache'],
	['Cache-Control', 'no-cache'],
	['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'],
	['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'],
	['Accept-Encoding', 'gzip, deflate, sdch, br'],
	['Accept-Language', 'ru,en-US;q=0.8,en;q=0.6'],
	['Origin', 'https://www.ozon.ru'],
	['Upgrade-Insecure-Requests', '1']
];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://www.ozon.ru/";

//    AnyBalance.setOptions({cookiePolicy: 'netscape'});

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var incapsule = Incapsule(baseurl + 'context/login/');
	var html = AnyBalance.requestGet(baseurl + 'context/login/', g_headers);
	if(incapsule.isIncapsulated(html)){
		AnyBalance.trace('Инкапсула вмешалась на старте');
	    html = incapsule.executeScript(html);
	}

	function tryToLogin(html){
		var form = getElement(html, /<form[^>]+form1/i);
		if (!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен?');
		}
		
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'Login') {
				return prefs.login;
			} else if (name == 'Password') {
				return prefs.password;
			} else if (name == 'LoginGroup') {
				return 'HasAccountRadio';
			}
	    
			return value;
		});
	    
		html = AnyBalance.requestPost(baseurl + 'context/login/', params, addHeaders({Referer: baseurl + 'context/login/'}));
		if(incapsule.isIncapsulated(html)){
			AnyBalance.trace('Инкапсула вмешалась после логина');
		    html = incapsule.executeScript(html);
		}
		return html;
	}

	html = tryToLogin(html);
   	if(!/context\/logoff/i.test(html) && /<form[^>]+form1/i.test(html)){
   		AnyBalance.trace('Снова форма авторизации... Заходим ещё разок');
	  	html = tryToLogin(html); //Иногда может снова быть логин, если инкапсула не дала залогиниться
	}

	
	if (!/context\/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="ErrorSpan"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	if (isAvailable(['balance', 'blocked', 'available'])) {
		html = AnyBalance.requestGet(baseurl + 'context/myaccount/', g_headers);
		
		getParam(html, result, 'balance', /Остаток средств на счете[\s\S]*?<span>([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'blocked', /Заблокировано[\s\S]*?<span>([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'available', /Доступные средства[\s\S]*?<span>([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if (isAvailable('bonus')) {
		html = AnyBalance.requestGet(baseurl + 'context/mypoints/', g_headers);
		getParam(html, result, 'bonus', /"eOzonStatus_NumberPoints"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	var orders = 0;
	if (isAvailable(['order_sum', 'weight', 'ticket', 'state'])) {
		html = AnyBalance.requestGet(baseurl + '?context=orderlist&type=3', g_headers);
		
		getParam(html, result, 'order_sum', /К оплате([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'weight', /class="Weight"([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'ticket', /Отправление([^>]*>){2}/i, replaceTagsAndSpaces);
		getParam(html, result, 'state', /<span[^>]+orderState[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	}
	
	html = AnyBalance.requestGet(baseurl + 'context/myclient/');
	
	getParam(html, result, '__tariff', /<div[^>]+class="big1"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}

function getViewState(html) {
	return getParam(html, null, null, /name="__VIEWSTATE"[^>]*value="([^"]*)/i) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}