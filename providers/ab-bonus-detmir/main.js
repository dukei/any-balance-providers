/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1.2'] //Детский мир только на этом протоколе теперь работает
	});
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
    var baseurl = 'https://dmbonus.korona.net/';
	
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl + 'dm');
        
    AnyBalance.trace('Пытаемся ввести капчу');
    var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', baseurl + 'dm', '6LfijT0UAAAAADy8SUzjmi7K9-zB4bTWhTXFQ2fj');
    AnyBalance.trace('Капча получена: ' + captcha);
	
	html = AnyBalance.requestPost(baseurl + 'dm/detmir/info', {
		'card':prefs.login,
		'captcha':captcha
	}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	if(!/Номер карты:/i.test(html)){
        var error = getParam(html, null, null, /id="ErrorLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        error = getParam(html, null, null, /<h4>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /введите верный номер карты/i.test(error));
		
        throw new AnyBalance.Error('Не удалось получить данные по карте. Сайт изменен?');
    }
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Общее количество бонусов([^<]+)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'active', /Количество активных бонусов([^<]+)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'inactive', /Количество неактивных бонусов([^<]+)</i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}