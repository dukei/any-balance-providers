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

    var baseUrl = "http://cms.air.io/",
        referralUrl = 'statistics/referral_system',
        loginUrl = 'index.php/welcome/enter_form';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseUrl + referralUrl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = AB.createFormParams(html, function(params, str, name, value){
        switch (name) {
            case 'login':
                return prefs.login;
            case 'password':
                return prefs.password;
            case 'remember':
                return 0;
            default:
                return value;
        }
    });

    if (params.login) {
        params.authorization = 1;

        var res = AnyBalance.requestPost(
            baseUrl + loginUrl,
            params,
            AB.addHeaders({Referer: baseUrl + referralUrl})
        );
        res = AB.getJson(res);

        if (!res.success || res.success != 'ok') {
            throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
        }

        html = AnyBalance.requestGet(baseUrl + referralUrl);
    }

    if(!/logout/i.test(html)){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, 'income', /Общий\s+доход\s+партнера([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'full_name', /user-name([\s\S]*?)<\/span>/i, [AB.replaceTagsAndSpaces, /[">\(\)]*/ig, '']);

    AnyBalance.setResult(result);
}
