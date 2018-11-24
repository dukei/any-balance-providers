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

  var errorMessages = {1101: 'Отсутствует обязательный параметр',
1102: 'Неверно указан логин или пароль',
1103: 'Неверный токен',
1104: 'Номер или email не уникален',
1105: 'Превышен лимит запросов аутентификации',
1107: 'Провайдер аутентификации недоступен',
1108: 'Такой e-mail/телефон не указан ни у одного сотрудника',
1109: 'Указанный e-mail/телефон установлен больше чем для одного сотрудника',
1110: 'Пароль был недавно изменен. Повторная возможность создания/восстановления будет доступна в течение часа',
1112: 'Для создания/восстановления пароля необходимо произвести выход из приложения "Центр Обработки Вызовов (ЦОВ)". Обратите внимание, что обновленный пароль будет необходимо указать при последующей авторизации в ЦОВ',
1111: 'Ошибка, попробуйте повторить через минуту'};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://lk.mango-office.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
    
	html = AnyBalance.requestPost('https://auth.mango-office.ru/auth/vpbx', {
		'app':'ics',
		'username':prefs.login,
		'password':prefs.password,
	}, addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		Referer: baseurl
	}));

	var json = getJson(html);

	if(json.result != 1000){
		var error = errorMessages[json.result];
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
			
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось авторизоваться. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + 'auth/create-session', {
		auth_token: json.auth_token,
		refresh_token: json.refresh_token,
		username: prefs.login,
		app: 'ics'
	}, addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		Referer: baseurl,
		"X-Requested-With": "XMLHttpRequest"
	}));

	json = getJson(html);
	html = AnyBalance.requestGet(joinUrl(baseurl, json.redirect_url), addHeaders({Referer: baseurl}));
	
	if (!/auth\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class="b-error-message[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    if(prefs.prodid){
		var regExp = new RegExp('<a href="\/([^"]*vats)[^>]*Перейти на страницу продукта[^>]*>[^№]+№' + prefs.prodid, 'i');
		
		var product_href = getParam(html, null, null, regExp);
		if(!product_href)
			throw new AnyBalance.Error("Не удаётся найти ссылку на продукт №" + prefs.prodid);
		
		html = AnyBalance.requestGet(baseurl + product_href);
    }
	
	getParam(html, result, 'balance', /class="balance\s*"(?:[^>]*>){4}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /span>\s*Лицевой счет(?:[^>]*>){2}([\s\d]{6,})/i, replaceTagsAndSpaces);
	getParam(html, result, 'product', /<span[^>]+product-title[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<span[^>]+switch-plan-version-link[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'freespace', />\s*Свободно(?:[^>]*>){2}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseTraffic);
	getParam(getElement(html, /<span[^>]+"b-number"/i), result, 'incline', null, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}