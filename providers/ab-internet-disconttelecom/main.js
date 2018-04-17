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

    var baseurl = "http://discounttelecom.ru/";
    AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = {
        'form-selects': {},
        'contract': prefs.login,
        'pass': prefs.password
    };

    var postHtml = AnyBalance.requestPost(
        baseurl + 'scripts/WSDL-AUTH.php',
        {
            formdata: JSON.stringify(params)
        },
        addHeaders({
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': baseurl,
            'X-Requested-With': 'XMLHttpRequest'
        })
    );
    var res = getJson(postHtml);

    if (/success/i.test(res.mess) && res.redirect) {
    	try{
        	html = AnyBalance.requestGet(res.redirect);
        }catch(e){
        	var loc = getParam(res.redirect, null, null, /return=([^&]*)/);
        	var url = joinUrl(baseurl, loc);
        	AnyBalance.trace('Говносайт содержит пробелы в редиректе. Придется придумывать обход. Переадресуем явно на ' + url);
        	html = AnyBalance.requestGet(url);
        }
    }

	html = AnyBalance.requestGet('https://lk.diskonttelecom.ru/cabinet/account/', g_headers);

    if(!/Выйти/i.test(html)){
        if (/error/i.test(res.mess) && res.redirect) {
            throw new AnyBalance.Error(res.redirect, null, /(?:неверный номер|пароль)/i.test(res.redirect));
        }

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте Ваш логин и пароль');
    }

    var result = {success: true};
	getParam(html, result, 'account', /Договор[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние лицевого счета[\s\S]*?([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Из них [\s\S]*?([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
