/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://paycard.beeline.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://paycard.beeline.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal/pub/Entrance', addHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}));
	AnyBalance.sleep(1000); //Без таймаутов не пашет

	var form = getParam(html, null, null, /<form[^>]*login[\s\S]*?<\/form>/i);
	checkEmpty(form, 'Не удалось найти форму входа, сайт изменен?', true);
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'ean')
			return prefs.login;
		if (name == 'rememberEan')
			return undefined;
		
		return value;
	});
	
	var action = getParam(form, null, null, /<form[^>]*data-validator-ajax-url="([^"]+)/i, [/\.\.\//, '']);
	checkEmpty(action, 'Не удалось найти ссылку входа, сайт изменен?', true);
	
	html = AnyBalance.requestPost(baseurl + 'personal/' + action, params, addHeaders({
		Referer: baseurl + 'personal/pub/Entrance',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'X-Requested-With':'XMLHttpRequest'
	}));
	AnyBalance.sleep(1000); //Без таймаутов не пашет
	
	params.password = prefs.password;
	
	html = AnyBalance.requestPost(baseurl + 'personal/' + action, params, addHeaders({
		Referer: baseurl + 'personal/pub/Entrance',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',

		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	if(!json.validated) {
		var error = '';
		if(json.fields) {
			var errors = json.fields.join(', ');
			for(var i = 0; i < json.fields.length; i++) {
				error += json.fields[i].errorMessage + ', ';
			}
		}
		if(json.form) {
			error = getParam(json.form.errorMessage, null, null, null, replaceTagsAndSpaces);
		}
		
		if (error && error != '')
			throw new AnyBalance.Error(error, null, /несуществующий номер|неверный пароль или номер/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');		
		
	}
	
	html = AnyBalance.requestGet(baseurl + 'personal/main', g_headers);

	if(!/b-exit_link/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет.. Сайт изменен?');
	}
		
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />Баланс([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /name__user[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', />Номер карты([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('extra')) {
		var act = getParam(html, null, null, /wicketAjaxGet\('(\?x=[^']+)/i);
		if(act) {
			html = AnyBalance.requestGet(baseurl + 'personal/main' + act + '&random=' + Math.random(), g_headers);
			getParam(html, result, 'extra', /Экстра-бонусы(?:[^>]*>){7}\s*Доступные([^>]*>){10}/i, replaceTagsAndSpaces, parseBalance);		
		}
	}
	
	AnyBalance.setResult(result);
}