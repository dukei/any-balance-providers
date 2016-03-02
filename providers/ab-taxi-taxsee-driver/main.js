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
    var baseurl = "https://driver.taxsee.com/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
    var params = {
        'LoginForm[username]': prefs.login,
        'LoginForm[password]': prefs.password,
        'yt0': ''
    };
	
	html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({Referer: baseurl}));

    if (!/\/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /alert-danger[^>]*>(?:[^>]*>){2}([^<]+)/i, AB.replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, null, /введены неправильно/i.test(error));
        }

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, '__tariff', /"Profile\[C_FIO\]"[^>]*value="([^"]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(result.__tariff, result, 'fio');
    AB.getParam(html, result, 'balance', /"Profile\[C_SALDO\]"[^>]*value="([^"]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AnyBalance.setResult(result);
}