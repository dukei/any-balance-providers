/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
	Connection: 'keep-alive'
};

var g_baseurl = "https://narod.nskes.ru/";

function login(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(g_baseurl + 'dologin.php', {
        login:prefs.login,
        password:prefs.password
    }, g_headers);

    //Выход из кабинета
    if(!/\?logout=1/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /неверный логин/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер счета или пароль?');
    }
    
    return html;
}

function processInfo(html, result){
    getParam(html, result, 'fio', /<a[^>]+href="[^"]*userinfo.php"[^>]*>([^<]*)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
}

function processAccounts(html, result){
    var accs = getElements(html, /<div[^>]+class="[^"]*dataItem[^>]*/ig);
    if(accs.length)
    	result.accounts = [];

    for(var i=0; i<accs.length; ++i){
    	var id = getParam(accs[i], null, null, /<div[^>]+class="title"[\s\S]*?\/\s+ЛС([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    	var name = getParam(accs[i], null, null, /<div[^>]+class="title"[\s\S]*?<\/div>/i, [/Новосибирск\s*,?/i, '', replaceTagsAndSpaces], html_entity_decode);
    	var a = {__id: id, __name: name};
    	if(__shouldProcess('accounts', a)){
    		processAccount(accs[i], a);
    	}

    	result.accounts.push(a);
    }
}

function processAccount(html, result){
   	getParam(html, result, 'accounts.address', /<div[^>]+class="title"[\s\S]*?(?:<small|<\/div>)/i, [/Новосибирск\s*,?/i, '', replaceTagsAndSpaces], html_entity_decode);
   	getParam(result.__id, result, 'accounts.licschet');

    var tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<b[^>]*>\s*Электроэнергия[\s\S]*?<\/tr>/i);
    if(!tr) {
        AnyBalance.trace('Услуга Электроэнергия не найдена');
	} else {
		getParam(tr, result, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, 'accounts.pen', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [/<span[^>]+class="pl-negative"[^>]*>/ig, '-', replaceTagsAndSpaces], parseBalance);
		getParam(tr, result, 'accounts.indication', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	}

    tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<b[^>]*>\s*Отопление[\s\S]*?<\/tr>/i);
    if(!tr) {
        AnyBalance.trace('Услуга Отопление не найдена');
    } else {
		getParam(tr, result, 'accounts.balance_otop', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, 'accounts.pen_otop', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [/<span[^>]+class="pl-negative"[^>]*>/ig, '-', replaceTagsAndSpaces], parseBalance);
	}

    tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<b[^>]*>\s*Горячая вода[\s\S]*?<\/tr>/i);
    if(!tr) {
        AnyBalance.trace('Услуга Горячая вода не найдена');
	} else {
		getParam(tr, result, 'accounts.balance_gor', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tr, result, 'accounts.pen_gor', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, [/<span[^>]+class="pl-negative"[^>]*>/ig, '-', replaceTagsAndSpaces], parseBalance);
	}
}
