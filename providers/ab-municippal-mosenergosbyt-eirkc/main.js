
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
	mainLKKZKH();
//	mainSmorodina();
	// if(prefs.site == 'smor'){
	// 	mainSmorodina();
	// }else{
	// 	mainLKMO();
	// }
}

var baseurl; 

function getApiData(url, params){
	var html = AnyBalance.requestPost(baseurl + url + '&_dc=' + new Date().getTime(), params, addHeaders({
		Referer: baseurl + 'main/'
	}));

	var json = getJson(html);

    if(!json.success){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка апи');
    } 

	return json.data[0];
}

function mainLKKZKH() {
	var prefs = AnyBalance.getPreferences();

	baseurl = 'https://lkk-zkh.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите е-mail!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'lkcom_data?action=auth', {
		nm_email:	prefs.login,
        nm_psw: hex_md5(prefs.password),
		nm_captcha_res:	'ok'
	}, addHeaders({
		Referer: baseurl + 'auth/'
	}));

	var json = getJson(html);
	if(!json.success){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var sid = json.data[0].session;
	if(!sid){
		var error = json.data[0].nm_result;
		if (error) 
			throw new AnyBalance.Error(error, null, /неверный логин/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить сессию. Сайт изменен?');
	}
	var id_abonent;

	var result = {
		success: true
	};

	if(isAvailable('licschet', 'balance', 'currency', '__tariff')){
		json = getApiData('lkcom_data?action=sql&query=lka_get_houses', {
			page:	'1',
			start:	'0',
			limit:	'25',
			session: sid
		});

		json = getJson(json.house);
		getParam(json.nm_address, result, '__tariff');
		getParam('' + json.services[0].nn_ls, result, 'licschet');

		var jsonProvider = getJson(json.services[0].vl_provider);
		id_abonent = jsonProvider.id_abonent;
	}

	if(AnyBalance.isAvailable('fio')){
		json = getApiData('lkcom_data?action=sql&query=lka_get_profile_attributes', {
			session: sid
		});

		var aggregate_space = create_aggregate_join(' ');
		sumParam(json.nm_first || undefined, result, 'fio', null, null, null, aggregate_space);
		sumParam(json.nm_middle || undefined, result, 'fio', null, null, null, aggregate_space);
		sumParam(json.nm_last || undefined, result, 'fio', null, null, null, aggregate_space);
	}

	if(AnyBalance.isAvailable('balance', 'currency')){
		json = getApiData('lkcom_data?action=sql&query=SmorodinaProxy&plugin=smorodinaProxy', {
			json:	JSON.stringify({"name":"qLkkUtilAbonentBalance","org":-1,"params":{"id_abonent":id_abonent,"dt_period":""},"out_params":{}}),
			session: sid
		});

		getParam(json.sm_all, result, 'balance');
		getParam('руб', result, 'currency');
	}

	AnyBalance.setResult(result);
}


function mainSmorodina() {
	var prefs = AnyBalance.getPreferences();
	//https://мо.смородина.онлайн/
	var baseurl = 'https://xn--l1ae.xn--80ahmohdapg.xn--80asehdb/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите е-mail!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'pages/abonent/login.jsf', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+f_login_abon[^>]*>/i);
	if (!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (/:eLogin$/i.test(name))
			return prefs.login;
		else if (/:ePwd$/i.test(name))
			return prefs.password;

		return value;
	});

	var bid = getParam(form, null, null, /<button[^>]+name="([^"]*)[^>]*submit/i, null);
	params['javax.faces.partial.ajax'] = 'true';
	params['javax.faces.source'] = bid;
	params['javax.faces.partial.execute'] = 'f_login_abon:pLogin';
	params['javax.faces.partial.render'] = 'f_login_abon';
	params[bid] = bid;

	html = AnyBalance.requestPost(baseurl + 'pages/abonent/login.jsf', params, addHeaders({
		Referer: baseurl + 'pages/abonent/login.jsf',
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'application/xml, text/xml, */*; q=0.01',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	var urlresult = getParam(html, null, null, /<redirect[^>]+url="([^"]*)/i, null);

	if (!urlresult) {
		var error = getParam(html, null, null, /<div[^>]+ui-messages-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) {
			throw new AnyBalance.Error(error, null, /несуществующий e-mail|Вы не зарегистрированы|неверная комбинация|парол/i.test(error));
		}


		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'pages/abonent/accounts/accountInfo.jsf?faces-redirect=true', g_headers);

	if (!/Выход/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось перейти в личный кабинет. Сайт изменен?');
	}

	var
		current_id = AB.getParam(html, null, null,
			/<option[^>]*value="([^"]*)"[^>]*selected[^>]*>/i),
		enteredValue,
		selectTag,
		optionArray = [],
		isIncluded,
		viewStateToken,
		selected_id;

	if (prefs.account) {
		enteredValue = AB.getParam(prefs.account, null, null, /(\d{7}\d*)/i);
	}

	if (enteredValue && enteredValue != current_id) {
		selected_id = enteredValue;
	}

	AnyBalance.trace(current_id);

	if (selected_id) {
		AnyBalance.trace('указан лицевой счёт ' + selected_id);

		selectTag = AB.getElement(html, /<select[^>]*id="[^"]*id[^"]*"[^>]*>/i);
		optionArray = AB.sumParam(selectTag, null, null, /<option[^>]*value="([^"]*)"[\s\S]*?<\/option>/gi);

		for (var i = 0; i < optionArray.length; ++i) {
			if (optionArray[i] === selected_id) {
				isIncluded = 'совпадение найдено';
				AnyBalance.trace(isIncluded);
				break;
			}
		}


		/*
		"46032660">46032660</option>
			<option value="46032695" selected="selected">46032695</option>
			<option value="46032200">46032200</option>
			<option value="46032709">46032709</option>
		*/

		if (isIncluded) {
			AnyBalance.trace('переход по указанному лицевому счёту = ' + selected_id);

			viewStateToken = getParam(html, null, null, /<input[^>]*id="j_id1:javax.faces.ViewState:0"[^>]*value="([^"]*)"[^>]*>/i);
			AnyBalance.trace(viewStateToken);
			//https://xn--l1ae.xn--80ahmohdapg.xn--80asehdb/pages/abonent/accounts/accountInfo.jsf
			//https://xn--l1ae.xn--80ahmohdapg.xn--80asehdb/pages/abonent/accounts/accountInfo.jsf
			html = AnyBalance.requestPost(baseurl + 'pages/abonent/accounts/accountInfo.jsf', {
				'javax.faces.partial.ajax': true,
				'javax.faces.source': 'f_head:j_idt66',
				'javax.faces.partial.execute': 'f_head:j_idt66',
				'javax.faces.partial.render': '@all',
				'javax.faces.behavior.event': 'change',
				'javax.faces.partial.event': 'change',
				'f_head': 'f_head',
				'f_head:j_idt66': selected_id,
				'javax.faces.ViewState': viewStateToken
			}, AB.addHeaders({
				Referer: baseurl + 'pages/abonent/accounts/accountInfo.jsf?faces-redirect=true'
			}));

			current_id = selected_id;

		} else {
			AnyBalance.trace('указанный лицевой счёт не найден. Будет отображена информация для лицевого счёта по умолчанию');
		}

	}

	var result = {
		success: true
	};


	getParam(html, result, 'fio', /Владелец счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(current_id, result, 'licschet', null, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Итого к оплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Итого к оплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

	AnyBalance.setResult(result);
}


/*   Данный лк вроде как закрыт
function mainLKMO() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.lkmo.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите лицевой счет!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ls')
			return prefs.login;
		else if (name == 'ps')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl, params, addHeaders({
		Referer: baseurl
	}));

	if (!/exit\.png/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	getParam(html, result, 'fio', /'ttlfio'(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /((?:переплата|Задолженность)(?:[^>]*>){2}[^<]+)/i, [replaceTagsAndSpaces, /Задолженность(.+)/i, '-$1'],
		parseBalance);

	AnyBalance.setResult(result);
}
*/
