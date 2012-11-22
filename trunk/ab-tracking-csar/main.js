/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию из системы Цезарь-Сателлит

Сайт оператора: http://csat.ru
Личный кабинет: http://cp.csat.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function myGetJson(html){
    var json = getJson(html);
    if(!json.d){
        AnyBalance.trace('Отсутствует поле d: ' + html);
        throw new AnyBalance.Error('Сервер вернул неверный ответ. Проблемы на сайте или сайт изменен.');
    }
    return getJson(json.d);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://cp.csat.ru/";

    var html = AnyBalance.requestGet(baseurl + 'Login.aspx', g_headers);

    html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        __EVENTVALIDATION:getEventValidation(html),
        TimeOffSet:-(new Date()).getTimezoneOffset(),
        checkJS:1,
        Text1:prefs.login,
        Password1:prefs.password,
        Button1:'Ok'
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/BtnExit_Click/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]*color:\s*red[^>]*>([\s\S]*?)<\/font>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    if(AnyBalance.isAvailable('plate', 'ignition', 'speed', 'lat', 'long', 'course', 'lasttime', 'marka')){
        html = AnyBalance.requestPost(baseurl + 'Default.aspx/GetAutoFirstLoad', '{}', addHeaders({'Content-Type': 'application/json; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest'}));
        var json = myGetJson(html);
        
        var result = {success: true};
        
        for(var i=0; i<json.length; ++i){
            var car = json[i];
            if(!prefs.plate || car.Plate.toUpperCase().indexOf(prefs.plate.toUpperCase()) >= 0){
                if(AnyBalance.isAvailable('plate'))
                    result.plate = car.Plate;
                if(AnyBalance.isAvailable('ignition'))
                    result.ignition = car.Active ? 'ВКЛ' : 'выкл';
                if(AnyBalance.isAvailable('speed'))
                    result.speed = car.Speed;
                if(AnyBalance.isAvailable('lat'))
                    result.lat = car.Lat;
                if(AnyBalance.isAvailable('long'))
                    result['long'] = car.Long;
                if(AnyBalance.isAvailable('course'))
                    result.course = car.Course;
                if(AnyBalance.isAvailable('lasttime'))
                    result.lasttime = Date.parse(car.Time);
                if(AnyBalance.isAvailable('marka'))
                    result.marka = car.MarkaModel;
                break;
            }
        }

        if(prefs.plate && i >= json.length)
            throw new AnyBalance.Error('Не удалось найти машину с номером, содержащим ' + prefs.plate);
    }

    html = AnyBalance.requestGet(baseurl + 'UserCabinet.aspx', g_headers);

    getParam(html, result, 'balance', /<span[^>]+id="PointsCount"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'virtual', /<span[^>]+id="VirtPointsCount"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<span[^>]+id="lblTariff"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'daysleft', /Дней до истечения баланса:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
