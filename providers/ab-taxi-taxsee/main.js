/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://client.taximaxim.com/";
    AnyBalance.setDefaultCharset('utf-8'); 
   	
   	checkEmpty(prefs.login, 'Введите 10 цифр номера телефона без пробелов и разделителей, например, 9261234567');

//    createCityList();

    var html = AnyBalance.requestGet(baseurl + 'site/fp/?url=' + encodeURIComponent(baseurl + 'login/') + '&fp=' + hex_md5(prefs.login), g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

    var form = getElement(html, /<form[^>]+login-form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/baseId/i.test(name)) {
			return prefs.city || '6';
		} else if (/phone/i.test(name)) {
			return prefs.login;
		} else if (/code/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

    var html = AnyBalance.requestPost(baseurl + 'login/', params, addHeaders({Referer: baseurl})); 

    if(!/logout/i.test(html)){
        var error = getElement(html, /<div[^>]+error-summary/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /номер/i.test(error));
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
	
	getParam(html, result, 'discont', /Скидка(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<input[^>]+profileform-fio[^>]*value="([^"]*)/i, replaceHtmlEntities);
	getParam(html, result, '__tariff', /<input[^>]+profileform-fio[^>]*value="([^"]*)/i, replaceHtmlEntities);
	getParam(html, result, 'balance', /Баланс(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /Баланс(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function createCityList(){
	var html = AnyBalance.requestGet('http://cabinet.taximaxim.ru/webapp/index.php?r=clientCabinet/login', g_headers);
	var list = getElement(html, /<div[^>]+id="cityList"[^>]*>/i);
	var items = getElements(list, /<li[^>]*>/ig);

	var values = [];
	var names = [];
	for(var i=0; i<items.length; ++i){
		var it = items[i];
		values.push(getParam(it, null, null, /value="([^"]*)/i, replaceHtmlEntities));
		names.push(getParam(it, null, null, null, replaceTagsAndSpaces));
	}

	AnyBalance.setResult({
		success: true,
		entries: names.join('|'),
		entryValues: values.join('|')
	});
}
