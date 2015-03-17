/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
	Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://narod.nskes.ru/";

    var html = AnyBalance.requestPost(baseurl + 'dologin.php', {
        login:prefs.login,
        password:prefs.password
    }, g_headers);

    //Выход из кабинета
    if(!/\?logout=1/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер счета или пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /<a[^>]+href="[^"]*userinfo.php"[^>]*>([^<]*)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    var tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<b[^>]*>\s*Электроэнергия[\s\S]*?<\/tr>/i);
    if(!tr) {
        AnyBalance.trace('Услуга Электроэнергия не найдена');
	} else {
		getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, 'pen', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [/<span[^>]+class="pl-negative"[^>]*>/ig, '-', replaceTagsAndSpaces], parseBalance);
		getParam(tr, result, 'indication', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){5}[\s\S]*?<span[^>]*class=['"]org['"][^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		//getParam(tr, result, 'lastpaydate', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);		
	}

    tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<b[^>]*>\s*Отопление[\s\S]*?<\/tr>/i);
    if(!tr) {
        AnyBalance.trace('Услуга Отопление не найдена');
    } else {
		getParam(tr, result, 'balance_otop', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, 'pen_otop', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [/<span[^>]+class="pl-negative"[^>]*>/ig, '-', replaceTagsAndSpaces], parseBalance);
		//getParam(tr, result, 'lastpaydate_otop', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	}

    tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<b[^>]*>\s*Горячая вода[\s\S]*?<\/tr>/i);
    if(!tr) {
        AnyBalance.trace('Услуга Горячая вода не найдена');
	} else {
		getParam(tr, result, 'balance_gor', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, 'pen_gor', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [/<span[^>]+class="pl-negative"[^>]*>/ig, '-', replaceTagsAndSpaces], parseBalance);
		//getParam(tr, result, 'lastpaydate_gor', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);		
	}

    AnyBalance.setResult(result);
}
