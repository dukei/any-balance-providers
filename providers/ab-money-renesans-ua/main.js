/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.rccf.ua/ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(!prefs.num || /^\d{4}$/.test(prefs.num), 'Пожалуйста, введите 4 последних цифры номера карты/счета/кредитного договора, информацию по которому вы хотите получить, или не вводите ничего.')
	
	var html = login(prefs, baseurl);

	var result = {success: true};

	if(prefs.type === 'card')
		throw new AnyBalance.Error('В данный момент карты не поддерживаются, обратитесь к разработчикам для доработки провайдера.');
	else if(prefs.type === 'acc')
		throw new AnyBalance.Error('В данный момент счета не поддерживаются, обратитесь к разработчикам для доработки провайдера.');
	else
		fetchCredit(result, prefs, baseurl);
	
	AnyBalance.setResult(result);
}

function login(prefs, baseurl){
	var html = AnyBalance.requestGet(baseurl + 'security/logon', g_headers),
		loginName = getParam(html, null, null, /_login\.clone\(\)\.prop\('readonly', true\)\.prop\('name', '([\S]+)'/i),
		passwordName = getParam(html, null, null, /_password\.clone\(\)\.prop\('readonly', true\)\.prop\('name', '([\S]+)'/i),
		params, error;

	if(!loginName || !passwordName)
		throw new AnyBalance.Error('Не удалось найти имена параметров логина или пароля. Сообщите разработчикам.');	

	AnyBalance.trace('Found login name:' + loginName);
	AnyBalance.trace('Found password name:' + passwordName);

	params = {
		_login: '',
		login: prefs.login,
		_password: '',
		password: prefs.password
	};

	params[loginName] = prefs.login;
	params[passwordName] = prefs.password;
	
	html = AnyBalance.requestPost(baseurl + 'security/logon', params, addHeaders({Referer: baseurl + 'security/logon'}));
	
	if (!/logout/i.test(html)) {
		error = getParam(html, null, null, /<div[^>]+class="alert alert-danger"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логін або пароль введені невірно|Логин или пароль введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function fetchCredit(result, prefs, baseurl){
	function getCredit(baseurl, accountKey, eventId){
		var url = baseurl + 'payments/scheduledetails?' +
			'accountKey=' + accountKey +
			'&eventId=' + eventId;

		return AnyBalance.requestGet(url, addHeaders({
			Referer: baseurl,
			'X-Requested-With': 'XMLHttpRequest'
		}));
	}

	var res = AnyBalance.requestGet(baseurl + 'payments/schedule/data', addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(res);

	if(json.length === 0)
		throw new AnyBalance.Error('Не найден ни один кредит.');

	try {
		var credit, creditData, foundCredit;
		for(var i = 0, toi = json.length; i < toi; i++){
			credit = getCredit(baseurl, json[i].LoanId, json[i].EventId);
			creditData = getJson(getParam(credit, null, null, /self\.Data\s*=\s*([^;]+)/i));
			creditData.DateFormatted = json[i].DateFormatted;
			if(!prefs.num || new RegExp(prefs.num + '$').test(creditData.AgreementNumber)){
				foundCredit = creditData;
				break;
			}
		}
	} catch(e) {
		throw new AnyBalance.Error('Ошибка во время поиска кредита. Сайт изменен?');
	}

	if(!foundCredit)
		throw new AnyBalance.Error('Не найден кредит с последними цифрами номера договора ' + prefs.num + '.');

	getParam(foundCredit.AgreementNumber, result, 'agreementNumber');
	getParam(foundCredit.Name, result, 'name');
	getParam(foundCredit.AgreementAmount/100, result, 'agreementAmount');
	getParam(foundCredit.Amount/100, result, 'amount');
	getParam(foundCredit.PaymentAmount/100, result, 'paymentAmount');
	getParam(foundCredit.DueAmount/100, result, 'dueAmount');
	getParam(foundCredit.Currency, result, ['currency', 'agreementAmount', 'amount', 'paymentAmount', 'dueAmount']);
	getParam(foundCredit.DateFormatted, result, 'payDate', null, null, parseDate);
}