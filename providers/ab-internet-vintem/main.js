/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31',
	'Host':'stat.vintem.ru'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://stat.vintem.ru/";
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	AnyBalance.setDefaultCharset('iso-8859-1');
	
    var html = AnyBalance.requestPost(baseurl + '/utm5_web_php/', {
        login:prefs.login,
        password:prefs.password,
        cmd:'login'
    }, addHeaders({Referer: baseurl + 'utm5_web_php'})); 
	
    if(!/zz_logout/i.test(html)){
        var error = getParam(html, null, null, /(?:[\s\S]*?<BR[^>]*>){2}([\s\S]*?)<BR>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'fio', /<td[^>]*>ФИО<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account', /<td[^>]*>Основной лицевой счет<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'id', /<td[^>]*>ID<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /<td[^>]*>Баланс<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balanceCredit', /<td[^>]*>Кредит<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    html = AnyBalance.requestGet(baseurl + 'utm5_web_php/?module=41_services', g_headers);
	
    getParam(html, result, '__tariff', /<td[^>]*>Имя тарифа<\/td>(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);    
	// Попытаемся высчитать дату отключения
	if(isAvailable('deadline')){
		var monthlyFee = getParam(html, null, null, /<td[^>]*>Абонентская плата<\/td>(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, null, parseBalance);
		var date = new Date();
		// Они просто на 30 делят и не парятся
		var dayCount = 30;//32 - new Date(date.getYear(), date.getMonth(), 32).getDate();
		// Теперь мы знаем сумму абонентской платы и количество дней в месяце, так что можем посчитать дату отключения
		if(result.balance) {
			result.deadline = date.getTime() + (86400000 * Math.round(result.balance/(monthlyFee/dayCount)));
		}
	}
    AnyBalance.setResult(result);
}
