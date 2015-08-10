/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию из игры Travian 

Operator site: http://ts2.travian.ru
Личный кабинет: http://ts2.travian.ru
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
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.server)
        prefs.server = 'ts2';

    if(!/^(ts1|ts2|ts3|ts4|ts6|ts8|tx3)$/i.test(prefs.server))
        throw new AnyBalance.Error('Неверный сервер!');

    var baseurl = "http://" + prefs.server + ".travian.ru/";
    AnyBalance.trace("Заходим на " + baseurl);

    var html = AnyBalance.requestPost(baseurl + 'dorf1.php', {
	name:prefs.login,
	password:prefs.password,
	// lowRes:1,
	s1:'Войти',
	w:'1920:1080',
	login:Math.floor(new Date().getTime()/1000)
    }, addHeaders({Referer: baseurl})); 

    if(!/logout.php/i.test(html)){
        var error = sumParam(html, null, null, /<div[^>]+class="[^"]*error[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, function(str){return html_entity_decode(str) || undefined}, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var villages = getParam(html, null, null, /<ul[^>]+id="villageListLinks"[^>]*>([\s\S]*?)<\/ul>/i);
    if(prefs.village){
        AnyBalance.trace('Попытаемся найти деревню, начинающуюся на ' + prefs.village);
        var idActive = getParam(villages, null, null, /<a[^>]+href="[^"]*newdid=(\d+)[^>]*class="active"[^>]*>/i);
        var id = getParam(villages, null, null, new RegExp('<a[^>]+href="[^"]*newdid=(\\d+)[^>]*>\\s*' + prefs.village, 'i'));
        if(!id)
            throw new AnyBalance.Error('Не удалось найти деревню с именем, начинающимся на ' + prefs.village);
        if(idActive != id)
            html = AnyBalance.requestGet(baseurl + 'dorf1.php?newdid=' + id, g_headers);
        else
            AnyBalance.trace('Нужная деревня уже активна');
    }

    getParam(html, result, '__tariff', /<span[^>]+id="villageNameField"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'fio', /<a[^>]+href="spieler.php\?uid=[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'gold', /<img[^>]+alt="Золото"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'silver', /<img[^>]+alt="Серебро"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wood', /<img[^>]+alt="Древесина"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wood_total', /<img[^>]+alt="Древесина"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>[^<]*?\/([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'clay', /<img[^>]+alt="Глина"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'clay_total', /<img[^>]+alt="Глина"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>[^<]*?\/([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'iron', /<img[^>]+alt="Железо"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'iron_total', /<img[^>]+alt="Железо"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>[^<]*?\/([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'weat', /<img[^>]+alt="Зерно"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'weat_total', /<img[^>]+alt="Зерно"[^>]*>\s*<span[^>]+class="value\s*"[^>]*>[^<]*?\/([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
