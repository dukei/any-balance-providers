/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main () {
	var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://www.sclub.ru/';
	
    checkEmpty (prefs.login, 'Введите № карты!');
    checkEmpty (prefs.password, 'Введите пароль!');
	
    // Разлогин для отладки
    if (prefs.__dbg) {
    	AnyBalance.requestGet('https://www.sclub.ru/LogOut.aspx', g_headers);
    }
    // Необходимо для формирования cookie
    var html = AnyBalance.requestGet(baseurl, g_headers);
    var form = getParam(html, null, null, /<form[^>]*(?:id="mainLogin"|name="Form")[^>]*>[\s\S]*?<\/form>/i);
    if (!form) {
    	if(AnyBalance.getLastStatusCode() >= 400)
			throw new AnyBalance.Error('Личный кабинет Связной-клуб временно недоступен. Пожалуйста, попробуйте ещё раз позднее...');
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
	var AntiForgeryToken = getParam(html, null, null, /antiForgeryToken:[^']*'([^']+)/i);
	if(!AntiForgeryToken)
		throw new AnyBalance.Error('Не удалось найти токен авторизации!');
	
	html = AnyBalance.requestPost(baseurl + 'account/login', {
		UserName:prefs.login,
		Password:prefs.password,
		StayAuthorized:false,
		CollectEmailRequestId:'',
	}, addHeaders({
		Referer: baseurl,
		'AntiForgeryToken': AntiForgeryToken
	}));
	
	var jsonRespone = getJson(html);
	if (!/Success"[^"]+true/i.test(html)) {
		var errors = ['CollectEmailRequestId', 'LoginError', 'Password', 'StayAuthorized', 'UserName'];
		var errorsString = '';
		// Json содержит кучу возможных ошибок
		if(jsonRespone.Errors) {
			for(var i = 0; i < errors.length; i++) {
				var currentType = errors[i];
				var currentErrosArray = jsonRespone.Errors[currentType];
				if(currentErrosArray && currentErrosArray.length > 0) {
					AnyBalance.trace('Найдено ошибок: ' + currentErrosArray.length);
					for(var j = 0; j < currentErrosArray.length; j++) {
						var currentError = currentErrosArray[j];
						errorsString += currentError + ', ';
					}
				} else {
					AnyBalance.trace('Не найдено ошибок:  ' + currentType);
				}
			}
			errorsString = errorsString.replace(/, $/, '');
		}
		if(errorsString && errorsString != '') {
			throw new AnyBalance.Error(errorsString, null, /Неверные данные для авторизации/i.test(html));
		}
        AnyBalance.trace (html);
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с разработчиками.');		
	}
	
	// Редирект при необходимости? Не знаю, теперь вроде не нужно, оставим пока.
	/*var redirect = getParam(html, null, null, /window\.location\.replace\("([^"]*)"\)/i);
    if (redirect)
        html = AnyBalance.requestGet(redirect, g_headers);
	*/
	
    var result = {success: true};
	
	getParam (jsonRespone.User.FullName + '', result, 'customer', null, replaceTagsAndSpaces);
	getParam (jsonRespone.User.Pluses + '', result, 'balanceinpoints', null, replaceTagsAndSpaces, parseBalance);
	getParam (jsonRespone.User.Discount + '', result, 'balanceinrubles', null, replaceTagsAndSpaces, parseBalance);
	getParam (jsonRespone.User.UnreadMessagesCount + '', result, 'messages', null, replaceTagsAndSpaces, parseBalance);
	getParam (jsonRespone.User.ActiveCard.Ean + '', result, 'cardnumber');
	
	var state = parseBalance(jsonRespone.User.ActiveCard.CardStatus + '');
	if(isset(state)) {
		getParam (state == 1 ? 'Активна' : undefined, result, 'cardstate');
	}
	
    if (isAvailable(['pointsinlastoper'])) {
		html = AnyBalance.requestPost(baseurl + 'user/GetOperations/', {
			'ShowNewFirst':'true',
			'Page':'0',
			'Type':'',
		}, addHeaders({Referer: baseurl}));
		
		var operationsJson = getJson(html);
		
		if(operationsJson.Operations && operationsJson.Operations.length > 0) {
			var lastOperation = operationsJson.Operations[0];
			
			getParam (lastOperation.Amount + '', result, 'pointsinlastoper', null, replaceTagsAndSpaces, parseBalance);
			getParam (lastOperation.PartnerName + '', result, 'lastoperationplace', null, replaceTagsAndSpaces);
			getParam (lastOperation.OperationDate + '', result, 'lastoperationdate', null, replaceTagsAndSpaces, parseDate);
		}
    }
	
    AnyBalance.setResult (result);
}
