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
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://www.s7.ru/';
	var baseurlLogin = 'https://cca.s7.ru/';
	
    var html = AnyBalance.requestPost(baseurlLogin + 'cas/login', {
        renew:true,
        auto:true,
        service:baseurl + 'home/priority/ffpAccount.dot',
        errorPage:baseurl + 'home/priority/ffpLoginError.dot',
        hiddenText:'',
        username:prefs.login,
        password:prefs.password
    }, g_headers);
	
    var params = createFormParams(html, function(params, str, name, value){
        if(/type="(submit|reset)"/i.test(str))
            return;
        if(name == 'username')
            return prefs.login;
        if(name == 'password')
            return prefs.password;
        return value;
    });
	
    html = AnyBalance.requestPost(baseurlLogin + 'cas/login', params, addHeaders({Referer:'https://cca.s7.ru/cas/login'}));
	
	// Странно, но иногда требует дополнительных переходов, пока оставлю, вдруг пригодится
	/*AnyBalance.trace(html);
	var key = getParam(html, null, null, /(?:Нажмите|Click)\s*<a\s*href="([\s\S]*?)">(?:на ссылку|here)/i, null, null);
	if(!key)
		throw new AnyBalance.Error('Не нашли ссылку на редирект, тут что-то не так...');
	
	var href = '';
	if(/http/.test(key))
		href = key;
	else
		href = baseurl + 'home/priority/ffpAbout.dot' + key;
		
		
	AnyBalance.trace('Нашли линк ' + href);

	html = AnyBalance.requestGet(href, g_headers);*/
	
	//html = AnyBalance.requestGet(baseurl, g_headers);
	
    AnyBalance.trace(html);
    if(!/priority\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', />\s*(?:Мили|Miles):(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /<div[^>]+class="ffp_username"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    var cardNum = getParam(html, null, null, />\s*(?:Номер|Number):(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
    var status = getParam(html, null, null, /(?:Статус|Status):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	getParam(cardNum, result, 'cardnum');
	getParam(status, result, 'status');

	result.__tariff = status + ', №' + cardNum;	
	
    if(AnyBalance.isAvailable('qmiles', 'flights')){
        html = AnyBalance.requestGet(baseurl + 'home/priority/ffpMyMiles.dot');
        getParam(html, result, 'qmiles', /<td[^>]+class="balance"[^>]*>([\s\S]*?)(?:<\/td>|\/)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'flights', /<td[^>]+class="balance"[^>]*>[^<]*\/([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
