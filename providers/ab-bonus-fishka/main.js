/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function array_unique(arr) {
    var tmp_arr = new Array();
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] && tmp_arr.indexOf(arr[i]) < 0) {
            tmp_arr.push(arr[i]);
        }
    }
    return tmp_arr;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://myfishka.com/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'fishka-online/buy', g_headers);

    //Находим секретный параметр
    var csrf = getParam(html, /<meta[^>]*name="csrf-token"[^>]*content="([^"]*)/i, replaceHtmlEntities);
    if(!csrf) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    html = requestPostMultipart(baseurl + 'sign-in', [
    	['_csrf', csrf],
    	['SignInForm[scenario]', 'card'],
    	['SignInForm[card]', prefs.login],
    	['SignInForm[pin]', prefs.password],
    	['SignInForm[phone]', 'card'],
    	['SignInForm[pin]', prefs.password],
    	['SignInForm[email]', 'card'],
    	['SignInForm[pin]', prefs.password]
    ], addHeaders({
    	'X-Requested-With': 'XMLHttpRequest',
    	'X-CSRF-Token': csrf,
    	Referer: baseurl + 'fishka-online/buy'
    }));

    var json = getJson(html);

    if(!json.refresh){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, /<div[^>]+not-found[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(!error && json.replaces){
        	
        	error = array_unique(sumParam(json.replaces[0].data, /<div[^>]+help-block[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces)).join('\n');
        }
        if(error)
            throw new AnyBalance.Error(error, null, /парол|pin/i.test(error));
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'fishka-online/buy', addHeaders({
    	Referer: baseurl + 'fishka-online/buy'
    }));
	
    var result = {success: true};
    getParam(html, result, 'balance', /<[^>]+available-balls[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'extra', /<[^>]+reserve-balls[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'out', /<[^>]+burn-balls[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<[^>]+user-balls[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('fio','licschet')){
        html = AnyBalance.requestGet(baseurl + 'cabinet/my-data', addHeaders({
    		Referer: baseurl + 'fishka-online/buy'
    	}));
        getParam(html, result, 'fio', /Прізвище та ім'я[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'licschet', /Oсновна картка[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}