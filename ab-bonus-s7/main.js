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
	
    var html = AnyBalance.requestPost(baseurl + 'dotCMS/priority/ajaxLogin', {
        dispatch: 'login',
        username: prefs.login,
        password: prefs.password
    }, addHeaders({ Referer: baseurl }));
	
	htmlJson = AnyBalance.requestGet(baseurl + 'dotCMS/priority/ajaxProfileService?dispatch=getUserInfo', addHeaders({
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(htmlJson);	
	
    if(json.stc != 200){
		var error = getParam(html, null, null, /"error_block"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));

		try{ error = getJson(html).errors.join('. ') }catch(e){ }
		if(error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));	

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}
	
	
    var result = {success: true};
	
    getParam(json.c.milesBalance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.c.firstName + ' ' + json.c.lastName, result, 'userName', null, replaceTagsAndSpaces);
	getParam(json.c.qMiles+'', result, 'qmiles', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.c.qFlights+'', result, 'flights', null, replaceTagsAndSpaces, parseBalance);
	
    var cardNum = json.c.cardNumber;
	var cardType = json.c.cardLevel;
    //var status = getParam(html, null, null, /(?:Статус|Status):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
	getParam(cardNum, result, 'cardnum');
	getParam(cardType, result, 'type');
	
	result.__tariff = cardType + ', №' + cardNum;	
	
    /*if(AnyBalance.isAvailable('qmiles', 'flights')){
        html = AnyBalance.requestGet(baseurl + 'home/priority/ffpMyMiles.dot');
		
        //getParam(html, result, 'qmiles', /<td[^>]+class="balance"[^>]*>([\s\S]*?)(?:<\/td>|\/)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'flights', /<td[^>]+class="balance"[^>]*>[^<]*\/([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }*/
    AnyBalance.setResult(result);
}