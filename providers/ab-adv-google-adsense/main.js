/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Баланс на Google Adwords.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках e-mail и пароль.
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

function main() {
    var result = {
        success: true
    }, html;

    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    googleLogin(prefs);
    html = AnyBalance.requestGet('https://www.google.com/adsense/m/?hl=ru', g_headers);
	html = reenterPasswordIfGoogleNeeds(html, prefs);

    var clientVersion = getParam(html, null, null, /'([a-f0-9]{16,})',\s*ads.adsense.lightfe.home.loadData/i);
    if(!clientVersion)
        AnyBalance.Error('Can not find Client-Version param!');
    AnyBalance.trace('Client-Version: ' + clientVersion);

    html = AnyBalance.requestPost('https://www.google.com/adsense/m/data/home?hl=ru', {}, addHeaders({
		'X-Lightfe-Auth': '1', 
		'Client-Version': clientVersion,
        'Referer': 'https://www.google.com/adsense/m/?hl=ru'
    }));

    var json = getJson(replaceAll(html, [/^\)\]\}\'/, '']));

    if(!json.earnings)
       throw new AnyBalance.Error('Google returned no earnings.');

    getParam(json.earnings[2][2], result, 'balance', /(.*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.earnings[2][2], result, 'currency', /(.*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(json.earnings[0][2], result, 'today', /(.*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.earnings[1][2], result, 'yesterday', /(.*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.earnings[3][2], result, 'prevmonth', /(.*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

