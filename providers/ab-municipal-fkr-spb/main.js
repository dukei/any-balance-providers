/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://fkr-spb.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'/user', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var formBuildID=getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]+value="([\s\S]*?)"[^>]*>/i);
	html = AnyBalance.requestPost(baseurl+'/user', {
		name: prefs.login,
		pass: prefs.password,
		form_id: 'user_login',
		op: 'Войти',
		form_build_id: formBuildID,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl}));

	if (!/Добавить квартиру/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>([\s\S]*?)\(.*?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя или пароль введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};

	var userID = getParam(html, null, null, /<a href="\/user\/(\d+)\/[^>]*>/i, null, html_entity_decode);

	html=AnyBalance.requestGet(baseurl+'/user/'+userID+'/edit');
	getParam(html, result, 'fio', /id="edit-field-fio-und-0-value"[^>]+value="([\s\S]*?)"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

	html=AnyBalance.requestGet(baseurl+'/rest.php?method=flats', g_headers);

	var flatID = getParam(html, null, null, /"id":(\d+),/i, replaceTagsAndSpaces);
	html=AnyBalance.requestGet(baseurl+'/rest.php?method=flat&id='+flatID);

	getParam(html, result, 'contributions', /"collectPercent":((?:\d+)[.,]?(?:\d+)?)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /"flatNumNorm":[\s\S]*?"saldo":((?:\d+)[.,]?(?:\d+)?)/i, replaceTagsAndSpaces, parseBalance)
	getParam(html, result, 'houseKadNum', /"house":{[\s\S]+?kadnum":"([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'flatKadNum', /"sqrBase":[\s\S]*?"kadNum":"([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'adress', /"house":{[\s\S]+?fulladdress":"([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'flatNumber', /"flatNum":"(\d+)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'flatArea', /"living":[\s\S]+?sqrFull":((?:\d+)[.,]?(?:\d+)?),/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}