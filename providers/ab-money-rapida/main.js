/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Состояние баланса кошелька Rapida.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Адрес кошелька: https://wallet.rapida.ru/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US,en;q=0.8,ru;q=0.6',
	Origin: 'https://wallet.rapida.ru',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36',
	'Upgrade-Insecure-Requests': '1',

};


function findValue(html, regexp) {
	var r = new RegExp(regexp);
	var matches=r.exec(html);
	if(matches==null) return null;
	return matches[1];
}

function main() {
	
	var result = {
        success: true
    };

    var baseurl = 'https://wallet.rapida.ru/';
	var html = AnyBalance.requestGet(baseurl);
	
	if(html.indexOf('<a href="/exit/" class="exit">')==-1) {
		var codes = {"TJ":"+ 992","MD":"+ 373","LT":"+ 370","LV":"+ 371","KG":"+ 996","KZ":"+ 77","GE":"+ 995","BY":"+ 375","AM":"+ 374","AZ":"+ 994","RU":"+ 7","TM":"+ 993","UZ":"+ 998","UA":"+ 380","EE":"+ 372"};
	
		var csrfmiddlewaretoken=findValue(html, "<input[^>]+name='csrfmiddlewaretoken'[^>]*value='([a-zA-Z0-9]+)");
		if(csrfmiddlewaretoken==null) throw new AnyBalance.Error('Ошибка предварительного разбора 1');

		var prefs = AnyBalance.getPreferences();
		var loginRequest={
			csrfmiddlewaretoken: csrfmiddlewaretoken,
			def_code: prefs.code,
			def_code_shdw: codes[prefs.code],
			login: prefs.login,
			pin: prefs.password,
			'g-recaptcha-response': solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, '6LeCviMTAAAAAME2syQsk3f95voQMz9Fh1MmzGGB')
		  };

		html = AnyBalance.requestPost(baseurl + 'auth/', loginRequest, addHeaders({
			Referer: baseurl
		  }));
		  
	}

	if(/<a[^>]+class="exit"/i.test(html)) {
		var tmp=findValue(html, "<div class=\"hello_title\">(.+?)</div>");
		if(tmp==null) throw new AnyBalance.Error('Ошибка получения значения имени');
		result.name=tmp;
		
		tmp=findValue(html, "<div class=\"hello_status\">[\\s\\S]+?([а-яА-Я]+)[\\s\\S]+</div>");
		
		if(tmp==null) throw new AnyBalance.Error('Ошибка получения значения статуса');
		result.status=tmp;

		if(AnyBalance.isAvailable('balance')){
			html = AnyBalance.requestPost(baseurl + 'ajax/_balance/', 'getbalance', addHeaders({
				Referer: baseurl + 'dashboard/',
				'X-CSRFToken': AnyBalance.getCookie('csrftoken'),
				'X-Requested-With': 'XMLHttpRequest'
			}));

			var json = getJson(html);
			getParam(json.balance, result, 'balance', null, null, parseBalance);
		}
		
	} else {
		var json = getJsonObject(html, /\$\.msg\(/);
		var error = json && json.content;
		if(error)
			throw new AnyBalance.Error(error, null, /вас не знаем|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль.');
	}
    
    AnyBalance.setResult(result);
}