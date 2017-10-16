/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
};

function main() {
	var prefs 	= AnyBalance.getPreferences(),
		baseurl = 'https://cp.beget.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login?action=auth', {
		login: prefs.login,
		password: prefs.password,
		btoken: ''
	}, addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'login'
	}));

	var login_errors = {
		'0':   'Произошла внутренняя ошибка.',
		'-1':  'Превышен лимит отправки сообщений с кодом доступа для этого аккаунта.',
		'-2':  'Код авторизации введён не корректно.',
		'-3':  'Превышено количество попыток ввода, попробуйте через час.',
		'-10': 'Не заполнены обязательные поля для входа.',
		'-11': 'Вы ввели некорректное имя или пароль.',
		'-12': 'Доступ с Вашего IP-адреса запрещён. Пожалуйста, обратитесь в службу поддержки для решения данного вопроса.',
		'-13': 'Произошла внутренняя ошибка.',
		'-14': 'Ваш браузер безнадёжно устарел.',
		'-15': 'Вход в панель управления недоступен. Выполняется обновление, попробуйте позже.',
		'-16': 'Аккаунт был удалён. Для уточнения подробностей обратитесь в службу поддержки.'
	};

	var json = getJson(html);
	if (json.error) {
		if (login_errors[json.code])
			throw new AnyBalance.Error(login_errors[json.code], null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var data = json.data.customer,
		json = getJson(html);

	if(data) {
		AB.getParam(data.summaryTotalRate + '', result, 'payment',    null, null, AB.parseBalance);
		AB.getParam(data.balance + '', 			result, 'balance', null, null, AB.parseBalance);
		
		AB.getParam(data.id,  		 result, 'user_id'); //ID пользователя
		AB.getParam(data.planName, 	 result, '__tariff');
		AB.getParam(data.fio, 		 result, 'fio');
		
		AB.getParam(data.serverIp, 	 result, 'IP');
		AB.getParam(data.serverName, result, 'server_name');
		
		AB.getParam(data.deleteDate, 	result, 'date_delete', null, null, AB.parseDate);
		AB.getParam(data.blockDate,  	result, 'date_block',  null, null, AB.parseDate);
		AB.getParam(data.payDays + '', 	result, 'daysleft', 	   null, null, AB.parseBalance);
		
		AB.getParam(data.ftpCount + '',   result, 'ftp',   null, null, AB.parseBalance);
		AB.getParam(data.mysqlCount + '', result, 'mysql', null, null, AB.parseBalance);
		AB.getParam(data.sitesCount + '', result, 'sites', null, null, AB.parseBalance);
		AB.getParam(data.mailCount + '',  result, 'mail',  null, null, AB.parseBalance);

		AB.getParam(data.planQuota + 'mb', 			result, 'plan_quota', null, null, AB.parseTraffic);
		AB.getParam(data.userQuota.usedSize + 'kb', result, 'used_quota', null, null, AB.parseTraffic);
	} else {
		throw new AnyBalance.Error("Не удалось найти данные. Сайт изменён?")
	}
	AnyBalance.setResult(result);
}