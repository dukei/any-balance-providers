/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection':'keep-alive',
};

function main()
{
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://cp.jino.ru/cpanel';
    AnyBalance.setDefaultCharset('utf-8'); 
	moment.lang('ru');
	
    var html = AnyBalance.requestPost(baseurl, 
	{
		auth:'true',
		login:prefs.login,
		next:'/',
		password:prefs.password,
    }, g_headers); 

    if(!/logout=true/i.test(html))
	{
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /class="error_msg msg">([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс[\s\S]*?<strong[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Истекает[\s\S]*?">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateMoment);
	getParam(html, result, 'state', /Статус[\S\s]*?succ">\s*([\S\s]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	// теперь пойдем посмотрим дисковое прострнство
	html = AnyBalance.requestGet(baseurl + '?area=services_srv&srv=disk');
	
	getParam(html, result, 'storage_percent', /Использование услуги:[\s\S]{1,80}width([\s\S]*?)%/i, null, parseBalance);
	getParam(html, result, 'storage_used', /Дисковое пространство[\s\S]{1,300}label">([\s\S]*?)</i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'monthly_fee', /Оплата в месяц[\s\S]*?<strong>([\s\S]*?)<\/strong>/i, null, parseBalance);
	getParam(html, result, 'daily_fee', /Оплата в сутки[\s\S]*?<strong>([\s\S]*?)<\/strong>/i, null, parseBalance);
	
    //Возвращаем результат
    AnyBalance.setResult(result);
}
function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}
