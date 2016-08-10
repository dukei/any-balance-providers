/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://myintercon.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var form = getElement(html, /<form[^>]+login[^>]*>/i);
    if(!form){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'user[login]')
			return prefs.login;
		else if(name == 'user[password]')
			return prefs.password;			
		return value;
	});
		
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'})); 

    if(!/new HupoApp/i.test(html)){
    	var error = getElement(html, /<div[^>]+error_container[^>]*>/i, replaceTagsAndSpaces);
    	if(error)
    		throw new AnyBalance.Error(error, null, /парол/i.test(error));
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var json = getJsonObject(html, /new HupoApp/);
	
	getParam(json.data.person.vc_name, result, 'fio');

	for(var i=0; i<json.data.personal_accounts.length; ++i){
		var pa = json.data.personal_accounts[i];
		AnyBalance.trace('Найден аккаунт ' + pa.vc_account);
		if(!prefs.digits || endsWith(pa.vc_account, prefs.digits)){
			AnyBalance.trace('Это интересующий нас аккаунт.');

			getParam(pa.n_sum_bal, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
			getParam(pa.n_good_base_sum, result, 'abon', null, replaceTagsAndSpaces, parseBalance);
			getParam(pa.vc_name, result, 'dogovor');
			getParam(pa.vc_account, result, 'acc-num');
			break;
		}
	}

	if(i >= json.data.personal_accounts.length)
		throw new AnyBalance.Error(prefs.digits ? 'Не удалось найти лицевого счета с последними цифрами ' + prefs.digits : 'У вас нет ни одного лицевого счета');

	for(var i=0; i<json.data.servs.length; i++){
		var s = json.data.servs[i];
		sumParam(s.vc_name, result, '__tariff', null, null, null, aggregate_join);
		sumParam(s.n_good_base_sum, result, 'abon', null, null, parseBalance, aggregate_sum);
	}

    AnyBalance.setResult(result);
}