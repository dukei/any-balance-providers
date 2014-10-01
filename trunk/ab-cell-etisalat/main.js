/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

var g_errors = {
    "UserNameMustBe": "User name must be at least 5 and at most 8 characters long",
    "PasswordMustBe": "Password must be at least 5 and at most 8 characters long",
    "loginValidation": "Please enter valid user name and password",
    "duplicatelogin": "You are already logged in...",
    "loginAttemptsExceeded": "User name must be at least 5 and at most 8 characters long",
    "loginFailed": "Login or password is invalid. Please try again...",
    "UserNameMustBe": "User name must be at least 5 and at most 8 characters long",
    "UserNameMustBe": "User name must be at least 5 and at most 8 characters long",
    "loginAttemptsExceeded": "You have exceeded the maximum number of unsucessfull Login attempts. Please try again later",
    "Login.BlacklistedCustomer": "Login failed. Kindly visit an eShop Coordinator at your nearest Business Center for further assistance"
};

var g_isPrepayed = true;

function createJSRedirectParams(html) {
	var table = getParam(html, null, null, /var table\s*=\s*"([^"]+)/i);
	var c = getParam(html, null, null, /var c\s*=\s*(\d+)/i);
	var slt = getParam(html, null, null, /var slt\s*=\s*"([^"]+)/i);
	var hash = getParam(html, null, null, /elements\[1\].value="([^"]+)/i);
	var s1 = getParam(html, null, null, /var s1\s*=\s*'([^']+)/i);
	var s2 = getParam(html, null, null, /var s2\s*=\s*'([^']+)/i);
	
	var params2 = createFormParams(html, function(params, str, name, value) {
		if (/.+_cr/.test(name))
			return test(table, c, slt, hash, s1, s2);
		return decodeURIComponent(value);
	}, true);
	
	return params2;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter login, please!');
	checkEmpty(prefs.password, 'Enter password, please!');
	
    var baseurl = "https://onlineservices.etisalat.ae/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var result = {success: true};
	
    try{
		var html = AnyBalance.requestGet(baseurl + 'scp/', g_headers);
		var form = getParam(html, null, null, /<form id="atg_store_registerLoginForm"[\s\S]*?<\/form>/i);
		var action = getParam(html, null, null, /action="\/([^"]+)"/i);
		
		checkEmpty(form && action, 'Can`t find login form, is the site changed?', true);
		
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'atg_store_registerLoginEmailAddress') 
				return prefs.login;
			else if (name == 'atg_store_registerLoginPassword')
				return prefs.password;

			return value;
		});		
		
        html = AnyBalance.requestPost(baseurl + action, params, addHeaders({Referer: baseurl + 'scp/index.jsp'})); 
		
		if(/<form method="POST" action="%2fscp%2findex.jsp/i.test(html)) {
			AnyBalance.trace('Javascript redirect requested...');
			
			var table = getParam(html, null, null, /var table\s*=\s*"([^"]+)/i);
			var c = getParam(html, null, null, /var c\s*=\s*(\d+)/i);
			var slt = getParam(html, null, null, /var slt\s*=\s*"([^"]+)/i);
			var hash = getParam(html, null, null, /elements\[1\].value="([^"]+)/i);
			var s1 = getParam(html, null, null, /var s1\s*=\s*'([^']+)/i);
			var s2 = getParam(html, null, null, /var s2\s*=\s*'([^']+)/i);
			
			var params2 = createFormParams(html, function(params, str, name, value) {
				if (/.+_cr/.test(name))
					return test(table, c, slt, hash, s1, s2);

				return decodeURIComponent(value);
			});
			
			html = AnyBalance.requestPost(baseurl + action, params2, addHeaders({Referer: baseurl + 'scp/index.jsp'})); 
		}
		
		if(/Change Security Question\/Answer/i.test(html))
			throw new AnyBalance.Error('You need to change Security Question/Answer in your personal account to allow application to show information from this account. Please visit the selfcare from desktop and follow the instructions.');
		
		if(/changeExpiredPassword/i.test(html))
			throw new AnyBalance.Error('You need to change your password. Please visit the selfcare from desktop and follow the instructions.');
		
        if(!/Logout/i.test(html)){
            var errid = getParam(html, null, null, /location\.href='[^']*MSG=([^']*)/i, replaceSlashes);
            if(g_errors[errid])
                throw new AnyBalance.Error(g_errors[errid]);
			
			var error = getParam(html, null, null, /class="errorMessage"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error, null, /Either user ID or password is incorrect/i.test(error));			
			
            //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
            throw new AnyBalance.Error('The login attempt has failed. Is the site changed?');
        }
        // Это предоплата
        html = AnyBalance.requestGet(baseurl + 'scp/myaccount/accountoverview.jsp');
		// Теперь добавили защиту от роботов
		
		var form = getParam(html, null, null, /<form method="POST"[\s\S]*?<\/form>/i);
		AnyBalance.trace('form is ' + form);
		if(form) {
			AnyBalance.trace('Javascript redirect requested...');
			var params = createJSRedirectParams(html);
			params['TSd21a69_rf'] = 'https://onlineservices.etisalat.ae/scp/index.jsp?locale=en_AE&source=login&qp_st=&qp_an=&_requestid=2264972'
			
			html = AnyBalance.requestPost(baseurl + 'scp/myaccount/accountoverview.jsp', params, addHeaders({Referer: baseurl + 'scp/myaccount/accountoverview.jsp'}));		
		}
		
		// Это пост оплата
		if(/There is no pre paid account available/i.test(html)) {
			g_isPrepayed = false;
			AnyBalance.trace('There is no pre paid account available... We are in post paid selfcare');
			
			html = AnyBalance.requestGet(baseurl + 'accounts');
		}
        // accountSummaryDetails\.jsp\?accountBackendId=\d+1127[\s\S]*?</tr>
        var re = new RegExp('accountSummaryDetails\\.jsp\\?accountBackendId=\\d+' + (prefs.num ? prefs.num : '\\d+') + '[\\s\\S]*?</tr>', 'i');
        var tr = getParam(html, null, null, re);
        if(!tr)
            throw new AnyBalance.Error(prefs.num ? 'There is no phone number ending by ' + prefs.num : 'You do not have prepaid numbers attached to your account.');
		
		getParam(tr, result, 'balance', /(?:[^>]*>){15}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'phone', /(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, '__tariff', /(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'fio', /(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'status', /(?:[^>]*>){14}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
        //getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        /*
        if(AnyBalance.isAvailable('balance')){
            var id = getParam(tr, null, null, /getAccountDetails\s*\(\s*'([^']*)/i);
			
			if(g_isPrepayed) {
				html = AnyBalance.requestPost(baseurl + 'accounts?SID=15&MobileNo=' + id, {
					'SID':'1',
					SelectedAccount:''
				}, addHeaders({'Referer': baseurl + 'accounts?SID=9'}));
			} else {
				html = AnyBalance.requestGet(baseurl + 'accounts?SID=2&NationalNo=' + id, addHeaders({'Referer': baseurl + 'accounts'}));
			}
			
			getParam(html, result, 'balance', [/>\s*Current Amount Due([^>]*>){4}/i, />balance(?:[\s\S]*?<td[^>]*>){5}([\d,.\s]+)/i], replaceTagsAndSpaces, parseBalance);
        }
		*/
    }finally{
		var logout = getParam(html, null, null, /lass="logout" href="\/([^'"]+)/i);
		if(logout)
			AnyBalance.requestGet(baseurl + logout); //The logoff is obligatory, because etisalat does not allow double login
    }
	
    AnyBalance.setResult(result);
}

function test(table, c, slt, hash, s1, s2) {
		//var table =	"00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";
		//var c = 315597334
		//var slt = "gI1l0wqB"
		//var s1 = 'o'
		//var s2 = 's'
		var n = 4
		var send_cookie = 0
		var start = s1.charCodeAt(0);
		var end = s2.charCodeAt(0);
		var arr = new Array(n);
		var m = Math.pow(((end - start) + 1), n);
		for (var i = 0; i < n; i++) arr[i] = s1;
		for (var i = 0; i < m - 1; i++) {
			for (var j = n - 1; j >= 0; --j) {
				var t = arr[j].charCodeAt(0);
				t++;
				arr[j] = String.fromCharCode(t);
				if (arr[j].charCodeAt(0) <= end) {
					break;
				} else {
					arr[j] = s1;
				}
			}
			var chlg = arr.join("");
			var str = chlg + slt;
			var crc = 0;
			var crc = crc ^ (-1);
			for (var k = 0, iTop = str.length; k < iTop; k++) {
				crc = (crc >> 8) ^ ("0x" + table.substr(((crc ^ str.charCodeAt(k)) & 0x000000FF) * 9, 8));
			}
			crc = crc ^ (-1);
			crc = Math.abs(crc);
			if (crc == parseInt(c)) {
				break;
			}
		}
		//document.forms[0].elements[1].value="79f722576629c5735ccc2f38844241d1:"
		return hash + chlg + ":" + slt + ":" + crc;
	}