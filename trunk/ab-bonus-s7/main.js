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
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://www.s7.ru/';
	var baseurlLogin = 'https://cca.s7.ru/';
	
    var html = AnyBalance.requestPost(baseurl + 'dotCMS/priority/newLogin', {
        renew:true,
        auto:true,
        service:baseurl + 'home/priority/ffpAccount.dot',
        errorPage:baseurl + 'home/priority/ffpLoginError.dot',
        hiddenText:'',
        username:prefs.login,
        password:prefs.password
    }, g_headers);
	
    if(!/priority\/logout|"ffp_logout"/.test(html)){
		var error = getParam(html, null, null, /"error-msg"([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));
		
		AnyBalance.trace(html);
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