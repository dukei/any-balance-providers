/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.81 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://mobile.lebara.com/es/es/';
	
	// Да уж, такой авторизации я еще не видел.
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	var csrf = getParam(html, /<input[^>]+CSRFToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	if(!csrf){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not find login form. Is the site changed?');
	}
	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
		j_username:	prefs.login,
		j_password:	prefs.password,
		CSRFToken:	csrf
	}, addHeaders({Referer: AnyBalance.getLastUrl()}));

    if(!/Logout/i.test(html)){
        var error = getElement(html, /<div[^>]+alert/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /incorrect/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not log in. Wrong login or password or site might be changed.');
    }
    
    var result = {success: true};
	
	getParam(getElement(html, /<span[^>]+my-lebara-plan-title/i), result, '__tariff', null, replaceTagsAndSpaces);
	getParam(getElement(html, /<span[^>]+dashboard-current-balance/i), result, 'balance', null, replaceTagsAndSpaces, parseBalance);

	var tbl = getElements(html, [/<div[^>]+class="container"/ig, /Saldo Disponible/i])[0];
	if(tbl){
		var rows = getElements(tbl, /<tr[^>]+border-bottom-table-row/ig);
		for(var i=0; i<rows.length; ++i){
			var cells = getElements(rows[i], /<td/ig, replaceTagsAndSpaces);
			AnyBalance.trace('Found allowance: ' + cells.join(' '));
			var name = cells[0];
			var val = cells[1];
			var till = cells[2];

			if(/SP Data_Internet|datos/i.test(name)){
				getParam(val, result, 'internet_left', null, null, parseBalance);
			}else if(/SP Data/i.test(name) && /Special/i.test(name)){
				getParam(val, result, 'internet_special', null, null, parseBalance);
			}else if(/SP L2L Voice|Minut/i.test(name)){
				getParam(val, result, 'voice', null, null, parseBalance);
			}else{
				AnyBalance.trace('^^^ allowance is unknown, skipping...');
			}
		}
	}

    AnyBalance.setResult(result);
}