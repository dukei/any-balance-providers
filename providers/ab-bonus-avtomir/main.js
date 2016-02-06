/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = "http://lk.avtomir.tmweb.ru/";
	
    var html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
	
    html = AnyBalance.requestPost(baseurl + "personal/?login=yes", [
    	['AUTH_FORM', 'Y'],
    	['TYPE', 'AUTH'],
    	['backurl', '/personal/index.php'],
    	['USER_LOGIN', prefs.login],
    	['USER_PASSWORD', prefs.password],
    	['Login', 'Войти']
    ], AB.addHeaders({'Content-Type': 'application/x-www-form-urlencoded',Referer: baseurl + 'personal/'}));
	
    if(!/\?logout=yes/i.test(html)){
        var error = AB.getParam(html, null, null, [/<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i,
			/alert-error([^>]*>){2}/i,
			/<h2[^>]+style="color:\s*#933"[^>]*>([\s\S]*?)<\/h2>/i], AB.replaceTagsAndSpaces);
		
        if(error)
            throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	
    var privateCabHtml = AB.getElement(html, /<div[^>]+class="[^"]*?b_private_cab_info/i);
    
    if (!privateCabHtml) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?');
    }

    AB.getParam(privateCabHtml, result, 'fio', /<div[^>]+class="b_private_cab_info"[^>]*>\s*<p[^>]*>([\s\S]*?)<br>/i, AB.replaceTagsAndSpaces);
    AB.sumParam(privateCabHtml, result, 'balance', /Общая сумма баллов([\s\S]*?)<br/ig, AB.replaceTagsAndSpaces, AB.parseBalance, AB.aggregate_sum);
    AB.getParam(prefs.login, result, 'number');
	
    html = AnyBalance.requestGet(baseurl + "personal/transactions/", g_headers);

    var divContentHtml = AB.getElement(html, /<div[^>]+id="content"/i);
    var tbodyHtml = AB.getElement(divContentHtml, /<tbody/i);
    var trHtml = AB.getElement(tbodyHtml, /<tr/i);
    var tdArray = AB.getElements(trHtml, /<td/ig);

    AB.getParam(tdArray[0], result, 'dateLast', null, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(tdArray[1], result, 'regionLast', null, AB.replaceTagsAndSpaces);
    AB.getParam(tdArray[2], result, 'typeLast', null, AB.replaceTagsAndSpaces);
    AB.getParam(tdArray[3], result, 'sumLast',  null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(tdArray[3], result, ['sumCurrencyLast', 'sumLast'],  null, AB.replaceTagsAndSpaces, AB.parseCurrency);
    AB.getParam(tdArray[4], result, 'balanceLast',  null, AB.replaceTagsAndSpaces, AB.parseBalance);
	
    AnyBalance.setResult(result);
}