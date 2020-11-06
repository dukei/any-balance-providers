/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://private.cosmostv.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');

	var auth_token 	= AB.getParam(html, null, null, /<input[^>]+authenticity_token[^>]+value="([^"]*)/i),
		commit		= AB.getParam(html, null, null, /<input[^>]+authenticity_token[^>]+value="([^"]*)/i);

	if(!commit || !auth_token) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти параметрый запроса. Сайт изменён?");
	}

	html = AnyBalance.requestPost(baseurl + 'login', {
		'utf8': 			  '✓',
		'authenticity_token': auth_token,
		'user[login]': 		  prefs.login,
		'user[password]': 	  prefs.password,
		'commit': 			  commit
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/application\.init/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+error_container[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	//Пока не встречали новые ЛК с несколькими аккаунтами.
	/*if(prefs.account) {
		var contractsForm = getParam(html, null, null, /<form id="frm_contracts"[\s\S]*?<\/form>/i);
		action = getAction(contractsForm);
		
		var id = getParam(contractsForm, null, null, new RegExp('option value="(\\d+)[^>]*>\\s*' + prefs.account,'i'))
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'id_contract') 
				return id;

			return value;
		});
		
		html = AnyBalance.requestPost(action, params, addHeaders({Referer: baseurl + 'group/cosmostv/main'}));
	}*/
	
	var result = {success: true};

	//Находим номер аккаунта и переходим на страницу с конктерной информацией по нему.
	var text 	= AB.getParam(html, /application\s*=\s*[^\(]*\(([\s\S]*?),\s*\{loglevel/i),
		json 	= getJsonEval(text),
		account = json.data.personal_accounts[0],
		token 	= AB.getParam(html, /<meta[^>]+csrf-token[^>]+content="([^"]*)/i);

	if(!token || !account.vc_account) {
		throw new AnyBalance.Error("Не удалось найти параметры запроса. Сайт изменён?")
	}

	html = AnyBalance.requestGet(baseurl + 'accounts/' + account.vc_account + '?_=' + new Date().getTime(), addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-CSRF-Token': token
	}));

	json = getJson(html);
	var current_acc = json.data.personal_account,
		internet    = json.data.servs;

	if(current_acc) {
		AB.getParam(current_acc.n_sum_bal + '', 		result, 'balance', 	   null, null, AB.parseBalance);
		AB.getParam(current_acc.n_sum_reserved + '', 	result, 'reserved',    null, null, AB.parseBalance);
		AB.getParam(current_acc.n_recommended_pay + '', result, 'recommended', null, null, AB.parseBalance);
		AB.getParam(current_acc.d_accounting_begin, 	result, 'date_start',  null, null, AB.parseDateISO);
		AB.getParam(current_acc.d_accounting_end, 		result, 'date_end',    null, null, AB.parseDateISO);
		AB.getParam(current_acc.vc_account, 			result, 'account');
		AB.getParam(current_acc.vc_subj_name, 			result, 'fio');
	} else AnyBalance.trace("Не удалось найти информацио о контракте. Сайт изменён?");

	if(internet && internet[0]) {
		AB.getParam(internet[0].n_good_sum + '', result, 'cost', 	null, null, AB.parseBalance);
		AB.getParam(internet[0].vc_name, 		  result, '__tariff');
	} else AnyBalance.trace("Не удалось найти инфомацию о тарифе. Сайт изменён?");

	AnyBalance.setResult(result);
}