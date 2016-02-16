/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.lukoil-garant.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(/^\d{11}$/.test(prefs.login), 'Не верный формат СНИЛС. Укажите 11 цифр без тире и пробелов, например 01234567891!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    var form = getElement(html, /<form[^>]*?name[^>]{1,6}?form/i);
    var params = createFormParams(form, function(params, str, name, value) {
        if(/login/i.test(name)) {
            return prefs.login;
        }
        if(/password/i.test(name)) {
            return prefs.password;
        }
        return value;
    });
    
    AnyBalance.sleep(2000);
    html = AnyBalance.requestPost(baseurl, params, addHeaders({
        Referer: baseurl,
        Origin: 'https://lk.lukoil-garant.ru'
    }));
    
    if (!/logout/.test(html)) {
        var error = getElement(getElement(html, /<div[^>]*?error/i), /<span[^>]*?mess/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, false, /парол|Проверьте\s+правильность|не\s+найден/i.test(error));
        }
        AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    var GraphDataMatch = /var\s+GraphData\s+=\s+(\{[\s\S]+?\})\s*;/.exec(html);
    var GraphData = AB.getJsonEval(GraphDataMatch[1]);
    
    getParam(GraphData.StartNPO.defaultValue, result, 'balancenpo');
    getParam(GraphData.StartNCHTP.defaultValue, result, 'balancench');
    getParam(GraphData.StartNPO.defaultValue + GraphData.StartNCHTP.defaultValue + GraphData.StartDSV.defaultValue, result, 'balance');
    
    getParam(getElement(html, /<a\s[^>]*?message_link/, replaceTagsAndSpaces, parseBalance), result, 'messages');

    if (AnyBalance.isAvailable('account')) {
        html = AnyBalance.requestGet(baseurl + 'ru/savings/pension/', g_headers);
        getParam(html, result, 'account', /Номер\s+договора:?\s*<span[^>]*>([^<]+)/i, replaceTagsAndSpaces);
    }
	
    AnyBalance.setResult(result);
}

