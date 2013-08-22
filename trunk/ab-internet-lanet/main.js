/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для киевского интернет-провайдера lanet

Сайт оператора: http://lanet.ua
Личный кабинет: https://my.lanet.ua
*/
// Парсит дату из такого вида в мс 27 июля 2013
function parseDateMoment(str){
	AnyBalance.trace('Original input: ' + str);
	var found = /(\d{1,2})\s*([\s\S]*?)\s*(\d{1,4})/i.exec(str);
	if(found)
	{
		var date = new Date();
		var day = found[1];
		var month = found[2];

		if(month == 'января')
			month = '01';
		else if(month == 'Фев')
			month = '02';
		else if(month == 'Мар')
			month = '03';
		else if(month == 'Апр')
			month = '04';
		else if(month == 'Мая')
			month = '05';
		else if(month == 'Июня')
			month = '06';
		else if(month == 'Июля')
			month = '07';
		else if(month == 'Авг')
			month = '08';
		else if(month == 'Сен')
			month = '09';
		else if(month == 'Окт')
			month = '10';
		else if(month == 'Ноя')
			month = '11';
		else if(month == 'Дек')
			month = '12';

		return getParam(day+'.'+month+'.'+ date.getFullYear(), null, null, null, replaceTagsAndSpaces, parseDate);
	}
	else
		AnyBalance.trace('Failed to parse date from ' + str);
}

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://my.lanet.ua/';
	var html = AnyBalance.requestGet(baseurl, g_headers);
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'login')
			return prefs.login;
		else if(name == 'pass')
			return prefs.password;
		return value;
	});
    html = AnyBalance.requestPost(baseurl + 'login.php#login', params, g_headers);

    if(!/client_info.php\?my_menu_selected=ex#my_menu/.test(html)){
        var error = getParam(html, null, null, /<td[^>]+class="form_error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /личный счет[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /Дополнительные услуги[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', /нехватка[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /&#8470; договора[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /тип подключения[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'paytill', /конец периода[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMoment);
    getParam(html, result, 'userName', /<td[^>]+class="cname"[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);


    AnyBalance.setResult(result);
}