/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Ulmart

Сайт оператора: http://ulmart.ru
Личный кабинет: http://www.ulmart.ru/cabinet/
*/
var g_headers = {
	'Accept':'text/html, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'X-Requested-With':'XMLHttpRequest',
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'http://www.ulmart.ru/';
	
    var html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
        j_username:prefs.login,
        j_password:prefs.password,
        _spring_security_remember_me:''
    }, g_headers);

    if(!/\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="loginErrorDiv"[^>]*>([\s\S]*?)(?:Проверьте состояние|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true, subaccountall:''};
	
    getParam(html, result, 'balance', /class="title"[^>]*>XXL-Бонус[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<div[^>]+class="name"[^>]*>([\s\S]*?)(?:▼|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'price', /цена(?:&nbsp;|\s)+(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="b-dropdown-popup__info"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<ul/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['subaccountall', 'subaccounts'])){
		html = AnyBalance.requestGet(baseurl + 'cabinet/xxlBonus', addHeaders({Referer:'http://www.ulmart.ru/cabinet?v=bonus'}));
		
		getParam(html, result, 'subaccounts', /вашей сети[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		
		var list = getParam(html, null, null, /(<ul>[\s\S]*?<\/ul>)/i, replaceTagsAndSpaces, html_entity_decode);
		if(list){
			var li = sumParam(html, null, null, /<li[^>]*class="cl"[^>]*>[\s\S]*?<\/li>/ig);
			for(i=0; i< li.length; i++){
				result.subaccountall += getParam(li[i], null, null, null, replaceTagsAndSpaces, html_entity_decode) +'\n';
			}
		}
	}	
    AnyBalance.setResult(result);
}
