var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://www.nsk.elektra.ru/cabinet/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'index.php?login=yes', {
		AUTH_FORM:'Y',
		TYPE:'AUTH',
		backurl:'/cabinet/index.php',
		USER_LOGIN:prefs.login,
		USER_PASSWORD:prefs.password,
		Login:'(unable to decode value)'
    }, addHeaders({Referer: baseurl + 'index.php'})); 

    if(!/\/cabinet\/logout.php/i.test(html)){
        var error = getParam(html, null, null, /class="errortext"[^>]*[\s\S]+?([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль./i.test());
        }
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	
	getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['fio','address']))
	{
    getParam(html, result, 'fio', /Собственник \(наниматель\)(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'address', /Адрес[<](?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
	if(isAvailable(['last_bill_period', 'last_bill_sum']))
	{	
	html = AnyBalance.requestGet(baseurl + 'schet.php', g_headers);
    getParam(html, result, 'last_bill_period', /tr class="fill fi"(?:[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'last_bill_sum', /tr class="fill fi"(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(isAvailable(['last_pay_date', 'last_pay_sum']))
	{
	html = AnyBalance.requestGet(baseurl + 'oplata.php', g_headers);
    getParam(html, result, 'last_pay_date', /tr class="fill fi"(?:[^>]*>){12}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_pay_sum', /tr class="fill fi"(?:[^>]*>){14}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(isAvailable(['last_ind_date', 'last_ind_day', 'last_ind_ppic', 'last_ind_night']))
	{
	html = AnyBalance.requestGet(baseurl + 'send_display.php', g_headers);
	getParam(html, result, 'last_ind_date', /tr class="fill fi"(?:[^>]*>){22}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_ind_day', /tr class="fill fi"(?:[^>]*>){26}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_ind_ppic', /tr class="fill fi"(?:[^>]*>){28}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_ind_night', /tr class="fill fi"(?:[^>]*>){30}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}
