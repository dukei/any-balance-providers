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
    var baseurl = "http://www.citilink.ru";

    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl, g_headers);
	var form = getElement(html, /<form[^>]+action="[^"]*auth\/login[^>]*>/i);
	var action = getParam(form, null, null, /<form[^>]+action="([^"]+)/i);

	if(!action) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}
	AnyBalance.trace('form action: ' + action);

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
	    else if (name == 'token'){
	    	var json = getParam(html, null, null, /window\s*\[\s*'globalSettings'\s*\]\s*=\s*(\{[^}]*\})/, null, getJson);
	    	var obj = new te(json);
	    	return pg({a: obj}); //Весьма сложные преобразования токена
	    }

		return value;
	});

	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: baseurl + '/'})); 
	
    if(!/\/login\/exit/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="[^"]*error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, '__tariff', /Статус(?:\s|<[^>]*>)*:([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Бонусы(?:\s|<[^>]*>)*:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wishes', /Желания(?:\s|<[^>]*>)*:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('num', 'sum')){
    	html = AnyBalance.requestGet(baseurl + '/profile/', g_headers);

    	getParam(html, result, 'num', [/(\d+)\s*товар\S* на сумму/i, /Учт[ёе]нных покупок нет/i], [replaceTagsAndSpaces, /Учт[ёе]нных покупок нет/i, '0'], parseBalance);
    	getParam(html, result, 'sum', [/товар\S* на сумму:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, /Учт[ёе]нных покупок нет/i], [replaceTagsAndSpaces, /Учт[ёе]нных покупок нет/i, '0'], parseBalance);
    }
	
	if(isAvailable(['obrabotannie', 'pomosh', 'reshennie', 'zhalobi', 'rating', 'position', 'nachisleno'])) {
		AnyBalance.trace('Переходим на страницу эксперта..');
		html = AnyBalance.requestGet(baseurl + '/profile/expert/', g_headers);
		
		AnyBalance.trace('Но кабинет новый, можем счетчиков не найти... Если что, присылайте лог');
		getParam(html, result, 'obrabotannie', /Количество обработанных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'pomosh', /Скольким людям помогли ответы(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'reshennie', /Количество решенных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'zhalobi', /Количество жалоб на эксперта(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'rating', /Ваш рейтинг(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'position', /Ваше место(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'nachisleno', /Начислено бонусов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}

    AnyBalance.setResult(result);
}
