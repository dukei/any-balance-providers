/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin': 'https://service.s7.ru',
	'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900F Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.93 Mobile Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://service.s7.ru/';
	
	// var html = AnyBalance.requestGet(baseurl + 'home/s7-priority/profile2Login.dot', g_headers);
	
	// if(!html || AnyBalance.getLastStatusCode() > 400){
		// AnyBalance.trace(html);
		// throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	// }
	
    html = AnyBalance.requestPost(baseurl + (/@/.test(prefs.login) ? 'mobileffp/loginEmailAction.action' : 'mobileffp/loginCardAction.action'), {
		'scr': '360x640',
        'user.emailOrCardNumber': prefs.login,
		'user.passwordOrPin': prefs.password,
		'user.remember': 'false',
		'button_next': 'Логин'
    }, addHeaders({ Referer: baseurl }));
	
	if (!/action:exitAction/i.test(html)) {
		var error = getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неправильного формата|Карты с таким номером не существует|Укажите корректный ПИН|Профиль с такими параметрами не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardnum', /Номер карты:([^>]*>){2}/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Номер карты:([^>]*>){2}/i, replaceTagsAndSpaces);
	getParam(html, result, 'qmiles', /Статусный баланс:(?:[^>]*>){1}\s*(\d+)\s*мил/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'flights', /Статусный баланс:[^>]*>[^/]+([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	
    /*if(AnyBalance.isAvailable('qmiles', 'flights')){
        html = AnyBalance.requestGet(baseurl + 'home/priority/ffpMyMiles.dot');
		
        //getParam(html, result, 'qmiles', /<td[^>]+class="balance"[^>]*>([\s\S]*?)(?:<\/td>|\/)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'flights', /<td[^>]+class="balance"[^>]*>[^<]*\/([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }*/
    AnyBalance.setResult(result);
}