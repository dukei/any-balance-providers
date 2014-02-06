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
function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)(?:руб|р\.)/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)(?:коп|к\.)/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance/minutes (' + val + ') from: ' + _text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://moskva.farpost.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(baseurl + 'sign?return=%2F', g_headers);

	html = AnyBalance.requestPost(baseurl + 'sign?return=%2F', {
        sign:prefs.login,
        password:prefs.password,
        radio:'sign'
    }, addHeaders({Referer: baseurl + 'sign?return=%2F'})); 

    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /sign_errors[^>]*>[^>]*>\s*([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /div[^>]*class="h1"[^>]*title=""[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, '__tariff', /Ваш номер пользователя[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}