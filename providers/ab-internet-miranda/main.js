/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
	'Connection': 'keep-alive',
	DNT:1,
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
//'Sec-Fetch-Mode':'navigate',
//'Sec-Fetch-User':'?1',
//'Sec-Fetch-Site':'same-origin',
Origin:'https://lk.miranda-media.ru'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.miranda-media.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lk_auth',g_headers);
	AnyBalance.trace(html);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	if (!/Вы зашли как/.test(html)){
	   var params = createFormParams(html, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/login/i.test(name)) 
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;
		else if (/submit/i.test(name))
			return undefined;
		else if(/formDate/i.test(name))
			AnyBalance.setCookie('lk.miranda-media.ru', 'LFR_SESSION_STATE_5', value+100, null)
		return value;
	   });
	   var action = getParam(html, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
           AnyBalance.trace('action='+action);
           AnyBalance.trace('params='+JSON.stringify(params));
	   html = AnyBalance.requestPost(action, params,addHeaders({Referer:'https://lk.miranda-media.ru/lk_auth'}));
	}else{
	   var html = AnyBalance.requestGet(baseurl + 'group/prmsaas/main',g_headers);
	}
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	getParam(html, result, 'fio', /user-full-name">([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);	
	var json=getParam(html,null,null,/jsonDataBillInfo[^\{]+({[\s\S]*?})/i);
	AnyBalance.trace(json);
	var json=getJson(json);
	getParam(json.balanceValue, result, 'balance', null, null, parseBalance);
	result.dogovor=json.contractNm;
	result.bonus=json.bonusValue;

	var json=getParam(html,null,null,/jsonDataTariffInfo[^\{]+({[^;]*})/i);
	AnyBalance.trace(json);
	var json=getJson(json);
	result.adr=json.v_address;
        var json=json.tariffs;
	result.__tariff=json[0].tpName;
	var res = json.map(tar => tar.tpCost).reduce((acc, bill) => bill + acc);
	result.cost=res;
	getParam(html, result, '__tariff', /Тариф(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}