/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Lufthansa Miles and More

Сайт оператора: https://mobile.lufthansa.com/
Личный кабинет: https://mobile.lufthansa.com/mma/account.do
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://mobile.lufthansa.com";
    //Need to enter a country
    html = AnyBalance.requestGet(baseurl + "/hpg/cor.do?l=en_US");

//    return makeCountries(html);

    var country = prefs.country || 'ZZ';
    var action = getParam(html, null, null, /action="(\/hpg\/cor.do[^"]*)/i, null, html_entity_decode);
    if(!action)
        throw new AnyBalance.Error('Can not find country form!');

    var sid = getParam(action, null, null, /jsessionid=([^\?;&]+)/i); 

    html = AnyBalance.requestPost(baseurl + action, {
        country: country,
        timezone: jstz.determine_timezone().name()
    });

    var html = AnyBalance.requestPost(baseurl + "/mma/account.do;jsessionid=" + sid + "?l=en_US", {
        user:prefs.login,
        pass:prefs.password,
        step:'search'
    });

    if(!/step=logout/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*class="feedback_neg"[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        var message = getParam(html, null, null, /<h1>Miles[\s\S]*?More[\s\S]*?Message[\s\S]*?<\/h1>[\s\S]*?<div[\s\S]*?>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(message)
            throw new AnyBalance.Error(message);
        throw new AnyBalance.Error('Could not enter miles&more site. Is the site changed?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<td[^>]*>Award miles[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'qbalance', /<td[^>]*>Status miles[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<td[^>]*>Status[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /<td[^>]*>Customer number[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function makeCountries(html){
    var result = {success: true};
    
    var countries = sumParam(html, null, null, /(<option[^>]+value="\w+"[^>]*>[^<]*<\/option>)/ig);
    var codes = [], names = [];
    for(var i=0; i<countries.length; ++i){
        codes[codes.length] = getParam(countries[i], null, null, /value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
        names[names.length] = getParam(countries[i], null, null, /<option[^>]*>([^<]*)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    result.codes = codes.join('|');
    result.names = names.join('|');
    AnyBalance.setResult(result);
}
