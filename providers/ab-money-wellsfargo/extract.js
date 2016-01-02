/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.130 Safari/537.36',
};

function n2(n){
	return (n < 10 ? '0' : '') + n;
}

function handleRedirectIfNeeded(html){
	var redirect = getParam(html, null, null, /<meta[^>]+http-equiv="Refresh"[^>]*content="\d+;URL=([^"]*)/i, null, html_entity_decode);
	if(redirect)
		html = AnyBalance.requestGet(redirect, addHeaders({Referer: AnyBalance.getLastUrl()}));
	return html;
}

function login() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.wellsfargo.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + '/das/cgi-bin/session.cgi?screenid=SIGNON_PORTAL_PAUSE', g_headers);
	html = handleRedirectIfNeeded(html); 

	if((!/signoff/i.test(html) || /<div[^>]+id="sessiontimeout"/i.test(html)) && !/<form[^>]+name="signon"/i.test(html)){
		var html = AnyBalance.requestGet(baseurl, g_headers);
		html = handleRedirectIfNeeded(html);
	}

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting provider site. Try to refresh later.');
	}

	if(!/signoff/i.test(html)){
		var form = getParam(html, null, null, /<form[^>]+name="signon"[\s\S]*?<\/form>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find signon form. Is the site changed?');
		}
		
		var dt = new Date();
		var dt_str = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear() + ', ' + n2(dt.getHours()) + ':' + n2(dt.getMinutes()) + ':' + n2(dt.getSeconds());
		var userPrefs = 'TF1;015;;;;;;;;;;;;;;;;;;;;;;Mozilla;Netscape;5.0%20%28Windows%20NT%2010.0%3B%20WOW64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/44.0.2403.130%20Safari/537.36;20030107;undefined;true;;true;Win32;undefined;Mozilla/5.0%20%28Windows%20NT%2010.0%3B%20WOW64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/44.0.2403.130%20Safari/537.36;ru;windows-1251;www.wellsfargo.com;undefined;undefined;undefined;undefined;false;false;' + new Date().getTime() + ';3;07.06.2005%2C%2022%3A33%3A44;1920;1080;;18.0;;;;;6;-180;-180;' + encodeURIComponent(dt_str) + ';24;1920;1040;0;0;;;;;;Shockwave%20Flash%7CShockwave%20Flash%2018.0%20r0;;;;;;;;;;;;;15;';
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'j_username') 
				return prefs.login;
			else if (name == 'j_password')
				return prefs.password;
		    else if(name == 'u_p')
		    	return userPrefs;
		    else if(name == 'btnSignon')
		    	return;
		    else if(name == 'jsenabled')
		    	return 'true';
	     
			return value;
		});
		
		html = AnyBalance.requestPost('https://connect.secure.wellsfargo.com/auth/login/do', params, addHeaders({Origin: baseurl, Referer: baseurl + '/'}));
		html = handleRedirectIfNeeded(html);
	    
		if (!/"bobcmn"/i.test(html) && !/signoff/i.test(html)) {
			var error = getParam(html, null, null, /<div[^>]+class="alert"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error, null, /username and\/or password/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
		}
	    
		html = handleBobcmn(AnyBalance.getLastUrl(), html);
		html = handleRedirectIfNeeded(html);
	}else{
		AnyBalance.trace('Already logged in. Using this session');
	}

	if(!/signoff/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Failed to enter personal account. Is the site changed?');
	}
	return html;
}

