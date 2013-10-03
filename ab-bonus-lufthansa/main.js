/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Lufthansa Miles and More

Сайт оператора: https://mobile.lufthansa.com/
Личный кабинет: https://mobile.lufthansa.com/mma/account.do
*/

var g_headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        'Connection':'keep-alive',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://mobile.lufthansa.com';
    //Need to enter a country
    var html = AnyBalance.requestGet(baseurl + "/hpg/cor.do?l=en", g_headers);
	//return makeCountries(html);

    var country = prefs.country || 'ZZ';
    var action = getParam(html, null, null, /action="(\/hpg\/cor.do[^"]*)/i, null, html_entity_decode);
    if(!action)
        throw new AnyBalance.Error('Can not find country form!');

    html = AnyBalance.requestPost(baseurl + action, {
        country: country,
        timezone: jstz.determine_timezone().name()
    }, g_headers);
	
    html = AnyBalance.requestPost(baseurl + "/hpg/login.do?l=en_RU&showOverlay=service_account&viewPortHeight=483", {
        user:prefs.login,
        pass:prefs.password,
        step:'search'
    }, g_headers);
	
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
	
    if(!/<div[^>]*>Award miles/i.test(html)) //Язык не всегда переключается с первого раза. Если баланс не нашли, переключаем силой
        html = AnyBalance.requestGet(baseurl + '/mma/account.do?l=en', g_headers);
	
    getParam(html, result, 'balance', /<div[^>]*>Award miles[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\D/ig, ''], parseBalance);
    getParam(html, result, 'qbalance', /<div[^>]*>Status miles[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\D/ig, ''], parseBalance);
    getParam(html, result, 'hon', /<div[^>]*>HON Circle miles[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\D/ig, ''], parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="[^"]*account_box[^>]*>(?:[\s\S]*?<br[^>]*>){2}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /<div[^>]*>Customer number:([^<]*)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'nextstatus', /To achieve (.*?) status, you still/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'nextstatusmiles', /To achieve (?:.*?) status, you still need (\d+) status miles/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nextfs', /To achieve (?:.*?) status, you still need (?:.*?)(\d+) flight segments/i, replaceTagsAndSpaces, parseBalance);
	
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
