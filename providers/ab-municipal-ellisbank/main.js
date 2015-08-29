/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ellisbank.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/public/index.zul', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var formid = getParam(html, null, null, /dt:'([^']*)/, replaceSlashes);
	var action = getParam(html, null, null, /uu:'([^']*)/, replaceSlashes);
	var loginid = getParam(html, null, null, /zul.inp.Textbox','([^']*)',\{id:'loginText/, replaceSlashes);
	var passid = getParam(html, null, null, /zul.inp.Textbox','([^']*)',\{id:'passwordText/, replaceSlashes);
	var submitid = getParam(html, null, null, /zul.inp.Textbox[\s\S]*?zul.wgt.Image','([^']*)/, replaceSlashes);

	var zksid = (new Date().getTime() % 9999) + 1;

	html = AnyBalance.requestPost(baseurl + action, {
		dtid:	formid,
		cmd_0:	'onChange',
		uuid_0:	loginid,
		data_0:	JSON.stringify({"value":prefs.login,"start":prefs.login.length}),
		cmd_1:	'onChange',
		uuid_1:	passid,
		data_1:	JSON.stringify({"value":prefs.password,"start":prefs.password.length}),
		cmd_2:	'onClick',
		uuid_2:	submitid,
		data_2:	'{"pageX":1804,"pageY":56,"which":1,"x":32.40625,"y":16}'
	}, addHeaders({Origin: baseurl, Referer: baseurl + '/public/index.zul', 'ZK-SID': '' + zksid}));

	var errCode = AnyBalance.getLastResponseHeader('ZK-Error');

	var json = getJsonEval(html);
	var redirect, error;
	for(var i=0; i<json.rs.length; ++i){
		var command = json.rs[i];
		if(command[0] == 'redirect'){
			redirect = command[1][0];
		}
		if(command[0] == 'setAttr'){
			error = command[1][2];
		}
	}

	if(redirect)
		html = AnyBalance.requestGet(baseurl + redirect, g_headers);

	if (!/logout/i.test(html)) {
	    if(error)
			throw new AnyBalance.Error(error, null, /Неверные логин/i.test(error));

		var error = errCode && 'Неверные параметры входа (код ' + errCode + ')';
		if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + '/market/personal/personal.zul', g_headers);

	getParam(html, result, 'licschet', /Лицевой счет:([^']*)/i, [replaceSlashes, replaceTagsAndSpaces]);
	getParam(html, result, 'address', /userAddressLabel[^}]*value:'([^']*)/i, [replaceSlashes, replaceTagsAndSpaces]);
	getParam(html, result, 'fio', /userFIOLabel[^}]*value:'([^']*)/i, [replaceSlashes, replaceTagsAndSpaces]);
	getParam(html, result, 'phone', /homePhoneLabel[^}]*value:'([^']*)/i, [replaceSlashes, replaceTagsAndSpaces]);

	html = AnyBalance.requestGet(baseurl + '/market/personal/currentCharge.zul', g_headers);

	getParam(html, result, 'period', /debtHeaderLabel[\s\S]*?[^}]*Задолженность на([^']*)/, [replaceSlashes, replaceTagsAndSpaces]);
	getParam(html, result, '__tariff', /debtHeaderLabel[\s\S]*?[^}]*Задолженность на([^']*)/, [replaceSlashes, replaceTagsAndSpaces]);
	getParam(html, result, 'balance_start', /debtHeaderLabel[\s\S]*?'zul.sel.Listcell'[^\]]*label:'([^']*)/, replaceSlashes, parseBalance);
	getParam(html, result, 'cost', /debtHeaderLabel(?:[\s\S]*?'zul.sel.Listcell'[^\]]*){2}label:'([^']*)/, replaceSlashes, parseBalance);
	getParam(html, result, 'paid', /debtHeaderLabel(?:[\s\S]*?'zul.sel.Listcell'[^\]]*){3}label:'([^']*)/, replaceSlashes, parseBalance);
	getParam(html, result, 'balance', /debtHeaderLabel(?:[\s\S]*?'zul.sel.Listcell'[^\]]*){4}label:'([^']*)/, replaceSlashes, parseBalance);
	getParam(html, result, 'peni', /debtHeaderLabel(?:[\s\S]*?'zul.sel.Listcell'[^\]]*){5}label:'([^']*)/, replaceSlashes, parseBalance);
	
	AnyBalance.setResult(result);
}