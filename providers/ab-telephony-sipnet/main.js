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

var basedomain = 'www.sipnet.net';

function makeBaseurl(basedomain){
	return 'https://' + basedomain + '/cabinet/';
}

function login(baseurl){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.trace('Авторизовываемся с ' + baseurl);

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+main-login-form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'Name') {
			return prefs.login;
		} else if (name == 'Password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'index?chosen_locale=ru', params, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/profile-link/i.test(html)) {
		var error = getElement(html, /<span[^>]+class="error"/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол|password/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter login or SIP ID');
	checkEmpty(prefs.password, 'Enter password');

	var baseurl = makeBaseurl(basedomain);
	
	try{
		var html = login(baseurl);
	}catch(e){
		var domain = getParam(AnyBalance.getLastUrl(), /https?:\/\/([^\/]*)/i);
		if(domain != basedomain){
			AnyBalance.trace('Требуется авторизоваться с ' + domain);
			baseurl = makeBaseurl(domain);
			html = login(baseurl);
		}else{
			throw e;
		}
	}


	var result = {success: true};
	getParam(html, result, '__tariff', /<span[^>]+user-plan-name[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'sipid', /SIP ID[\s\S]*?<div[^>]+item-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(prefs.login, result, 'login');
	
	var html = AnyBalance.requestGet(baseurl + 'do_personal_new', addHeaders({Referer: baseurl}));
	getParam(html, result, 'nickname', /<li[^>]+class="current"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /name="USERNAME"[^*]value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	
	var balance = getParam(html, /(?:Баланс|Balance)[\s\S]*?<div[^>]+item-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	if(!balance){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t find balance! Site changed?');
	}
	
	getParam(balance, result, 'balance_precise');
	getParam(parseFloat(balance.toFixed(2)), result, 'balance');

	AnyBalance.setResult(result);
}
