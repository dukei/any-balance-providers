/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.oldi.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'personal/status/', g_headers);

	html = AnyBalance.requestPost(baseurl + 'personal/status/index.php?login=yes', {
		AUTH_FORM:'Y',
		TYPE:'AUTH',
		backurl:'/personal/status/index.php',
		USER_LOGIN:prefs.login,
		USER_PASSWORD:prefs.password,
		Login:'Войти',
    }, addHeaders({Referer: baseurl + 'personal/status/'})); 

    if(!/logout=yes/i.test(html)){
        var error = getParam(html, null, null, /<[^>]*class="error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};

	var select = getParam(html, null, null, /<select\s+name="priceopt_RUB"[\s\S]*?<\/select>/i);
	var options = {};
	var selected = 0;
	if(select) {
		var match = /<option value="(\d+)"[^>]*>([^<]+)/ig.exec(select);
		var len = match.length;
		for (var i = 0; i < len; i++) {
			options[match[1]] = match[2];
			
			if(/selected/i.test(match[0])) 
				selected = match[1];
			
			match = /<option value="(\d+)"[^>]*>([^<]+)/ig.exec(select = select.replace(match[0], ''));
		}
	}
	
	var card = getParam(html, null, null, /var\s+card\s*=\s*"([^'"]+)"/i);
	if(card) {
		AnyBalance.trace('Нашли хэш карты, надо обновить данные...');
		
		html = AnyBalance.requestPost(baseurl + 'catalog/main_profile_upd_card_ajax.php', {
			CARD_NUMBER: card
		}, addHeaders({Referer: baseurl + 'personal/status/index.php?login=yes'})); 

		// parseFloat используется намеренно, т.к. value="1.11242e+06" что на самом деле значит 1 112 420
		getParam(html, result, 'suumazakazov', /Сумма заказов(?:[\s\S]*?<[^>]*>){1}[^>]*value="([\d]+)/i, replaceTagsAndSpaces, parseFloat);
		getParam(html, result, 'zakazy', /Количество заказов<\/span>(?:[\s\S]*?<[^>]*>){1}[^>]*value="([\d]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /#usercard[^(]+\(['"](\d+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'bonus', /#dbonus[^(]+\(['"](\d+)/i, replaceTagsAndSpaces, parseBalance);
		
		selected = getParam(html, null, null, /#priceopt_RUB[^(]+\(['"](\d+)/i);
	} else {
		// parseFloat используется намеренно, т.к. value="1.11242e+06" что на самом деле значит 1 112 420
		getParam(html, result, 'suumazakazov', /Сумма заказов, руб(?:[\s\S]*?<[^>]*>){2}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseFloat);
		getParam(html, result, 'zakazy', /Количество заказов[\s\S]*?Количество заказов<\/span>(?:[\s\S]*?<[^>]*>){1}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /№ карты покупателя(?:[\s\S]*?<[^>]*>){2}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'bonus', /Накоплено бонусов(?:[\s\S]*?<[^>]*>){2}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);		
	}
	
	// Выберем цену, после обновления данных она может измениться поэтому так заморочено сделано
	getParam(options[selected], result, 'price');
	
    AnyBalance.setResult(result);
}