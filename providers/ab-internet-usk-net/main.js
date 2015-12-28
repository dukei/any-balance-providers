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

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://31.40.99.210/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(
        baseurl,
        {
            'login': prefs.login,
            'password': prefs.password
        },
        AB.addHeaders({Referer: baseurl})
    );

    if(!/zz_logout/i.test(html)){
        if (/Неверно указаны логин или пароль/i.test(html)) {
            throw new AnyBalance.Error('Неверно указаны логин или пароль', null, true);
        }

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '?module=00_user', g_headers);

    var result = {success: true};
    AB.getParam(html, result, 'balance', getRegex('Баланс'), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'account', getRegex('лицевой счет'), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'full_name', getRegex('ФИО'), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'id', getRegex('ID'), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'login', getRegex('Логин'), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'state', getRegex('Состояние интернета'), [AB.replaceTagsAndSpaces, /^(\S+).*/, '$1']);

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function getRegex(searchValue) {
    var commonPattern = '</td>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>';
    return new RegExp(searchValue + commonPattern, 'i');
}
