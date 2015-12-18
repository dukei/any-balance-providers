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

function jspath(obj, path, defval){
	var arr = JSONPath(null, obj, path);
	if(!arr.length)
		return defval;
	return arr;
}

function jspath1(obj, path, defval){
	var arr = JSONPath(null, obj, path);
	if(!arr.length)
		return defval;
	return arr[0];
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://program.yousystem.com.ua';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/yousystem/ua/#/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + '/frontend/api/user/login', JSON.stringify(
		{
			lng: 'ua',
			pass: prefs.password,
			prgCode: 'prg2',
			username: prefs.login
		}), addHeaders(
		{
			Origin: baseurl, 
			Referer: baseurl + '/yousystem/ua/', 
			'Content-Type': 'application/json;charset=UTF-8'
		}));

	var json = getJson(html);
	if(json.errorCode != "0"){
		var error = json.msg;
		if (error)
			throw new AnyBalance.Error(error, null, /PERSON_NOT_FOUND/i.test(json.errorCode));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var joinSpace = create_aggregate_join(' ');

	var result = {success: true};

	getParam('' + jspath1(json, '$.response.profile.balances[0].balance'), result, 'balance', null, null, parseBalance);
	getParam(jspath1(json, '$.response.profile.person.email'), result, 'email');
	sumParam(jspath1(json, '$.response.profile.person.lastName'), result, 'fio', null, null, null, joinSpace);
	sumParam(jspath1(json, '$.response.profile.person.firstName'), result, 'fio', null, null, null, joinSpace);
	sumParam(jspath1(json, '$.response.profile.person.middleName'), result, 'fio', null, null, null, joinSpace);
	getParam(jspath1(json, '$.response.profile.person.mobile'), result, 'phone');

	if(jspath1(json, '$.response.lastTransactions[0]')){
		getParam(jspath1(json, '$.response.lastTransactions[0].place.idAsDictLabel'), result, 'lt_where');
		getParam(jspath1(json, '$.response.lastTransactions[0].date'), result, 'lt_date', null, null, parseDateISO);
		getParam(jspath1(json, '$.response.lastTransactions[0].typeAsDictLabel'), result, 'lt_status');
		getParam(jspath1(json, '$.response.lastTransactions[0].lastExtraProcessing.balancesAsString', '0'), result, 'lt_spent', null, null, parseBalance);
		getParam(jspath1(json, '$.response.lastTransactions[0].lastMainProcessing.balancesAsString', '0'), result, 'lt_gain', null, null, parseBalance);

		getParam(jspath1(json, '$.response.lastTransactions[0].lastMainProcessing.wallet.cardNo'), result, '__tariff');
		getParam(jspath1(json, '$.response.lastTransactions[0].lastExtraProcessing.wallet.cardNo'), result, '__tariff');
		getParam(result.__tariff, result, 'cardno');
	}
	
	AnyBalance.setResult(result);
}