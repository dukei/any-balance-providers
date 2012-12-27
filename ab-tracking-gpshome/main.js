/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о трекере из системы gpshome

Сайт оператора: http://gpshome.ru/
Личный кабинет: http://gpshome.ru/

*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://map.gpshome.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
        m:'users',
        login_submit:1
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/logout.php/.test(html)){
        var error = getParam(html, null, null, /alert\s*\(\s*'([^']*)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    var nowLocal = Math.round(new Date().getTime()/1000);
    html = AnyBalance.requestGet(baseurl + 'gh/grid.php?action=LOAD_UNITS&evt=' + nowLocal, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
 
    var obj = getParam(html, null, null, /<obj\s+([^>]*)>/i);
    if(!obj)
        throw new AnyBalance.Error('Не найдено ни одного трекера!');

    getParam(obj, result, 'odo', /\bo="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'lat', /\bla="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'long', /\blo="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'alt', /\bal="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'speed', /\bsp="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'course', /\bc="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'sat', /\bs="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, 'charge', /\bb="([^"]*)/i, replaceTagsAndSpaces, parseBalance); 
    getParam(obj, result, '__tariff', /\bn="([^"]*)/i, replaceTagsAndSpaces); 
    getParam(obj, result, 'name', /\bn="([^"]*)/i, replaceTagsAndSpaces); 

    if(AnyBalance.isAvailable('time')){
        var now = getParam(html, null, null, /<now>([\s\S]*)<\/now>/i, replaceTagsAndSpaces, parseBalance);
        //А теперь надо посчитать часовой пояс, исходя из now, переданном с сервера
        //Считаем, что часы на телефоне и на сервере расходятся не сильно
        diff = 0; //Локальное время - GMT + diff
        {
            var hoursNowInt = Math.floor(now/1800);
            var hoursNowFrac = now/1800 - hoursNowInt;
            var hoursLocalInt = Math.floor(nowLocal/1800);
            var hoursLocalFrac = nowLocal/1800 - hoursLocalInt;
            if(Math.abs(hoursNowFrac - hoursLocalFrac) >= 0.5) //Если показания расходятся больше, чем на 15 минут, то надо скорректировать показания получасов
                hoursNowInt += (hoursNowFrac > hoursLocalFrac ? 1 : -1);
            diff = ((hoursNowInt - hoursLocalInt)*1800);
            AnyBalance.trace('Часовой пояс определен как ' + diff/3600);
        }
        
        var time = getParam(obj, null, null, /\bfs="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        if(time){
            result.time = (time - diff)*1000;
            AnyBalance.trace('ГМТ время ' + new Date(result.time).toGMTString());
        }
    }

    AnyBalance.setResult(result);
}
