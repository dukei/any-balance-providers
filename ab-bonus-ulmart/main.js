/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'X-Requested-With':'XMLHttpRequest',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'http://www.ulmart.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'login?target=/', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
		'_csrf':getParam(html, null, null, /name="_csrf" content="([^"]+)/i),
        'email':prefs.login,
        'j_password':prefs.password,
        'target':'/',
		'enterby':'email'
    }, addHeaders({Referer: baseurl + 'login?target=/'}));
	
    if(!/\/logout/.test(html)){
        // var error = getParam(html, null, null, /<div[^>]+id="loginErrorDiv"[^>]*>([\s\S]*?)(?:Проверьте состояние|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
        // if(error)
            // throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};
	
    getParam(html, result, 'fio', />Личный кабинет<(?:[\s\S]*?<div[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'price', /цена(?:&nbsp;|\s)+(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="b-dropdown-popup__info"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<ul/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['subaccountall', 'subaccounts', 'balance'])){
		html = AnyBalance.requestGet(baseurl + 'cabinet/bonus', addHeaders({Referer:'http://www.ulmart.ru/cabinet?v=bonus'}));
		
		getParam(html, result, 'balance', /XXL-Бонус(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'subaccounts', /вашей сети[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		
		var list = getParam(html, null, null, /(<ul>[\s\S]*?<\/ul>)/i, replaceTagsAndSpaces, html_entity_decode);
		if(list){
			var subaccountall = '';
			var li = sumParam(html, null, null, /<li[^>]*class="cl"[^>]*>[\s\S]*?<\/li>/ig);
			for(i=0; i< li.length; i++){
				subaccountall += getParam(li[i], null, null, null, replaceTagsAndSpaces, html_entity_decode) +'\n';
			}
			if(subaccountall)
				getParam(subaccountall, result, 'subaccountall');
		}
	}	
    AnyBalance.setResult(result);
}
