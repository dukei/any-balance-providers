function main(){
	var baseurl = "https://ioffice.penza-gsm.ru/abonent";
	var prefs = AnyBalance.getPreferences();
	if (prefs.login && (!/\d{11}/.test(prefs.login) && !/\d{6}/.test(prefs.login)))
		throw new AnyBalance.Error('Номер должен содержать 6 или 11 цифр');

	var headers = {
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		Referer: 'https://ioffice.penza-gsm.ru/login',
		'Accept-Charset': 'UTF-8,*;q=0.5',
		'Accept-Language': 'ru-RU',
		'Connection': 'keep-alive',
		'Host': 'ioffice.penza-gsm.ru',
		'User-Agent': 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.1'
	};
  
	AnyBalance.setAuthentication(prefs.login, prefs.password, "");
	AnyBalance.setDefaultCharset('windows-1251');
	var html = AnyBalance.requestGet(baseurl, headers);

	//Если есть ссылка с текстом "выход", считаем что успешно вошли
	var errMsg = html.match(/(var MSG=[\s\S]*warning[\s\S]*?);/);
	if (html.search(/<a[^>]*>выход<\/a>/i) == -1){
		//При ошибке входа сервер возвращает текст ошибки в JS внутри страницы
		var errMsg = html.match(/(var MSG=[\s\S]*warning[\s\S]*?);/);
		var err = errMsg[0].replace(/[\t\r\n]+|\s{2,}/g, '');
		eval(err);
		var msgText = MSG[0][MSG[0].length - 1];
		throw new AnyBalance.Error(msgText);
	}

	var result = {success: true, balance: null, sms_left: null};
	if(AnyBalance.isAvailable('balance')){
		var balance = null;
		try {
			//Баланс принудительно переводим в число
			balance = parseFloat(findParameterValue(html, 'Баланс:'));
		} catch (e) {
			balance = null;
		} finally {
			result.balance = balance;
		}
	}
	if(AnyBalance.isAvailable('sms_left')){
		//Остаток смс оставляем в виде строки
		result.sms_left = findParameterValue(html, 'Остаток[\\s\\S]* SMS:');
	}
	AnyBalance.setResult(result);
}

function findParameterValue(html, name) {
	var value = null;
	var parameterCell = html.match(new RegExp("<b>" + name + "[\\s\\S]*?<\\/tr[^>]*>([\\s\\S]*?)"));
	if (parameterCell) {
		var parameterValue = parameterCell[0].match(/(\d+\D\d+)/);
		if (parameterValue) {
			value = parameterValue[0];
		} else {
			AnyBalance.trace('Failed to find balance value');
		}
	} else {
		AnyBalance.trace('Failed to find parameter ' + name);
	}
	return value;
}