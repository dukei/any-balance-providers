
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
var baseurl = 'https://sg.megafon.tj';

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/ps/scc/login.php?SECONDARY_LOGIN=1&FULLVERSION', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var phpSessId = AB.getParam(html, null, null, /input[^>]*phpsessid[^>]*value=["']([^"']+)/i);

	var params = {
        LOGIN: prefs.login,
        PASSWORD: prefs.password,
        CODE: getCaptcha(phpSessId),
        PHPSESSID: phpSessId
    };

	var checkHtml = AnyBalance.requestPost(
        baseurl + '/ps/scc/php/check.php?CHANNEL=WWW',
        params,
        AB.addHeaders({
		    Referer: baseurl + '/ps/scc/login.php?SECONDARY_LOGIN=1&FULLVERSION'
	    })
    );

    AnyBalance.trace(checkHtml);
    var sessId = AB.getParam(checkHtml, null, null, /session_id>([^<]+)/i),
        langId = AB.getParam(checkHtml, null, null, /lang_id>([^<]+)/i);

    params = {
        SESSION_ID: sessId,
        CHANNEL: 'WWW',
        LOGIN: prefs.login,
        PASSWD: prefs.password
    };

    html = AnyBalance.requestPost(
        baseurl + '/SCC/SC_BASE_LOGIN',
        params,
        AB.addHeaders({
            Referer: baseurl + '/ps/scc/login.php?SECONDARY_LOGIN=1&FULLVERSION'
        })
    );

    if (!/close_session/i.test(html)) {
        var error =
            AB.getParam(checkHtml, null, null, /error_message>([^<]+)/i) ||
            AB.getParam(html, null, null, /Ошибка[\s\S]*?attention[^>]*>([\s\S]+?)<\/div>/i, AB.replaceTagsAndSpaces);

        if (error) {
            throw new AnyBalance.Error(error, null, /(?:пользователь|пароль)/i.test(error));
        }

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestPost(
        baseurl + '/SCWWW/ACCOUNT_INFO',
        {
            P_GRID_LEFT: 0,
            P_GRID_WIDTH: '',
            findspec: '',
            CHANNEL: 'WWW',
            SESSION_ID: sessId,
            P_USER_LANG_ID: langId
        },
        AB.addHeaders({
            Referer: baseurl + '/SCC/SC_BASE_LOGIN'
        })
    );

	var result = {
		success: true
	};

    var today = new Date(),
        day = today.getDate(),
        month = (today.getMonth() + 1).toString(),
        year = today.getFullYear();

    if (month.length == 1) {
        month = '0' + month;
    }

    var balanceRe = new RegExp(`баланс на ${day}.${month}.${year}[^<]+\\D+([^<]+)`, 'i');

	AB.getParam(html, result, 'balance', balanceRe, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account', /лицевой счет\D+(\d+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'full_name', /group-client[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'credit_limit', /кредитный лимит\D+([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'status', /Статус абонента[\s\S]*?<div[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<div[^>]*>([\s\S]+?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'activation_date', /Дата активации[\s\S]*?<div[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'bonus', /Бонусные баллы\D+([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}

function getCaptcha(sessId) {
    AnyBalance.trace('Пытаемся ввести капчу');
    var captchaImg = AnyBalance.requestGet('https://sg.megafon.tj/ps/scc/php/cryptographp.php?PHPSESSID=' + sessId + '&ref=161&w=141');

    AnyBalance.trace('Капча получена: ' + captchaImg);
    return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captchaImg);
}
