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
    var baseurl = 'https://m.regiobank.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'logon', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'logon', {
        username:prefs.login,
        password:prefs.password,
        authtype:'tbp', /*authtype:user         authtype:card */
		submit:''
    }, addHeaders({Referer: baseurl + 'logon'}));

	var json = getJson(html);
	if(!json.personName){
        throw new AnyBalance.Error(json.message);
    }
	html = AnyBalance.requestGet(baseurl + 'accounts?_=', g_headers);
	
	json = getJson(html);
	var result = {success: true};
	for(var i = 0; i<json.cardinfo.length; i++)
	{
		var current = json.cardinfo[i];
		// Если есть счет, то начинаем искать нужный
		if(prefs.acc)
		{
			if(endsWith(current.acctnumb, prefs.acc))
			{
				getCardMain(current, result);
				break;
			}
		}
		// Не указан счет, берем первый попавшийся
		else
		{
			getCardMain(current, result);
			break;
		}
	}
    AnyBalance.setResult(result);
}

function getCardMain(current, result)
{
	getParam(current.acctnumb, result, '__tariff', null, null, null);
	getParam(current.acctnumb, result, 'acc_num', null, null, null);
	getParam(current.balance, result, 'balance', null, null, null);
	getParam(current.accttitle, result, 'accttitle', null, null, null);
	getParam(current.currency, result, 'currency', null, null, null);
	
	for(var i = 0; i<current.cards.length; i++)
	{
		var card = current.cards[i];
		getParam(card.cardnumb, result, 'cardnumb', null, null, null);
		getParam(card.expdate, result, 'card_expdate', null, null, parseDate);
		// пока ломаем, получаем только первую карту
		break;
	}
}