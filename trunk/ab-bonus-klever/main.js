/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://my.cleverbonus.ua',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.cleverbonus.ua/';
	var html, res, json, result;
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	html = AnyBalance.requestGet(baseurl + 'CWA/#login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.setCookie('my.cleverbonus.ua', 'changePasswordLogin', prefs.login);
	AnyBalance.setCookie('my.cleverbonus.ua', 'lang', 'UA');
	
	res = AnyBalance.requestPost(baseurl + 'CWA/rest/auth/login', JSON.stringify({
		login: prefs.login,
		password: CryptoJS.SHA1(prefs.password).toString(CryptoJS.enc.Hex)
	}), addHeaders({
		Referer: baseurl + 'CWA/',
		'X-Requested-With':' XMLHttpRequest',
		'Content-Type': 'application/json',
		'Accept': 'application/json, text/javascript, */*; q=0.01'
	}));

	if(AnyBalance.getLastStatusCode() > 400){
		/**
		 * error:function(d,c){if(c.status==601){$$.showLocalizedMsg("error","wrongLoginOrPassword")
			}else{if(c.status==602){app.navigate("firstChangePassword",true)
			}else{if(c.status==609){$$.showLocalizedMsg("error","noActiveMedium")
			}else{if(c.status==611){$$.showLocalizedMsg("error","mediumNotActive")
			}else{if(c.status==612){$$.showLocalizedMsg("error","mediumWithNoOwner")
			}else{if(c.status==613){$$.showLocalizedMsg("error","mediumWithNoMemberOwner")
		 */
		if(AnyBalance.getLastStatusCode() === 601)
			throw new AnyBalance.Error('Невірний логін або пароль', null, true);
		AnyBalance.trace('error code: ' + AnyBalance.getLastStatusCode());
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	result = {success: true};

	res = AnyBalance.requestGet(baseurl + 'CWA/rest/balance/summary/', null, addHeaders({
		Referer: baseurl + 'CWA/',
		'X-Requested-With':' XMLHttpRequest',
		'Content-Type': 'application/json',
		'Accept': 'application/json, text/javascript, */*; q=0.01'
	}));
	json = getJson(res);
	getParam('' + json.points, result, 'balance', null, replaceTagsAndSpaces, parseBalance);

	res = AnyBalance.requestGet(baseurl + 'CWA/rest/personalDetails/', null, addHeaders({
		Referer: baseurl + 'CWA/',
		'X-Requested-With':' XMLHttpRequest',
		'Content-Type': 'application/json',
		'Accept': 'application/json, text/javascript, */*; q=0.01'
	}));
	json = getJson(res);
	getParam(json.lastName + ' ' + json.firstName + ' ' + json.middleName, result, 'fio', null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}