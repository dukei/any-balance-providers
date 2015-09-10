/**
Plugin for AnyBalance (http://any-balance-providers.googlecode.com)

Kievstar
Site: https://my.kyivstar.ua/
Author: Viacheslav Sychov
*/
var headers = {
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'uk-UA,uk;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
	'Connection': 'keep-alive'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://my.kyivstar.ua/";
	
	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1'], // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
	}); 

	AnyBalance.trace('Connecting to ' + baseurl);
	
	var html = AnyBalance.requestGet(baseurl + 'tbmb/login/show.do', headers);
	var form = getParam(html, null, null, /<form[^>]+action="[^"]*perform.do"[^>]*>([\s\S]*?)<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Не удаётся найти форму входа. Проблемы или изменения на сайте?');
	
	/*var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ getParam(html, null, null, /<img src="\/(tbmb\/jcaptcha[^"]*)/i));
		captchaa = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}*/
	
	var params = createFormParams(form);
	params.isSubmitted = "true";
	params.user = prefs.login;
	params.password = prefs.password;
	//params.captcha = captchaa;	
	
	try{
		html = AnyBalance.requestPost(baseurl + 'tbmb/login/perform.do', params, headers);
	}catch(e){
		if(!prefs.__debug)
			throw e;
		html = AnyBalance.requestGet(baseurl + 'tbmb/disclaimer/show.do', headers);
	}
	
	if(!/\/logout\/perform/i.test(html)){
		var matches = html.match(/class="redError"[^>]*>([\s\S]*?)<\/td>/i);
		if (matches)
			throw new AnyBalance.Error(matches[1]);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	AnyBalance.trace('Successfully connected');
	
	var result = {success: true};
	getParam(html, result, 'balance', /(?:Текущий баланс|Поточний баланс|Current balance):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /(?:Бонусный баланс|Бонусний баланс|Bonuses)[\s\S]*?>\s*(?:Баланс|Balance):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /(?:Особовий рахунок|Лицевой счет|Account):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /(?:Статус послуги «Домашній Інтернет»|Статус услуги «Домашний Интернет»|The state of service «Home Internet»):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /(?:Тарифный пакет|Тарифний пакет|Rate package|Тарифний план|Тарифный план|Rate Plan):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}