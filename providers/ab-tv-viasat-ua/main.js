/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://my.viasat.ua/ua/";

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

 	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		email: prefs.login,
		password: prefs.password,
		'email_f': '',
		'action': 'fogotPassword',
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/action_exit/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};

    getParam(html, result, 'agreement', /Договір(?:[\s\S]*?<option[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<div[^>]*class="balance"[^>]*>([\S\s]*?)<\/div>/i, [/&#8209;/g, '-', replaceTagsAndSpaces], parseBalance);
	
    // getParam(html, result, '__tariff', />\s*(?:пакет)\s*(<[\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    // getParam(html, result, 'status', /(?:Статус):([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    // getParam(html, result, 'clientid', /(?:Номер клієнта|Номер клиента):([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    // getParam(html, result, 'cardnum', /(?:Номер карти|Номер карты):([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
