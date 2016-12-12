/**
Показания счетчика Пермэнергосбыт (http://any-balance-providers.googlecode.com)

Получает баланс на счету оплаты электроэнергии 

Operator site: http://permenergosbyt.ru/
Личный кабинет: http://test.permenergosbyt.ru/Auth/IndividualEnergy
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
};

function redirectIfNeeded(html){
    if(/document.forms\[0\].submit/i.test(html)){
    	AnyBalance.trace('Потребовался редирект формой...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('Потребовался get редирект...');
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestGet(joinUrl(url, redir), addHeaders({Refefer: url}));
    }
    return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.surname, 'Введите фамилию!');
	checkEmpty(prefs.phone, 'Введите телефон!');

    var baseurl = "https://test.permenergosbyt.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'Auth/IndividualEnergy', g_headers);

    html = AnyBalance.requestPost(baseurl + 'Auth/IndividualEnergy', {
        "Number":prefs.login,
        "SecondName":prefs.surname
    }, addHeaders({Referer: baseurl + 'Auth/IndividualEnergy'})); 
    html = redirectIfNeeded(html);

    var form = getElement(html, /<form[^>]+name="auth"/i);
    
    if(!form || !/<input[^>]+phone/i.test(html)){
        var error = getElement(html, /<div[^>]+(?:field-validation-error|alert)/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /лицев|фамили/i.test(html));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'phone') {
			return prefs.phone;
		}

		return value;
	});
	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), action), params, addHeaders({Referer: AnyBalance.getLastUrl()})); 
    html = redirectIfNeeded(html);

    if(!/logout/i.test(html)){
        var error = getElement(html, /<div[^>]+(?:field-validation-error|alert)/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /телефон/i.test(html));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось подтвердить вход в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /(?:Долг|Переплата)(?:\s|&nbsp;)*:[\s\S]*?<\/p>/i, [/Долг(?:\s|&nbsp;)*:/i, '-', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'account', /Лицевой счет(?:\s|&nbsp;)*:([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio', /ФИО(?:\s|&nbsp;)*:\s*([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, 'number', /Номер счетчика(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тариф(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'tariffNumber', /Ставка тарифа(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('statement', 'consumption')){
    	html = AnyBalance.requestGet(AnyBalance.getLastUrl() + '?action=charges&active_from=' + getFormattedDate({offsetMonth: 3}) + '&active_to=' + getFormattedDate(), g_headers);
    	getParam(html, result, 'statement', /<td[^>]*>\s*электроэнерги(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'consumption', /<td[^>]*>\s*электроэнерги(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
