/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'http://www.nts.su/';
    AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'my/index.php/auth/login', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'my/index.php/auth/login', {
        identity:prefs.login,
        password:prefs.password,
        submit:'Вперед!',
    }, addHeaders({Referer: baseurl + 'my/index.php/auth/login'}));
	
	// запрашиваем иднекс
	html = AnyBalance.requestGet(baseurl + 'my/index.php', addHeaders({Referer: baseurl + 'my/index.php/auth/login'}));
	
	if(!/my\/auth\/logout/i.test(html))
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте Ваш логин или пароль');
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Номер счета[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, null);
	getParam(html, result, 'agreement', /Номер договора[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, null);
	getParam(html, result, 'monthly_fee', /ежемесячная абон. плата[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, parseBalance);	
	getParam(html, result, 'credit', /Кредит[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /short_info[\s\S]{1,50}<p>\s*([\s\S]*?)\s*<\/p>/i, replaceTagsAndSpaces, null);
	
    try {
    	var found = /getCards[^<]*?data:\s*\{[\D]*(\d+)\s*[\D]*(\d+)\s*[\D]*(\d+)\s*'[^']*'([^']*)/i.exec(html);
    	if (found) {
    		html = AnyBalance.requestPost(baseurl + 'my/index.php/ajax/getCards', {
    			subsId: found[1],
    			parentId: found[2],
    			acNum: found[3],
    			bill: found[4]
    		}, g_headers);
			
    		getParam(html, result, '__tariff', />Тарифный план(?:[\s\S]*?<tr[^>]*>){2}(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    	}
    } catch (e) {}
    //Возвращаем результат
    AnyBalance.setResult(result);
}
