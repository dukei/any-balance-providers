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

var g_baseurl = 'http://eirczhukovskiy.ru/';

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(g_baseurl + 'modules/alcom_konsalt', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 404){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = getParam(html, null, null, /<form[^>]+id="user-login"[^>]*>([\s\S]*?)<\/form>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'name') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(g_baseurl + 'modules/alcom_konsalt', params, addHeaders({Referer: g_baseurl + 'modules/alcom_konsalt'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+messages--error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function processInfo(result){
	if(AnyBalance.isAvailable('fio', 'email', 'phone', 'passport')){
		var html = AnyBalance.requestGet(g_baseurl + 'user', g_headers);
		var href = getParam(html, null, null, /\/(user\/\w+\/edit)/i, null, html_entity_decode);
		if(!href){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти таблицу начислений. Сайт изменен?');
		}
	    
		html = AnyBalance.requestGet(g_baseurl + href, g_headers);
		getParam(html, result, 'fio', /<input[^>]+name="alcom_konsalt_fio"[^>]*value="([^"]*)/i, null, html_entity_decode);
		getParam(html, result, 'email', /<input[^>]+name="mail"[^>]*value="([^"]*)/i, null, html_entity_decode);
		getParam(html, result, 'phone', /<input[^>]+name="alcom_konsalt_tel"[^>]*value="([^"]*)/i, null, html_entity_decode);
		getParam(html, result, 'passport', /<input[^>]+name="alcom_konsalt_pasport"[^>]*value="([^"]*)/i, null, html_entity_decode);
	}
}


function processAccounts(result){
	if(AnyBalance.isAvailable('accounts')){
		var html = AnyBalance.requestGet(g_baseurl + 'modules/alcom_konsalt/lite', g_headers);
		var table = getElement(html, /<div[^>]+id="alcom-tabs-lite-2"[^>]*>/i);
		if(!table){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти таблицу начислений. Сайт изменен?');
		}
	    
		var idsProcessed = {};
		result.accounts = [];
	    
		var groups = sumParam(table, null, null, /<tr[^>]+class="alcom-lite-row-head"[\s\S]*?<tr[^>]+class="alcom-lite-row-bottom"[^>]*>/ig);
		for(var i=0; i<groups.length; ++i){
			var licschet = getParam(groups[i], null, null, /по ЛС[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
			var name = getParam(groups[i], null, null, /Сч[ёе]т-квитанция за([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
			AnyBalance.trace('Found bill ' + name + ' (' + licschet + ')');

			if(idsProcessed[licschet]){
				AnyBalance.trace('...already processed this account, skipping');
				continue;
			}

			var acc = {__id: licschet, __name: name};
			idsProcessed[licschet] = acc;
	    
			if(__shouldProcess('accounts', acc)){
				getParam(groups[i], acc, 'accounts.period', /Сч[ёе]т-квитанция за[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseDateWord); 
				getParam(groups[i], acc, 'accounts.debt', /долг на[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); 
				getParam(groups[i], acc, 'accounts.paid', /оплачено:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); 
				getParam(groups[i], acc, 'accounts.bill', /начислено за[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); 
				getParam(groups[i], acc, 'accounts.balance', /итого к оплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); 


			}

			result.accounts.push(acc);
		}

		if(AnyBalance.isAvailable('accounts.address', 'accounts.fio', 'accounts.type', 'accounts.sqfull', 'accounts.sqlive', 'accounts.inhabit')){
			var idsInfoProcessed = {};
			var table = getElement(html, /<div[^>]+id="alcom-tabs-lite-1"[^>]*>/i);
			if(!table){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось найти таблицу основных данных. Сайт изменен?');
			}
		    
			var groups = sumParam(table, null, null, /<tr[^>]+class="alcom-lite-row-head"[\s\S]*?<tr[^>]+class="alcom-lite-row-bottom"[^>]*>/ig);
			for(var i=0; i<groups.length; ++i){
				var licschet = getParam(groups[i], null, null, /по ЛС[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
				var name = getParam(groups[i], null, null, /Сч[ёе]т-квитанция за([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
				AnyBalance.trace('Found data ' + name + ' (' + licschet + ')');
				if(idsInfoProcessed[licschet]){
					AnyBalance.trace('...already processed this account, skipping');
					continue;
				}
		    
				idsInfoProcessed[licschet] = true;
				var acc = idsProcessed[licschet];
				if(!acc){
					AnyBalance.trace('...missed this account, skipping');
					continue;
				}
	        
				if(__shouldProcess('accounts', acc)){
					getParam(groups[i], acc, 'accounts.address', /Адрес:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
					getParam(groups[i], acc, 'accounts.fio', /Ф.И.О.:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
					getParam(groups[i], acc, 'accounts.type', /Тип квартиры:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
					getParam(groups[i], acc, 'accounts.sqfull', /Общ.пл.:[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance); 
					getParam(groups[i], acc, 'accounts.sqlive', /жилая пл.:[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance); 
					getParam(groups[i], acc, 'accounts.inhabit', /Зарегистрировано\/проживает:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); 
				}
			}
		}
	}
}
