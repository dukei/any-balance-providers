/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, остаток дней и статус у интернет-провайдера NetByNet.

Сайт оператора: http://www.netbynet.ru/
Личный кабинет: http://stat.netbynet.ru/
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
    var baseurl = 'http://stat.netbynet.ru/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost (baseurl + "main", {
    	login: prefs.login,
        password: prefs.password
    });

    AnyBalance.trace ("It looks like we are in selfcare...");

    var result = {success: true};

    // Тарифный план
    // Тариф выцепить сложно, пришлось ориентироваться на запись после остатка дней
    var value = html.match (/Осталось[\s\S]*?<td> (.*?) <\/td>/i);
    if (value && value[1] != 'нет')
      result.__tariff = value[1];

    // Баланс
    getParam (html, result, 'balance', /class="balance".*?(-?[\d]+\.?[\d]*)/i, [], parseFloat);

    // Абонент
    getParam (html, result, 'subscriber', /Абонент[^>]*>([^<]*)/i);

    // Номер договора
    getParam (html, result, 'contract', /Договор[^\d]*([\d]+)/i, [], parseInt);

    // Расчетный период - остаток
    getParam (html, result, 'day_left', /Осталось[^\d]*([\d]+)/i, [], parseInt);

    // Статус
    getParam (html, result, 'status', /class="br fgreen">(?:<[^>]*>|)([^<]*)/i);

    AnyBalance.setResult(result);
}
