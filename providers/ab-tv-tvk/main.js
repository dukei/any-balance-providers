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
	var baseurl = 'http://tvk.tv';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	while (prefs.login.length < 7)
	{
		prefs.login = '0'+prefs.login;
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'USER_LOGIN')
			return prefs.login;
		else if (name == 'USER_PASSWORD')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + '/index.php?login=yes', {
		backurl: params.backurl,
		AUTH_FORM: params.AUTH_FORM,
		TYPE: params.TYPE,
		USER_CITY: params.USER_CITY,
		USER_LOGIN: prefs.login,
		USER_PASSWORD: prefs.password
	}, addHeaders({Referer: baseurl}));
	
	if (!/text-lk-out/i.test(html)) {
		var error = getParam(html, null, null, /<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменён?');
	}
	
	var result = {success: true};
	html = AnyBalance.requestGet(baseurl+'/profile/index.php', g_headers);

	var hrefTarifInfo = getParam(html, null, null, /urlt = "([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	var hrefUserInfo = getParam(html, null, null, /url: '(\/bitrix\/components\/dv\/kabinet\.tv\/json_ajax.php\?fio[^']*)'/i, replaceTagsAndSpaces, html_entity_decode);

	var json = requestGetJson(baseurl, hrefUserInfo, /\(([\s\S]*?)\)/i);

	if (!isArray(json) || json.length == 0)
		throw new AnyBalance.Error('Не удалось найти информацию о пользователе, сайт изменён?');

	getParam(json[0].FIO, result, "fio", null, replaceTagsAndSpaces, html_entity_decode);
	if(json[0].KARTA)
		getParam(json[0].KARTA+'', result, "card", null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[0].DOGOVOR_NO+'', result, "agreementID", null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[0].ACCOUNT_NO+'', result, "accountNumber", null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[0].BALANS*(-1), result, "balance");


	html= AnyBalance.requestGet(baseurl+hrefTarifInfo, g_headers);
	getParam(html, result, 'tarifTV', /checked="checked"[^>]*>[\s\S]*?<input[^>]+value="([\s\S]+?)\-/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'costTV', /checked="checked"[^>]*>[\s\S]*?<input[^>]+value="[^\d]+(\d+[.,]\d+)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
function requestGetJson(baseurl, href, regex) {
	return getJson(
		getParam(AnyBalance.requestGet(baseurl+href), null, null, regex)
	);
}
