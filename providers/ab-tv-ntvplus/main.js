/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, бонусные баллы, сумму доплаты и пакеты услуг у НТВ+.

Сайт: http://www.ntvplus.ru
Личный кабинет: http://www.ntvplus.ru/login-page.xl
*/


function getParam (html, result, param, regexp, replaces, parser) {
	if (!AnyBalance.isAvailable (param))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);
		result[param] = value;
	}
}


function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.ntvplus.ru/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин.');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль.');


    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost (baseurl + "login-page.xl", {
        'goto': '/',
        login: prefs.login,
        password: prefs.password
    });

    var value = html.match (/class="errorblock".*?>[ \s]*([^<]*?)[ \s]*</i);
    if (value)
        throw new AnyBalance.Error (value[1]);

    AnyBalance.trace ("It looks like we are in selfcare...");

    var result = {success: true};

    AnyBalance.trace ("Fetching accounts...");

    html = AnyBalance.requestGet (baseurl + "abonents/account/index.xl");

    AnyBalance.trace ("Parsing accounts...");

    // Поиск идентификатора договора
    if (!prefs.contract || prefs.contract == '')
      prefs.contract = '\\d+';
    var regexp = 'class="contractnum" .*?toggleContract.*?\'c(\\d+)\'[^>]*>' + prefs.contract;
    value = html.match (regexp);
    var id;
    if (value)
        id = value[1];
    else
        throw new AnyBalance.Error ("Неверный номер договора");


    if (AnyBalance.isAvailable ('abonent')) {

        AnyBalance.trace ("Fetching settings...");

        html = AnyBalance.requestGet (baseurl + "settings.xl");

        AnyBalance.trace ("Parsing settings...");

        // ФИО
        getParam (html, result, 'abonent', /name="fio"[^>]*value="([^"]+)/i);

    }


    if (AnyBalance.isAvailable ('state',
                                'balance',
                                'bonus',
                                'recom_pay',
                                'packets')) {

        AnyBalance.trace ("Fetching check-account...");

        html = AnyBalance.requestGet (baseurl + "abonents/account/check-account.xl?id=" + id);

        AnyBalance.trace ("Parsing check-account...");

        // Состояние
        getParam (html, result, 'state', /Состояние:.*?<td>.*?<div[^>]*>([^<]*)/i);

        // Баланс
        getParam (html, result, 'balance', /Баланс:.*?<div>(-?\d+\.?\d*)/i, [], parseFloat);

        // Бонус
        getParam (html, result, 'bonus', /Бонус:.*?<td>(\d+)/i, [], parseInt);

        // Рекомендуемая сумма доплаты
        getParam (html, result, 'recom_pay', /Рекомендуемая сумма доплаты:.*?<td>(\d+\.?\d*)/i, [], parseFloat);

        // Пакеты услуг
        getParam (html, result, 'packets', /Пакеты:.*?<td>([^<]*)/i);

    }


    AnyBalance.setResult(result);
}

