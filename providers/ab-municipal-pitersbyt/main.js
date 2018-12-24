/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Петербургской сбытовой компании

Сайт оператора: http://pesc.ru/
Личный кабинет: http://ikus.pesc.ru:8080/IKUSUser/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/46.0.2490.86 safari',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://ikus.pesc.ru/';
    g_headers.Origin = baseurl.replace(/\/+$/, '');

    checkEmpty(prefs.login, 'Введите e-mail!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');    

    var html = AnyBalance.requestGet(baseurl, g_headers);

    html = AnyBalance.requestPost(baseurl + 'application/authentication', {
		username:	prefs.login,
		password:	prefs.password
	}, addHeaders({Referer: baseurl}));

	var json = getJson(html);
	if(!json.authenticationSuccess){
		AnyBalance.trace(html);
		var error = json.errors.reduce(function(acc, cur) { acc.push(cur.message); return acc; }, []).join(';\n');
		if(error)
			throw new AnyBalance.Error(error, null, /не найден|парол|email/i.test(error));
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

//	html = AnyBalance.requestGet(baseurl + 'application/api/checkAuthentication', addHeaders({Referer: baseurl}));
//	json = getJson(html);

	html = AnyBalance.requestGet(baseurl + 'application/accounts', addHeaders({Referer: baseurl}));
	json = getJson(html);
	var accounts = [];
	for(var st in json){
		accounts.push.apply(accounts, json[st]);
	}

	if(!accounts.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Вы не добавили ни один лицевой счет в личный кабинет.');
	}

	AnyBalance.trace('Found accounts: ' + accounts.length);

	var result = {success: true};

	for(var i=0; i<accounts.length; ++i){
		var acc = accounts[i];
		sumParam(acc.accountNumber, result, 'licschet', null, null, null, aggregate_join);
		var name_balance = 'balance' + (i || ''), name_peni = 'peni' + (i || '')
		var type = acc.providerName;

		AnyBalance.trace('Found account: ' + JSON.stringify(acc));

		if(AnyBalance.isAvailable(name_balance, name_peni)){
			html = AnyBalance.requestPost(baseurl + 'application/accounts/' + type + '/balance', JSON.stringify({
				accountNumber: acc.accountNumber,
				serviceType: acc.serviceName
			}), addHeaders({
				Referer: baseurl,
				'Content-Type': 'application/json'
			}));

			var _json = getJson(html);
			getParam(_json.accountBalance, result, name_balance);
			getParam(_json.accountFine, result, name_peni);
		}

		if(isAvailable('__tariff')){
			html = AnyBalance.requestPost(baseurl + 'application/accounts/' + type + '/address', JSON.stringify({
				accountNumber: acc.accountNumber,
				serviceType: acc.serviceName
			}), addHeaders({
				Referer: baseurl,
				'Content-Type': 'application/json'
			}));

			var _json = getJson(html);
			sumParam(_json.address, result, '__tariff', null, null, null, aggregate_join);
		}

	}

    AnyBalance.setResult(result); 
}