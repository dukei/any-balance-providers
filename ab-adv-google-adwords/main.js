/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Баланс на Google Adwords.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках e-mail и пароль.
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

function main() {
	var result = {success: true};
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = "https://accounts.google.com/ServiceLogin?service=adwords&hl=ru_RU&ltmpl=jfk&continue=https://adwords.google.com/um/gaiaauth?apt%3DNone%26ltmpl%3Djfk&passive=86400&sacu=1&sarp=1";
	var baseurlLogin = "https://accounts.google.com/";
    
	try {
		var html = AnyBalance.requestGet(baseurl, g_headers);
		var params = createFormParams(html, function(params, input, name, value){
			var undef;
			if(name == 'Email')
				value = prefs.login;
			else if(name == 'Passwd')
				value = prefs.password;
			else if(name == 'PersistentCookie')
				value = undef; //Снимаем галочку
		   
			return value;
		});
		
		//AnyBalance.trace(JSON.stringify(params));

		var html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', params, g_headers);

		//AnyBalance.trace(html);

		if(!/authenticatedUserName/i.test(html)){
			var error = getParam(html, null, null, /<span[^>]+class="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error);
			error = getParam(html, null, null, /(<form[^>]+name="verifyForm")/i);
			if(error)
				throw new AnyBalance.Error("This account requires 2-step authorization. Turn off 2-step authorization to use this provider.");
			throw new AnyBalance.Error('Can not log in google account.');
		}
		
		html = AnyBalance.requestGet('https://adwords.google.com/select/ShowBillingSummary?hl=ru', g_headers);
	} catch(e) {
		if(prefs.dbg)
			html = AnyBalance.requestGet('https://adwords.google.com/select/ShowBillingSummary?hl=ru', g_headers);
		else
			throw e;
	}
	
	var lg = null;
	var ng = function(a) {
		for (var b = [], c = 0, d = 0; d < a.length; d++) {
			for (var e = a.charCodeAt(d); 255 < e;) b[c++] = e & 255, e >>= 8;
			b[c++] = e
		}
		//if (!da(b)) throw Error("M");
		if (!lg)
			for (lg = {}, mg = {}, a = 0; 65 > a; a++) lg[a] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(a), mg[a] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(a);
		a = mg;
		c = [];
		for (d = 0; d < b.length; d += 3) {
			var f = b[d],
				k = (e = d + 1 < b.length) ? b[d + 1] : 0,
				l = d + 2 < b.length,
				q = l ? b[d + 2] : 0,
				O = f >> 2,
				f = (f & 3) << 4 | k >> 4,
				k = (k & 15) << 2 | q >> 6,
				q = q & 63;
			l || (q = 64, e || (k = 64));
			c.push(a[O], a[f], a[k], a[q])
		}
		return c.join("")
	};
	var v = Date.now || function() {
		return +new Date
	};
	
	var ya = function() {
		return Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ (0, v)()).toString(36)
	};
	
	var pcid = getParam(html, null, null, /"pcid"[^>]*value="([^"]+)/i);
	var hostOrigin = getParam(html, null, null, /"hostOrigin"[^>]*value="([^"]+)/i);
	
	hostOrigin = ng(hostOrigin);
	
	html = AnyBalance.requestGet('https://bpui0.google.com/payments/u/0/transactions?pcid=' + pcid + '&hostOrigin=' + hostOrigin + '&hl=ru&ipi=' + ya(), g_headers);
	
    if(/<form[^>]+name="tcaccept"/i.test(html)){
        //Надо че-то принять, че-то у них изменилось.
        throw new AnyBalance.Error('Положения программы Google изменились. Пожалуйста, зайдите в ваш аккаунт Adwords через браузер и на вкладке "Сводка платежных данных" примите новые положения.');
    }
	
	getParam(html, result, 'balance', /Остаток(?:[^>]*>){2}\s*\(([^)]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Остаток(?:[^>]*>){2}\s*\(([^)]+)/i, replaceTagsAndSpaces, parseCurrency);

    AnyBalance.setResult(result);
}