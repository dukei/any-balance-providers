/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Sixt

Сайт оператора: www.sixt.com
Личный кабинет: https://www.sixt.com/php/customerservice
*/

function getState(html){
    return getParam(html, null, null, /<input[^>]+name="STATE"[^>]*value="([^"]*)/i, null, html_entity_decode);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.sixt.com/php/customerservice";
    //Need to enter a country
    html = AnyBalance.requestGet(baseurl);

//    return makeCountries(html);

    html = AnyBalance.requestPost(baseurl, {
        ACTION:'login',
        view:'',
        STATE:getState(html),
        field2:prefs.login,
        field1:prefs.password
    });

    if(!/\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="sx-gc-error"[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Could not enter miles&more site. Is the site changed?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Status rentals[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'premium', /Rentals \(Premium rentals\)[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'left', /(\d+)\s+reservations left to reach the following status:/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'next', /reservations left to reach the following status:+([^<]*?)(?:\)|<)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /Card number:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<p[^>]+class="cards-nam"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, '__tariff', /<p[^>]+class="cards-nam"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

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
