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
function getLastResponseHeader(name){
	var headers = AnyBalance.getLastResponseHeaders();
	for(var i=0; i<headers.length; ++i) {
		var header = headers[i];
			if(header[0] == name)
	        	return header[1];
	}
   	return false;
}
				
function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'http://www.nts.su/';
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'my/index.php/auth/login', {
        identity:prefs.login,
        password:prefs.password,
        submit:'Вперед!',
		//remember:'0'
    }, addHeaders({Referer: baseurl + 'my/index.php/auth/login'}));
	
	var refresh = getLastResponseHeader('Refresh');
	
	if(endsWith(refresh, baseurl+'my/index.php/')){
		AnyBalance.trace('ok');
	}else
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте Ваш логин или пароль');
	
	// запрашиваем иднекс
	html = AnyBalance.requestGet(baseurl + 'my/index.php', addHeaders({Referer: baseurl + 'my/index.php/auth/login'}));
	
	if(!/my\/auth\/logout/i.test(html))
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте Ваш логин или пароль');
	
    //Раз мы здесь, то мы успешно вошли в кабинет
    var result = {success: true};
	getParam(html, result, 'balance', /Остаток[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Номер счета[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, null);
	getParam(html, result, 'agreement', /Номер договора[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, null);
	getParam(html, result, 'monthly_fee', /ежемесячная абон. плата[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, parseBalance);	
	getParam(html, result, 'credit', /Кредит[\s\S]*?table_cell">\s*([\s\S]*?)\s*<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /short_info[\s\S]{1,50}<p>\s*([\s\S]*?)\s*<\/p>/i, replaceTagsAndSpaces, null);
    //Возвращаем результат
    AnyBalance.setResult(result);
}
