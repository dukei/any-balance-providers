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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://boxberry.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите трек-номер!');
	
	try {
		var html = AnyBalance.requestGet(baseurl, g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'departure_track/', {
		id: prefs.login,
	}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	
	if (!/№ заказа/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию по трек-номеру ' + prefs.login + '. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'orderNum', /<b>\s*№ заказа интернет-магазина(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<b>\s*№ заказа интернет-магазина(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'storeName', /<b>\s*Название интернет-магазина(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'dest', /<b>\s*Город назначения(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'weight', /<b>\s*Вес товара(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'point', /<b>\s*Пункт выдачи(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['orderNumBox', 'all'], /<b>\s*Номер заказа Boxberry(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('all')) {
		html = AnyBalance.requestPost(baseurl + 'track2.php', {
			'type': 'trackone',
			'type_track': 'z',
			'id': result.orderNumBox
		}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));		
		
		var items = sumParam(html, null, null, /\d{2}\.\d{2}.\d{2} \(?\d{2}:\d{2}\)?(?:[^>]*>){3}[\s\S]*?<\//ig);
		if(items) {
			var text = '';
			for(var i = 0; i < items.length; i++) {
				var match = /(\d{2}\.\d{2}.\d{2} \(?\d{2}:\d{2}\)?)(?:[^>]*>){3}([\s\S]*?)<\//i.exec(items[i]);
				
				text += match[1] + ': ' + match[2] + '\n';
			}
			result.all = text;
		}
	}
	AnyBalance.setResult(result);
}