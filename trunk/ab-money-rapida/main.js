/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Состояние баланса кошелька Rapida.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Адрес кошелька: https://pps.rapida.ru/
*/

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

	var html = AnyBalance.requestGet('https://pps.rapida.ru/');
	
	if(html.indexOf('<a href="/exit/" class="exit">')==-1) {
		var codes = {"TJ":"+ 992","MD":"+ 373","LT":"+ 370","LV":"+ 371","KG":"+ 996","KZ":"+ 77","GE":"+ 995","BY":"+ 375","AM":"+ 374","AZ":"+ 994","RU":"+ 7","TM":"+ 993","UZ":"+ 998","UA":"+ 380","EE":"+ 372"};
	
		var csrfmiddlewaretoken=findValue(html, "<input type='hidden' name='csrfmiddlewaretoken' value='([a-zA-Z0-9]+)'");
		if(csrfmiddlewaretoken==null) throw new AnyBalance.Error('Ошибка предварительного разбора 1');

		var prefs = AnyBalance.getPreferences();
		var loginRequest={
			csrfmiddlewaretoken: csrfmiddlewaretoken,
			def_code: prefs.code,
			def_code_shdw: codes[prefs.code],
			login: prefs.login,
			pin: prefs.password
		  };

		var captchaHash=findValue(html, "<input.+name=\"captcha_0\" value=\"([a-zA-Z0-9]+)\" id=\"id_captcha_0\"");
		if(captchaHash!=null) {
			var captchaimg = AnyBalance.requestGet("https://pps.rapida.ru/captcha/image/"+captchaHash+"/");
			var captcha = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captchaimg);
			loginRequest.captcha_0=captchaHash;
			loginRequest.captcha_1=captcha;
		}
	
		html = AnyBalance.requestPost('https://pps.rapida.ru/auth/', loginRequest, {
			Referer: "https://pps.rapida.ru/"
		  });
		  
		if(html.indexOf('<ul class="errorlist"><li>Неверный код</li></ul>')!=-1) {
			throw new AnyBalance.Error('Неверно введено число с картинки');
		}
	}

	if(html.indexOf('<a href="/exit/" class="exit">')!=-1) {
		
		var tmp=findValue(html, "<div class=\"hello_title\">(.+?)</div>");
		if(tmp==null) throw new AnyBalance.Error('Ошибка получения значения имени');
		result.name=tmp;
		
		tmp=findValue(html, "<div class=\"hello_status\">Ваш статус:[\\s\\S]+?([а-яА-Я]+)[\\s\\S]+?</div>");
		if(tmp==null) throw new AnyBalance.Error('Ошибка получения значения статуса');
		result.status=tmp;
		
		tmp=findValue(html, "<span id=\"balance\">([0-9.]+)</span>");
		if(tmp==null) throw new AnyBalance.Error('Ошибка получения значения баланса');
		result.balance=parseFloat(tmp);
		
	} else {
		throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль.');
	}
    
    AnyBalance.setResult(result);
}