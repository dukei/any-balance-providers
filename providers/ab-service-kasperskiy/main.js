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
	var baseurl = 'https://my.kaspersky.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var url = AnyBalance.getLastUrl();

	html = AnyBalance.requestPost(baseurl + 'SignIn/SignIn', {
		ReturnUrl: '',
		EMail:	prefs.login,
		Password:	prefs.password,
		'X-Requested-With':	'XMLHttpRequest'
	}, addHeaders({Referer: url, 'X-Requested-With': 'XMLHttpRequest'}));

	if(!/^\{[\s\S]*\}$/.test(html)){
		if(/<div[^>]+id="ExpiredPasswordForm"/i.test(html)){
			throw new AnyBalance.Error('Касперский сообщает, что ваш пароль давно не менялся и устарел. Зайдите на https://my.kaspersky.ru, поменяйте пароль и введите новый пароль в настройки провайдера.', null, true);
		}

		var error = getElement(html, /<div[^>]+forms__message__error[^>]*>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var json = getJson(html);
	html = AnyBalance.requestPost(json.EndPoint, {
		User: prefs.login,
		Password: prefs.password,
		logonContext: getParam(url, null, null, /logonContext=([^&]*)/i, null, decodeURIComponent),
		failureUrl: json.FailureUrl
	}, addHeaders({Referer: url}));

	var params = createFormParams(html);
	params.wresult = getParam(html, null, null, /"wresult"[^>]*value="([^"]+)/i, replaceHtmlEntities);
	
  	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: AnyBalance.getLastUrl()}));

	if(!/MyLicenses/i.test(AnyBalance.getLastUrl()))
    	html = AnyBalance.requestGet(baseurl + 'MyLicenses', g_headers);

    json = getJsonObject(html, /licensesAndViewSettings\s*=/);
    if(!json){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Информация о лицензиях не найдена!');
    }

    if(!json.ServiceUsages.length)
    	throw new AnyBalance.Error('У вас нет ни одной лицензии!');

    var result = {success: true};

    var svcSelected, svcDefault;
    for(var i=0; i<json.ServiceUsages.length; ++i){
    	var svc = json.ServiceUsages[i];

    	if(!prefs.lic_id && !svcDefault)
    		svcDefault = svc;

    	if(!svcSelected && prefs.lic_id && new RegExp(prefs.lic_id, 'i').test(svc.ServiceName)){
    		svcSelected = svc;
    		break;
    	}

    	if(!prefs.lic_id){ //Хотим найти неустаревшую лицензию в первую очередь
    		var till = getParam(svc.ExpirationDate || undefined, null, null, null, null, parseBalance);
    		if(till > new Date().getTime()){
    			svcSelected = svc;
    			break;
    		}
    	}
    }

    if(i >= json.ServiceUsages.length)
    	throw new AnyBalance.Error('Не удалось найти ' + (prefs.lic_id ? 'лицензию с названием ' + prefs.lic_id : 'ни одной лицензии!'));

    var svc = svcSelected || svcDefault;

	getParam(svc.ServiceName, result, '__tariff');
	getParam(svc.AvailableSlotsCount, result, 'devices');
	getParam(svc.ExpirationDate || undefined, result, 'expires_date', null, null, parseBalance);
    
	AnyBalance.setResult(result);
}