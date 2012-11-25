/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Bakcell (Азербайджан).

Сайт оператора: http://www.bakcell.com
Личный кабинет: http://www.bakcell.com/ru/login
*/

var g_headers = {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'};

function getToken(html){
    return getParam(html, null, null, /<input[^>]*name="authenticity_token"[^>]*value="([^"]*)/i, null, html_entity_decode);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var lang = prefs.lang || 'ru';
    var baseurl = "http://www.bakcell.com/" + lang + "/login";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    html = AnyBalance.requestPost(baseurl, {
	utf8:'✓',
	authenticity_token:getToken(html),
	'web_user_session[username]':prefs.login,
	'web_user_session[password]':prefs.password
    }, g_headers);

//    AnyBalance.trace(html);
    
    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*errorExplanation[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }
    
    var result = {success: true};
    getParam(html, result, 'sms_left', /(?:Оставшийся лимит внесетевых SMS отправок на сегодня|Bu günə qalan əlavə şəbəkəxarici SMS sayı|Remaining off-net SMS limit for today is):([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sms_in_left', /(?:Оставшийся лимит внутрисетевых SMS отправок на сегодня|Bu günə qalan əlavə şəbəkədaxili SMS sayı|Remaining on-net SMS limit for today is):([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    result.__tariff = prefs.login;

    AnyBalance.setResult(result);
}
