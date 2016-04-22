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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://cabinet.taximaxim.ru/";

//    createCityList();

    AnyBalance.setDefaultCharset('utf-8'); 
    var html = AnyBalance.requestPost(baseurl + 'webapp/index.php?r=clientCabinet/login', {
    	'NewLoginForm[city]':prefs.city || '6',
        'NewLoginForm[phone]':prefs.login,
        'NewLoginForm[password]':prefs.password,
        'NewLoginForm[rememberMe]':0,
        'NewLoginForm[uuid]': hex_md5(prefs.login),
        yt0:''
    }, addHeaders({Referer: baseurl})); 

    if(!/clientCabinet\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+alert-error[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\s+/g, ' ']);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
	
	getParam(html, result, 'discont', /"Discont":\s*([^,{]*)/i, null, parseBalance);
	
	var json = getJsonObject(html, /user_profile\s*=/);
	getParam(json.FIO, result, 'fio');
	getParam(json.FIO, result, '__tariff');

	html = AnyBalance.requestGet(baseurl + 'webapp/index.php?r=clientCabinet/accounts', g_headers);
	var accid = getParam(html, null, null, /account="([^"]*)/i, replaceHtmlEntities);
	if(!accid){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Лицевой счет не найден. У вас нет лицевого счета или сайт изменен');
	}

	html = AnyBalance.requestGet(baseurl + 'webapp/index.php?r=ClientCabinet/AjaxGate&target=%2FServices%2FPublic.svc%2FAccount&id=' + accid + '&_=' + new Date().getTime(), g_headers);
    json = getJson(html);
    getParam(json.Balance, result, 'balance');
    getParam(json.PayCode, result, 'licschet');

    AnyBalance.setResult(result);
}

function createCityList(){
	var html = AnyBalance.requestGet('http://cabinet.taximaxim.ru/webapp/index.php?r=clientCabinet/login', g_headers);
	var list = getElement(html, /<div[^>]+id="cityList"[^>]*>/i);
	var items = getElements(list, /<li[^>]*>/ig);

	var values = [];
	var names = [];
	for(var i=0; i<items.length; ++i){
		var it = items[i];
		values.push(getParam(it, null, null, /value="([^"]*)/i, replaceHtmlEntities));
		names.push(getParam(it, null, null, null, replaceTagsAndSpaces));
	}

	AnyBalance.setResult({
		success: true,
		entries: names.join('|'),
		entryValues: values.join('|')
	});
}
