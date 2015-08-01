/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'http://www.ulmart.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var byphone = /^\+\d+$/.test(prefs.login);

	if(/loginCaptcha/i.test(html)){
		var imgUrl = getParam(html, null, null, /<img[^>]+id="captchaImg"[^>]*src="\/([^"]*)/i, null, html_entity_decode);
		var img = AnyBalance.requestGet(baseurl + imgUrl, g_headers);
		var captcha = AnyBalance.retrieveCode('Введите код с картинки', img);
	}

	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
		'target': '/',
		'_csrf':getParam(html, null, null, /name="_csrf" content="([^"]+)/i),
		'enterby': byphone ? 'email' : 'phone',
        'phone':byphone ? prefs.login : '',
        'email':byphone ? '' : prefs.login,
        'j_password':prefs.password,
        'loginCaptcha': captcha
    }, addHeaders({Referer: baseurl + 'login'}));
	
    if(!/\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+(?:b-box_error|alert-danger)[^>]*>([\s\S]*?)(?:<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неправиль.*пароль/i.test(error));
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};
	
    getParam(html, result, 'fio', />\s*Личный кабинет(?:[^>]*>){7}\s*<div[^>]*class="dropdown[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'price', /цена(?:&nbsp;|\s)+(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="b-dropdown-popup__info"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<ul/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['subaccountall', 'subaccounts', 'balance'])){
		html = AnyBalance.requestGet(baseurl + 'cabinet/bonus', addHeaders({
			Referer: baseurl + 'cabinet?v=bonus', 
			'X-Requested-With':'XMLHttpRequest', 
			'X-CSRF-TOKEN': getParam(html, null, null, 
			/name="_csrf" content="([^"]+)/i)
		}));
		
		getParam(html, result, 'balance', /XXL-бонус:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'subaccounts', /вашей сети[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		
		var list = getParam(html, null, null, /(<ul>[\s\S]*?<\/ul>)\s*<\/div/i);
		if(list){
			var subaccountall = '';
			var li = sumParam(list, null, null, /<li[^>]*>[\s\S]*?<\/li>/ig);
			for(i=0; i< li.length; i++){
				subaccountall += getParam(li[i], null, null, null, replaceTagsAndSpaces, html_entity_decode) +'\n';
			}
			if(subaccountall)
				getParam(subaccountall, result, 'subaccountall');
		}
	}	
    AnyBalance.setResult(result);
}
