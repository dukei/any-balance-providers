/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.146 Safari/537.36',
	'Origin': 'https://www.belveb24.by',
	'Cache-Control': 'max-age=0',
};

function getMessage(html) {
	return getParam(html, null, null, /var\s+Message\s*=\s*['"]([^'"]+)['"]\s*;/i, replaceTagsAndSpaces);
}

function getLoginParams(html, prefs) {
	var form = getParam(html, null, null, /<form[^>]*action="login.php"[\s\S]*?<\/form>/i);
	checkEmpty(form, 'Не удалось найти форму входа, сайт изменен?', true);

	var params = createFormParams(form, function (params, str, name, value) {
			if (name == 'login') {
					return prefs.login;
			} else if (name == 'password') {
					return prefs.password;
			}

			return value;
	});

	return params;
}

function main() {
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://www.belveb24.by/';
	AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	// Запросим страницу логина
	var html = AnyBalance.requestGet(baseurl, g_headers);

	// Сначала пробуем войти напрямую
	var params = getLoginParams(html, prefs);

	html = AnyBalance.requestPost(baseurl + 'login.php', params, addHeaders({Referer: baseurl}));

	if (/Введите код с картинки|Введен неверный код/i.test(getMessage(html))) {
			AnyBalance.trace('Требуется ввод капчи.');

			params = getLoginParams(html, prefs);
			// Войти с тем же паролем не получится, он там энкодится, но выводится в input :)
			params.pwd = getParam(html, null, null, /<input type="password"[^>]*value="([^"]+)/i);

			if (AnyBalance.getLevel() >= 7) {
					AnyBalance.trace('Пытаемся ввести капчу');
					var captcha = AnyBalance.requestGet(baseurl + 'captcha.ashx?r=' + Math.random(), addHeaders({Referer: baseurl + 'start.aspx?mode=5'}));
					params.captcha = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
					AnyBalance.trace('Капча получена: ' + params.captcha);
			} else {
					throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
			}

			html = AnyBalance.requestPost(baseurl + 'login.php', params, addHeaders({Referer: baseurl}));
	}
	if (!/login\.php\?logout=1/i.test(html)) {
			var error = getMessage(html);
			if (error)
					throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	param_curent = 'a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:73:"a:2:{i:0;a:1:{s:11:"proxy.class";a:1:{s:14:"cardManageList";b:1;}}i:1;N;}";}';
	paramss2 = 'a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:69:"a:2:{i:0;a:1:{s:11:"proxy.class";a:1:{s:10:"clientData";b:1;}}i:1;N;}";}';
	params_sceta = 'a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:64:"a:1:{i:0;a:1:{s:11:"proxy.class";a:1:{s:11:"getAccounts";b:1;}}}";}';
	htm = AnyBalance.requestPost(baseurl + 'admin.php?xoadCall=true', param_curent, addHeaders({Referer: baseurl}));
	html2 = AnyBalance.requestPost(baseurl + 'admin.php?xoadCall=true', paramss2, addHeaders({Referer: baseurl}));
	var cardsForm = htm;
	checkEmpty(cardsForm, 'Не удалось найти Список с картами, сайт изменен?', true);
	params_sceta_html = AnyBalance.requestPost(baseurl + 'admin.php?xoadCall=true', params_sceta, addHeaders({Referer: baseurl}));
	var accounts_sceta = getJsonEval(params_sceta_html).returnObject.result.accounts;
	AnyBalance.trace(htm);
	
	var accounts_aac = getJsonEval(htm).returnObject.result.list;
	// Далее надо узнать какую карту смотреть
	var card = prefs.lastdigits;
	//var card = 4506;
	var s = getJsonEval(html2).returnObject.result.client.ClientData[0];
	var fio = s.NAMF + ' ' + s.NAMI + ' ' + s.NAMO;//Формируем ФИО
	AnyBalance.trace(fio);
	var result = {success: true};
	getParam(fio, result, 'fio');

	for (var i = 0; i < accounts_aac.length; i++) {//перебираем масив  Счетов

			var d = accounts_aac[i]['CARDSUFFIX'];

			if (card) {
					if (d.indexOf(card) >= 0) {
							AnyBalance.trace('Найдена карта:  ' + accounts_aac[i]['CARD']);
							card = accounts_aac[i]['CARD'] + ' ' + accounts_aac[i]['NAME'];
							getParam(card, result, 'cardnum');
							getParam(htm, result, 'balance', accounts_aac[i].BALANCE, replaceTagsAndSpaces, parseBalance);
							getParam(accounts_aac[i].CURR_NAME, result, 'currency');
							if (accounts_sceta.ACC) {
									AnyBalance.trace('ЕСТЬ Счета');
									for (var j = 0; j < accounts_sceta.ACC.length; j++) {
											var num = accounts_sceta.ACC[j]['CRD_SUB'];
											getParam(accounts_sceta.ACC[j]['@attributes'].IBAN, result, 'num_account');
											if (num != '') {
													if (num.indexOf(accounts_aac[i]['CARD']) >= 0) {
															vipiska = AnyBalance.requestPost(baseurl + 'admin.php?xoadCall=true', 'a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:95:"a:2:{i:0;a:1:{s:11:"proxy.class";a:1:{s:17:"getAccountDetails";a:1:{s:2:"id";s:1:"' + j + '";}}}i:1;N;}";}', addHeaders({Referer: baseurl}));
															var chec = getJsonEval(vipiska).returnObject.result.accountDetails;
															//  AnyBalance.trace(chec);
															var chec_end = chec.Title.Row[0].TitleData;
															for (var k = 0; k < chec.F.Row.length; k++) {
																	chec_end += ",\n\n Дата: " + chec.F.Row[k].Date + ",\n Назначение: " + chec.F.Row[k].Desc + ',\n Сумма: ' + chec.F.Row[k].AccAmount + ' ' + chec.F.Row[k].AccCurr + '';
															}
															getParam(chec_end, result, 'chec_end');
															AnyBalance.trace(j, num);
													}
											}
									}
							}
							break;
					} else {
							continue;
					}
			} else {
					AnyBalance.trace('Не указана карта в настройках, будет показана информация по карте: ' + accounts_aac[0]['CARD']);

					card = accounts_aac[0]['CARD'] + ' ' + accounts_aac[0]['NAME'];
					getParam(card, result, 'cardnum');
					getParam(htm, result, 'balance', accounts_aac[0].BALANCE, replaceTagsAndSpaces, parseBalance);
					getParam(accounts_aac[0].CURR_NAME, result, 'currency');
					break;
			}
	}
	if (!htm) {
			throw new AnyBalance.Error('Не удалось получить баланс по карте. Проверьте, что вы оплатили доступ в Интернет-Банк');
	}
	AnyBalance.setResult(result);
}
