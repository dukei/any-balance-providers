/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseUrl = 'http://cms.air.io/',
        referralUrl = 'statistics/referral_system',
        loginUrl = 'index.php/welcome/enter_form';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseUrl + referralUrl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
    	AnyBalance.trace(html);
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

        html = AnyBalance.requestGet(baseUrl + referralUrl);
    }

    if (!/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div class="block-recovery">[\s\S]*?<label[^>]*error[^>]*>([\s\S]+?)<\/label>/i, AB.replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /пользователь/i.test(error));
        }
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, 'income', /Общий\s+доход\s+партнера([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'full_name', /user-name([\s\S]*?)<\/span>/i, [AB.replaceTagsAndSpaces, /[">\(\)]*/ig, '']);

    if(isAvailable('balance')) {
        html = AnyBalance.requestGet(baseUrl+'payments/partner_payments', g_headers);
        var partnerID = AB.getParam(html, null, null, /<input[^>]+name="globalPartnerId"[^>]+value="([\s\S]*?)"/i);
        if(!partnerID)
            AnyBalance.trace("Не смогли найти ID по которому нужно получать баланс. Сайт изменён?");
        else {
            html = AnyBalance.requestPost(baseUrl+'AirMessageBus/PartnerEarningsCalculated', {
                globalPartnerId: partnerID
            }, AB.addHeaders({
                'X-Requested-With': 'XMLHttpRequest'
            }));
            var json  = AB.getJson(html);

            AB.getParam(json.Earnings ? json.Earnings.InDollars + '' : undefined, result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
        }

    }


    AnyBalance.setResult(result);
}
