/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    var baseurl = "https://www.neotelecom.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'bill/login.php', {
        login:prefs.login,
        password:prefs.password,
    }, g_headers);

    if(!/logout=1/i.test(html)){
        var error = getParam(html, null, null, /<div class="box red center"><b>([\s\S]*?)<\/b><\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var tables = sumParam(html, null, null, /(<table(?:[\s\S](?!<\/table>))*?Договор №[\s\S]*?<\/table>)/ig);
	
	if(!tables.length)
		throw new AnyBalance.Error('Не найдено ни одной услуги в личном кабинете!');

	var result = {success: true};
	
	for(var i = 0; i < tables.length; i++)
	{
		// Если не указан счет, просто берем первую таблицу
		if(!prefs.acc)
		{
			getParam(tables[i], result, 'acc_num', /Договор №[\s\S]*?(\d+)/i, null, null);
			getParam(tables[i], result, 'balance', /Баланс по договору на[\s\S]*?<b class="red">([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
			getParam(tables[i], result, 'usluga', /Вид услуги\s*\/\s*Тарифный план[\s\S]*?class="row1">[\s\S]*?<b>\s*([\s\S]*?)\s*<\/b><br\/>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tables[i], result, '__tariff', /Вид услуги\s*\/\s*Тарифный план[\s\S]*?class="row1">[\s\S]*?<\/b><br\/>\s*([\s\S]*?)<br\/>/i, replaceTagsAndSpaces, html_entity_decode);
			break;
		}
		else
		{
			var acc = getParam(tables[i], null, null, /Договор №[\s\S]*?(\d+)/i, null, null);
			// Смотрим только нужный счет
			if(endsWith(acc, prefs.acc))
			{
				getParam(tables[i], result, 'acc_num', /Договор №[\s\S]*?(\d+)/i, null, null);
				getParam(tables[i], result, 'balance', /Баланс по договору на[\s\S]*?<b class="red">([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
				getParam(tables[i], result, 'usluga', /Вид услуги\s*\/\s*Тарифный план[\s\S]*?class="row1">[\s\S]*?<b>\s*([\s\S]*?)\s*<\/b><br\/>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(tables[i], result, '__tariff', /Вид услуги\s*\/\s*Тарифный план[\s\S]*?class="row1">[\s\S]*?<\/b><br\/>\s*([\s\S]*?)<br\/>/i, replaceTagsAndSpaces, html_entity_decode);
				break;
			}
		}
	}
    AnyBalance.setResult(result);
}