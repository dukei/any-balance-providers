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
    var baseurl = "https://secure.mega-billing.com/byt/ua/";
	
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'username')
			return prefs.login;
		else if(name == 'password')
			return prefs.password;		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login', params, g_headers); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /class="page-error"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var url = AnyBalance.getLastUrl();
   	var csrf = getParam(html, null, null, /<meta[^>]+name="csrf-token"[^>]+content="([^"]*)/i, replaceHtmlEntities);
    if(/\/accounts\/\d+$/i.test(url)){
    	//Перешли на аккаунт
    	AnyBalance.trace('Ожидаем подключения');
    	var trai = 1;
    	do{
    		html = AnyBalance.requestGet(url, addHeaders({
    			'X-Requested-With': 'XMLHttpRequest',
    			Referer: url,
    			'X-CSRF-Token': csrf,
    			Accept: '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript'
    		}));
    		if(/подключение успешно|Успішно підключено/i.test(html)){
    			url = getParam(html, null, null, /window.location.href\s*=\s*'([^']*)/);
    			html = AnyBalance.requestGet(url, g_headers);
    			break;
    		}
    		if(++trai > 5){
    			AnyBalance.trace(html);
    			throw new AnyBalance.Error('Не удалось подключиться за 5 попыток. Сайт изменен?');
    		}
    		AnyBalance.sleep(3000);
   			AnyBalance.trace('Попытка ' + trai);
    	}while(true);
    }else{
    	AnyBalance.trace(url + '\n' + html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

   	csrf = getParam(html, null, null, /<meta[^>]+name="csrf-token"[^>]+content="([^"]*)/i, replaceHtmlEntities);
    html = AnyBalance.requestGet(url, addHeaders({
    	'X-Requested-With': 'XMLHttpRequest',
    	Referer: url,
    	'X-CSRF-Token': csrf,
		Accept: '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript'
    }));

    var details = getParam(html, null, null, /'#account_summary_details'\)\.html\('((?:[^\\']+|\\.)*)/i, [/^(.*)/, 'return \'$1\''], safeEval);
    var summary = getParam(html, null, null, /'#account_summary'\)\.html\('((?:[^\\']+|\\.)*)/i, [/^(.*)/, 'return \'$1\''], safeEval);
    var saldo = getParam(html, null, null, /'#saldo'\)\.html\('((?:[^\\']+|\\.)*)/i, [/^(.*)/, 'return \'$1\''], safeEval);

    AnyBalance.trace(details);
    AnyBalance.trace(summary);
    AnyBalance.trace(saldo);
	
    var result = {success: true};
	
	var balance = getParam(saldo, null, null, /<span[^>]+"saldo-value"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	if(isset(balance)){
		if(/debit/i.test(saldo))
			getParam(balance, result, 'balance');
		else
			getParam(balance*-1, result, 'balance');
	}
	
	getParam(html, result, 'acc', /(?:Лицевой счет|Особовий рахунок)\s*№\s*(\d+)/i, replaceTagsAndSpaces);
	getParam(details, result, 'fio', /(?:Потребитель|Споживач)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(summary, result, 'lastpay', /(?:Последняя оплата|Остання оплата)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(summary, result, 'lastcounter', /(?:Последние показания счетчика|Останні показання лічильника)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [/<a[^>]*>([\s\S]*?)<\/a>/ig, ' ', replaceTagsAndSpaces]);
    getParam(summary, result, 'tarif', /(?:Действующий тариф|Діючий тариф)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}