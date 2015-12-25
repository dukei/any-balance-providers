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

    AB.checkEmpty(prefs.login, 'Введите номер телефона!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://www.green-bonus.ru/";

    AnyBalance.setDefaultCharset('utf-8');


    var html = AnyBalance.requestGet(baseurl + 'auth/login/', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = AB.createFormParams(html, function (params, str, name, value) {
        switch (name) {
            case 'phone_number':
                return '7' + prefs.login;
            case 'password':
                return prefs.password;
            default:
                return value;
        }
    });

    html = AnyBalance.requestPost(
        baseurl + 'auth/login/',
        params,
        AB.addHeaders({Referer: baseurl + 'auth/login/'})
    );

    if(!/\/logout/i.test(html)) {
        if (/errorlist/i.test(html)) {
            throw new AnyBalance.Error('Неправильный номер телефона или пароль!', null, true);
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'operations/', g_headers);

    var result = {success: true};
    AB.getParam(html, result, 'bonuses', /бонусов на счету([\s\S]*?)<\/tr>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'card_number', /номер карты([\s\S]*?)<\/tr>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'status', /текущий статус([\s\S]*?)<\/tr>/i, AB.replaceTagsAndSpaces);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
