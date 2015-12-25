/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    AB.checkEmpty(prefs.trackNumber, 'Введите трек номер!');

    var baseurl = "http://dpsz.ua/ru/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = AB.createFormParams(html, function(params, str, name, value){
        if (name == 'uds_ems_tr') {
            return prefs.trackNumber;
        }

        return value;
    });

    html = AnyBalance.requestPost(
        baseurl + 'track/ems',
        params,
        AB.addHeaders({Referer: baseurl})
    );

    var error = AB.getParam(html, null, null, /Отправление\s+не\s+найдено/i);
    if (error) {
        throw new AnyBalance.Error('Отправление не найлено по коду ' + prefs.trackNumber);
    }

    var infoHtml = AB.getParam(html, null, null, /информация по коду[\s\S]*?<ul>([\s\S]*?)<\/ul>/i),
        list = AB.sumParam(infoHtml, null, null, /<li>([\s\S]*?)<\/li>/g, [/\x20\x20+/g, ' ']),
        infoText = '';

    //Получаем все счетчики
    var result = {success: true};

    result.track_number = prefs.trackNumber;
    list.forEach(function(item){
        infoText += item + '<br><br>';
    });

    getParam(infoText, result, 'info', null, [/<br><br>$/i, '']);
    AnyBalance.setResult(result);
}