function processInfo(html, result){
	getParam(html, result, 'total', /<td[^>]+id="cashTotalAvailBalance[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
}

function processAccountBalances(html, result){
	var accs = getElements(html, [/<tr[^>]*>/ig, /<th[^>]+id="(?:cash|credit)Account\d+"/i]);
	AnyBalance.trace('Found ' + accs.length + ' accounts');
	if(accs.length)
		result.accounts = [];

	for(var i=0; i<accs.length; ++i){
		var acc = accs[i];
		var name = getParam(acc, null, null, /<a[^>]+class="account"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
		var a = {
			__id: name,
			__name: name
		};
		if(__shouldProcess('accounts', a)){
			processAccountBalance(acc, a);
		}

		result.accounts.push(a);
	}
}

function processAccounts(html, result){
	if(AnyBalance.isAvailable('accounts.transactions', 'accounts.ofx', 'accounts.ofx_json', 'accounts.realnum', 'accounts.type')){
		var url = getParam(html, null, null, /<a[^>]+href="([^"]*ViewMoreServices[^"]*)/i, null, html_entity_decode);
		if(!url)
			throw new AnyBalance.Error('Could not find reference to View More Services. Is the site changed?');
                                             
		html = AnyBalance.requestGet(url, addHeaders({Referer: AnyBalance.getLastUrl()}));
		url = getParam(html, null, null, /<a[^>]+href="([^"]*EXEC_DOWNLOAD[^"]*)/i, null, html_entity_decode);
		if(!url)
			throw new AnyBalance.Error('Could not find reference to Download Account Activity. Is the site changed?');
	    
		html = AnyBalance.requestGet(url, addHeaders({Referer: AnyBalance.getLastUrl()}));
		var select = getParam(html, null, null, /<select[^>]+id="primaryKey"[^>]*>([\s\S]*?)<\/select>/i);
		if(!select){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find account select box. Is the site changed?');
		}
	    
		var accs = sumParam(select, null, null, /<option[\s\S]*?<\/option>/ig);
		if(accs.length && !result.accounts)
			result.accounts = [];
			
		for(var i=0; i<accs.length; ++i){
			var acc = accs[i];
			var id = getParam(acc, null, null, /value="([^"]*)/i, null, html_entity_decode);
			var name = getParam(acc, null, null, null, replaceTagsAndSpaces, html_entity_decode);

			var a = findAccount(result.accounts, name), found = true;
			if(!a){
				found = false;
			 	a = {__id: name, __name: name};
			}

			if(__shouldProcess('accounts', a)){
				processAccount(html, a, id);
			}
	    
	        if(!found){
				result.accounts.push(a);
			}
		}
	}
}

function findAccount(accs, id){
	for(var i=0; i<accs.length; ++i){
		if(accs[i].__id == id)
			return accs[i];
	}
	return null;
}

function processAccountBalance(html, result){
	if(/<th[^>]+id="creditAccount/i.test(html)){
		//credit
		getParam(html, result, 'accounts.own', /<td[^>]+id="creditOutstandingBalance[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.balance', /<td[^>]+id="creditAvailableCredit[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}else{
		//cash
		getParam(html, result, 'accounts.balance', /<td[^>]+id="cashAvailBal[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	getParam(result.__name, result, 'accounts.num', /(\S+)$/);
}

function processAccount(html, result, id){
	var form = getParam(html, null, null, /<form[^>]+id="accountActivityDownloadModel"[^>]*>[\s\S]*?<\/form>/i);
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i);
	var select = getParam(form, null, null, /<select[^>]+id="primaryKey"[^>]*>([\s\S]*?)<\/select>/i);
	var selected = getParam(select, null, null, /<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(selected != result.__id){
		AnyBalance.trace('Selected account is: ' + selected + ' and we need ' + result.__id);
		//Need to select account
		html = AnyBalance.requestPost(action, {
			primaryKey: id,
			Select: '   Select   '
		}, g_headers);
	}else{
		AnyBalance.trace('Account ' + result.__id + ' is already selected');
	}

	var form = getParam(html, null, null, /<form[^>]+id="accountActivityDownloadModel"[^>]*>[\s\S]*?<\/form>/i);
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i);

	var periodMonths = getParam(html, null, null, /download up to (\d+) month/i, null, parseBalance) || 0;
	var periodDays = getParam(html, null, null, /download up to (\d+) day/i, null, parseBalance) || 0;
	var dt = new Date();
	var dtFrom = new Date(dt.getFullYear(), dt.getMonth()-periodMonths, dt.getDate()-periodDays);

	html = AnyBalance.requestPost(action, {
		primaryKey: id,
		fromDate: n2(dtFrom.getMonth()+1) + '/' + n2(dtFrom.getDate()) + '/' + n2(dtFrom.getFullYear() - 2000),
		toDate: n2(dt.getMonth()+1) + '/' + n2(dt.getDate()) + '/' + n2(dt.getFullYear() - 2000),
		fileFormat: 'quickenOfx',
		Download: 'Download'
	}, g_headers);

	var ofx = new OFX();
	var ofx_json = ofx.ofx2json(html);

	getParam(ofx_json, result, 'accounts.ofx_json');
	getParam(html, result, 'accounts.ofx');

	if(AnyBalance.isAvailable('accounts.transactions', 'accounts.realnum', 'accounts.type')){
		result.transactions = [];
		var trns;
		if(ofx_json.body.BANKMSGSRSV1){ //Account
			trns = ofx_json.body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;
			getParam(ofx_json.body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.ACCTID, result, 'accounts.realnum');
			getParam(ofx_json.body.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.ACCTTYPE, result, 'accounts.type');
		}
		if(ofx_json.body.CREDITCARDMSGSRSV1){ //CreditCard
			trns = ofx_json.body.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS.BANKTRANLIST.STMTTRN;
			getParam(ofx_json.body.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS.CCACCTFROM.ACCTID, result, 'accounts.realnum');
			getParam('CREDITCARD', result, 'accounts.type');
		}

		if(trns){
			for(var i=0; i<trns.length; ++i){
				var t = {};
				getParam(trns[i].TRNTYPE, t, 'accounts.transactions.type');
				getParam(trns[i].DTPOSTED, t, 'accounts.transactions.date', null, [/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\.(\d\d\d)/, '$1-$2-$3T$4:$5:$6.$7'], parseDateISO);
				getParam(trns[i].TRNAMT, t, 'accounts.transactions.sum', null, null, parseBalance);
				getParam(trns[i].FITID, t, 'accounts.transactions.id');
				getParam(trns[i].NAME, t, 'accounts.transactions.name');
				getParam(trns[i].MEMO, t, 'accounts.transactions.descr');
				result.transactions.push(t);
			}
		}else{
			AnyBalance.trace("Do not know where transactions are: " + html);
		}
	}
}