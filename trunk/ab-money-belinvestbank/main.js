/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'utf-8, iso-8859-1, utf-16, *;q=0.7',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-ru; Android SDK built for x86 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ibank.belinvestbank.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, "Введите логин!");
	checkEmpty(prefs.password, "Введите пароль!");
	checkEmpty(prefs.keyword, "Введите ключевое слово!");
		
	var html = AnyBalance.requestGet(baseurl + 'signin', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'signin', {
        login:prefs.login,
        keyword:prefs.keyword,
    }, addHeaders({Referer: baseurl + 'signin'}));
	
	var encryptArrayVar = getParam(html, null, null, /var\s*keyLang\s*=\s*\[([^\]]*)/i);
	checkEmpty(encryptArrayVar, "Не нашли ключ шифрования, свяжитесь с разработчиком", true);
	var encryptArray = sumParam(encryptArrayVar, null, null, /\d+/ig);
	
	html = AnyBalance.requestPost(baseurl + 'signin2', {
        password:cod(prefs.password, encryptArray),
    }, addHeaders({Referer: baseurl + 'signin2'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="attention"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Пароль введен неверно/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'cards', addHeaders({'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',}));
	
	var table = getParam(html, null, null, /(<table[^>]*class="datatable"[\s\S]*?<\/table>)/i);
	checkEmpty(table, "Не нашли ни одной карты.", true);
	
	if(prefs.cardnum && !/^\d{4}$/i.test(prefs.cardnum)) {
		throw new AnyBalance.Error('Необходимо ввести 4 последние цифры номера карты, либо не вводить ничего!');
	}
	
	var tr = getParam(table, null, null, new RegExp('<tr\\s+id(?:[\\s\\S](?!</tr>))*?(?:\\*\\*\\*\\*\\s+){3}'+ (prefs.cardnum || '\\d{4}') +'[\\s\\S]*?</tr>', 'i'));
	if(!tr) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	}
	
    var result = {success: true};
	
	getParam(tr, result, '__tariff', /(\*\*\*\*\s*\*\*\*\*\s*\*\*\*\*\s*\d{4})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'validto', /Срок действия:([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}

function cod(str, keyLang) {
	var lang = ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m','1','2','3','4','5','6','7','8','9','0','_','.','-'];
	// Этот аррей динамический, надо его передавать сюда
	//var keyLang = ['48','117','121','119','66','88','89','78','57','45','71','99','80','65','87','75','52','113','84','101','85','102','95','103','76','46','53','98','100','116','56','105','86','77','109','81','106','110','54','120','82','90','118','97','111','50','114','73','67','49','51','79','68','72','115','74','70','122','108','107','69','55','112','104','83'];
	var result = '';
	var pass = str.split('');
	for (n = 0; n < pass.length; n++) {
		var isLegal = false;
		if (pass[n]) {
			for (i = 0; i < lang.length; i++) {
				if (pass[n] == lang[i]) {
					result += String.fromCharCode(keyLang[i]);
					isLegal = true;
				}
			}
			if (!isLegal) {
				result += pass[n];
			}
		} else {
			break;
		}
	}
	return result;
}