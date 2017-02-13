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

var errors = {
	wrongpass: 'Неверный логин или пароль. Проверьте введенные данные.',
	changepass: 'Вам необходимо сменить пароль. Войдите в личный кабинет через браузер, затем введите новый пароль в настройки провайдера'
}

var baseurlNew = 'https://my.prosto.net/';
var baseurlHome = 'http://home.prosto.net/';

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = baseurlNew;
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var htmlInitial = html;

//	if(/home.prosto.net/i.test(AnyBalance.getLastUrl())){
		html = AnyBalance.requestPost(baseurlHome + 'server.php', {
			action: 'auth',
			url: '/',
			user_id: '',
			login: prefs.login,
			password: prefs.password,
		}, addHeaders({Referer: baseurlHome}));
		
		try{
			var json = getJson(html);
		}catch(e){};
		
		if (!json || json.result != 'ok') {
			var error = json && errors[json.result];
			if (error)
				throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	    
		html = AnyBalance.requestGet(joinUrl(baseurlHome, json.url), g_headers);
		return fetchHome(html);
		
/*	}else{ //Новый логин
		html = AnyBalance.requestPost(baseurl + 'server.pl', {
			action: 'login-check',
			user_id: prefs.login,
			password: prefs.password,
		}, addHeaders({Referer: baseurl + 'index.pl'}));
		
		try {
			var json = getJson(html);
		} catch (e) {}
		
		if (!json || (json.result != 'ok' && json.result != 'redirect')) {
			var error = json && errors[json.result];
			if (error)
				throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	    
		if(json.result == 'redirect'){
			return fetchHomeAutoLogin(htmlInitial);
		}else{
			html = AnyBalance.requestGet(baseurl + json.url, g_headers);
		}
	}
	*/
}

function fetchNew(html){
	var result = {success: true};
	
	getParam(html, result, 'balance', /На Вашем счету(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Лицевой счет(?:[\s\S]*?<td>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тарифный план(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Доступ(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'state', /Состояние аккаунта(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}

function fetchHomeAutoLogin(html){
	AnyBalance.trace('Авто логин в home');

	var prefs = AnyBalance.getPreferences();

	var form = getElement(html, /<form[^>]+redirect/i);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}
		return value;
	});
	var url = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	html = AnyBalance.requestPost(url, params, g_headers);

	if(!/выход/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неправильный логин или пароль', null, true);
	}

	fetchHome();
}

function fetchHome(html){
	AnyBalance.trace('Получаем данные из home');

	var prefs = AnyBalance.getPreferences();
	var baseurl = baseurlHome;

	var html = AnyBalance.requestPost(baseurl + 'server.php', {
		module:	'app',
		action:	'app-get-usr',
		id:	0,
		hashcode: -1021167119
	}, addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);

	var result = {success: true};

	for(var i in json.objects){
		var data = json.objects[i];

		getParam(data.balance+'', result, 'balance', null, null, parseBalance);
		getParam(data.account_id, result, 'acc_num');
		getParam(data.tariff_name_uk, result, '__tariff');
		getParam(data.status, result, 'status');
//		getParam(html, result, 'state', /Состояние аккаунта(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		break;
	}
	
	
	AnyBalance.setResult(result);

}