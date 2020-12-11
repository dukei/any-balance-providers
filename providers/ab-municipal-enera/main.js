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

var g_headers1 = {'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Referer': 'https://www.enera.lg.ua/uk/customer',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest'};


function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.enera.lg.ua/uk/customer/';
	AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet(baseurl+'get-billing-info?_=1562964221303', g_headers1);
	var html = AnyBalance.requestGet(baseurl+'login', g_headers);

        

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'login')
			return prefs.login;
		else if(name == 'passwd')
			return prefs.password;		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl+'login', params, g_headers); 

	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	if (!/\/uk\/customer\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	var responce = getJson(AnyBalance.requestGet(baseurl+'get-billing-info?_=1562964221303', g_headers1));
	html=responce.data.billingDataHtml;
	getParam(html, result, 'balance', /за електроенергію[\s\S]*?<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'day', /(?:Останні показники \(день\))([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'night', /(?:Останні показники \(ніч\))([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'all', /(?:Значення останнього показання)([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lastdate', /(?:Дата знімання показань лічильника)([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces, parseDate);
	var preresult= {success: true};
	getParam(html, preresult, 'ls', /(?:особового рахунку)([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces);
	getParam(html, preresult, 'dogdate', /(?:Дата укладення договору)([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces);
	getParam(html, preresult, 'EIC', /(?:EIC)([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces);
        result.__tariff='ЛС:'+preresult.ls+' EIC:'+preresult.EIC+' Договор от '+preresult.dogdate;

        AnyBalance.setResult(result);
}
