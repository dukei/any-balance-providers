/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://netbanking.mashreqbank.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'B001/ENULogin.jsp', g_headers);
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'fldLoginUserId')
			return prefs.login;
		else if(name == 'fldRequestId')
			return 'RRLGN01';
		else if(name == 'fldDeviceId')
			return '01';
		else if(name == 'fldLangId')
			return 'eng';
		else if(name == 'fldPortalCode')
			return 'PCR01';
		else if(name == 'fldlitever')
			return 'L';
		return value;
	});
	// Это надо сделать после, иначе fldEncrKey == undefined
	params.fldPassword = encrypt(prefs.password, params.fldEncrKey);
	html = AnyBalance.requestPost(baseurl + 'B001/internet', params, addHeaders({Referer: baseurl + 'B001/ENULogin.jsp'})); 
	
	var paramss = createFormParams(html, function(paramss, str, name, value){
		if(name == 'fldServiceType')
			return 'ASM';
		else if(name == 'fldRequestId')
			return 'RRASM01';
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'B001/internet', paramss, addHeaders({Referer: baseurl + 'B001/ENULogin.jsp'})); 
	
    if(!/Relationship Summary/i.test(html)){
        throw new AnyBalance.Error('Can`t login to selfcare, site changed?');
    }
	
	var result = {success: true};
	getParam(html, result, 'salaam', /You have([\s\S]*?)Salaam Points/i, replaceTagsAndSpaces, parseBalance);
	
    if(prefs.type == 'card')
		processCard(html, result);
	else if(prefs.type == 'acc')
		processAccount(html, result);
	/*else if(prefs.type == 'dep')
		processDep(html, baseurl);
	else if(prefs.type == 'crd' || prefs.type == 'credit')
		processCredit(html, baseurl);*/
	else 
		processCard(html, result);
}

function hideNumber(str) {
	str = str.replace(/(\d{7})\d{5}(\d+)/i, '$1***$2');
}

function processCard(html, result){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

	var table = getParam(html, null, null, /(<table[^>]*>([^>]*>){5}My\s*Cards[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Cant find any cards!');
	//AnyBalance.trace(table);
    var re = new RegExp('(<div[^>]*(?!<\\/tr>)class="additionalInfo([^>]*>){5}\\d+' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(table, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Cant find ' + (prefs.cardnum ? 'card with digits ' + prefs.cardnum : 'any card'));
	//AnyBalance.trace(tr);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, hideNumber);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, hideNumber);
	getParam(tr, result, 'cardtype', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'cred_limit', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'outstanding', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}

function processAccount(html, result){
    var prefs = AnyBalance.getPreferences();
    //if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        //throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

	var table = getParam(html, null, null, /(<table[^>]*>([^>]*>){5}My\s*Accounts[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Cant find any cards!');
	//AnyBalance.trace(table);
    /*var re = new RegExp('(<div[^>]*(?!<\\/tr>)class="additionalInfo([^>]*>){5}\\d+' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(table, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Cant find ' + (prefs.cardnum ? 'card with digits ' + prefs.cardnum : 'any card'));*/
	var tr = table;
	
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, hideNumber);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, hideNumber);
	
	getParam(tr, result, 'iban', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}






function  integer (n) {
	return n%(0xffffffff+1);
}

function encrypt (password, key) {
		var fromChar;
		var toChar;
		var l_length;
		var l_count=0;
		if (password.length > key.length) {
			l_length = password.length
		} else {
			l_length = key.length
		}

		var encryptedString = new Array (l_length);
		var retString = '';
						
		for (i=0; i<l_length; i++) {
			l_count++;
			if (i >= password.length) {
				fromChar = integer (10);
			} else {
				fromChar = password.charCodeAt (i);
			}
			
			if (i >= key.length) {
				toChar = integer (9);
			} else {
				toChar = key.charCodeAt (i);
			}
			
			if (toChar == 9) {
				encryptedString[i] = toChar;
			} else if (fromChar == 10) {
				l_count--;
				break;
			}

			
			encryptedString[i] = fromChar ^ toChar;

			if(i==0){
				retString = encryptedString[i];
			} else{
				retString = retString + 'a' + encryptedString[i];
			}
		}

		return retString;
	}