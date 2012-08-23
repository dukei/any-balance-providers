/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет Акадо-урал.

Сайт оператора: http://akado-ural.ru/
Личный кабинет: https://stat.akado-ural.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
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

    if(param)
      result[param] = value;
    else
      return value
	}
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.akado-ural.ru/";

    AnyBalance.setDefaultCharset('windows-1251');
    
    var html = AnyBalance.requestGet(baseurl + 'login.php?in=1');

    html = AnyBalance.requestPost(baseurl + 'login.php?in=1', {
        r: getParam(html, null, null, /name="r" value="([^"]*)"/),
        login: prefs.login,
        pass: prefs.password
    });

    var error = getParam(html, null, null, /class="redlight"[^>]*>([\s\S]*?)<\/div>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
    if(error && !(error.match(/Баланс отрицательный/i))) //http://code.google.com/p/any-balance-providers/issues/detail?id=62
        throw new AnyBalance.Error(error);

    var result = {success: true};
    
    getParam(html, result, 'balance', /<th[^>]*>\s*Баланс:[\s\S]*?<td[^>]*>\s*([^<]*)</i, null, parseFloat);
    getParam(html, result, 'credit', /<th[^>]*>\s*Кредит:[\s\S]*?<td[^>]*>\s*([^<]*)</i, null, parseFloat);
    getParam(html, result, 'blocked', /<th[^>]*>\s*Блокировка в биллинге:[\s\S]*?<td[^>]*>\s*([^<]*)</i);
    getParam(html, result, 'agreement', /<th[^>]*>\s*Договор:[\s\S]*?<td[^>]*>\s*([^<]*)</i);
    result.__tariff = getParam(html, null, null, /<td[^>]*>\s*Тарифный план:[\s\S]*?<td[^>]*>\s*([^<]*)</i, [/\s+$/,'']);

    if(AnyBalance.isAvailable('bonus','friends')){
	var html = AnyBalance.requestGet(baseurl + "?page=24");
    	getParam(html, result, 'friends', /<td[^>]*>\s*Количество друзей:[\s\S]*?<td[^>]*>\s*(\d[\s\d\.,]*)[^<]*</i, [/\s+/g, '', /,/g, '.'], parseInt);
    	getParam(html, result, 'bonus', /<td[^>]*>\s*Сумма бонуса:[\s\S]*?<td[^>]*>\s*(-?\s*\d[\s\d\.,]*)[^<]*</i, [/\s+/g, '', /,/g, '.'], parseFloat);
    }
    
    AnyBalance.setResult(result);
}
