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

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = "https://lk.avtomir.ru/";
	
    var html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
	
    html = AnyBalance.requestPost(baseurl + "personal/?login=yes", [
    	['AUTH_FORM', 'Y'],
    	['TYPE', 'AUTH'],
    	['backurl', '/personal/index.php'],
    	['USER_LOGIN', prefs.login],
    	['USER_PASSWORD', prefs.password],
		['USER_REMEMBER','Y']
    ], addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': baseurl + 'personal/'}));
	
    if(!/\?logout=yes/i.test(html)){
        var error = getParam(html, null, null, [/<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i,
			/alert-error([^>]*>){2}/i,
			/<h2[^>]+style="color:\s*#933"[^>]*>([\s\S]*?)<\/h2>/i], replaceTagsAndSpaces);
		
        if(error)
            throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	
    var privateCabHtml = getElement(html, /<div[^>]+class="b_private_cab_info"[^>]*>/i);

    if (!privateCabHtml) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?');
    }

    sumParam(privateCabHtml, result, 'balance', /<span[^>]+card_amount[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(privateCabHtml, result, 'number', /Карта №:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(privateCabHtml, result, 'status', /Статус карты:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(privateCabHtml, result, '__tariff', /Статус карты:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(privateCabHtml, result, 'phone', /Мобильный телефон:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceNumber);
	getParam(privateCabHtml, result, 'fio', /ФИО:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	
    html = AnyBalance.requestGet(baseurl + "personal/transactions/", g_headers);

    var divContentHtml = getElement(html, /<div[^>]+id="content"/i);
    var tbodyHtml = getElement(divContentHtml, /<tbody/i);
    var trHtml = getElement(tbodyHtml, /<tr/i);
    var tdArray = getElements(trHtml, /<td/ig);

    getParam(tdArray[0], result, 'dateLast', null, replaceTagsAndSpaces, parseDate);
    getParam(tdArray[1], result, 'regionLast', null, replaceTagsAndSpaces);
    getParam(tdArray[2], result, 'typeLast', null, replaceTagsAndSpaces);
    getParam(tdArray[3], result, 'balanceLast',  null, replaceTagsAndSpaces, parseBalance);
//  AB.getParam(tdArray[3], result, ['sumCurrencyLast', 'sumLast'],  null, AB.replaceTagsAndSpaces, AB.parseCurrency);
//  AB.getParam(tdArray[4], result, 'balanceLast',  null, AB.replaceTagsAndSpaces, AB.parseBalance);
	
    AnyBalance.setResult(result);
}