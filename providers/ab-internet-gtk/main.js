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

    var baseurl = 'http://bill.gtk.su/';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = AB.createFormParams(html, function(params, str, name, value){
        switch (name) {
            case 'j_username':
                return prefs.login;
            case 'j_password':
                return prefs.password;
            default:
                return value;
        }
    });
    params.login_button = 'login_button';

    html = AnyBalance.requestPost(
        baseurl + 'login.xhtml',
        params,
        AB.addHeaders({
            'Referer': baseurl + 'login.xhtml'
        })
    );

    if (!/security_logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div class="alert alert-danger">([\s\S]+?)<\/div>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /логин или пароль/.test(error));
        }
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    AB.getParam(html, result, 'balance', /Баланс([\s\S]*?)</i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'status', /Статус:([\s\S]*?)</i,  AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'user', getRegEx('Абонент'), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'agreement', getRegEx('договор'), [AB.replaceTagsAndSpaces, /\n+/g, ' ']);
    AB.getParam(html, result, 'account_number', getRegEx('Номер лицевого счета'), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'calculation_scheme', getRegEx('Схема расчетов'), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'shutdown_threshold', getRegEx('Порог отключения'), AB.replaceTagsAndSpaces, AB.parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function getRegEx(searchValue) {
    var str = '<label>' + searchValue + '[\\s\\S]*?<div[^>]*>([\\s\\S]*?)</div>'
    return new RegExp(str, 'i');
}
