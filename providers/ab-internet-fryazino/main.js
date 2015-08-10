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
	var baseurl = 'https://utm.fryazino.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'UserTools/index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    var key = getParam(html, null, null, /name=['"]KEY['"]\stype=hidden\svalue=['"]([^'"]+)/i); 
    
    var auth_type = encrypt(key + encrypt(prefs.password));
    
	html = AnyBalance.requestPost(baseurl + 'UserTools/index.php', {
        'auth_type': auth_type,
        'FORM_ACTION': 'войти',
        'KEY': key,
        'redirect': '/UserTools/index.php',
        'pw': prefs.login,
        'pass': prefs.password
    }, addHeaders({Referer: baseurl + 'UserTools/index.php'}));
	
	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /[^>]+class=['"]td_message alert['"][^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /несуществующий логин или неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс<(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traffic_in', /входящий трафик(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traffic_out', /исходящий трафик(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /договор(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /статус(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function UnicodeTo1251(s) {
    var Unicode = new Array(0x0401,0x0410,0x0411,0x0412,0x0413,0x0414,0x0415,0x0416,0x0417,0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,0x041F,0x0420,0x0421,0x0422,0x0423,0x0424,0x0425,0x0426,0x0427,0x0428,0x0429,0x042A,0x042B,0x042C,0x042D,0x042E,0x042F,0x0430,0x0431,0x0432,0x0433,0x0434,0x0435,0x0436,0x0437,0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043F,0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F,0x0451,0x0020,0x0022,0x002A,0x002D,0x002F,0x004E,0x0050,0x00A0,0x00a4,0x00A7,0x00A9,0x00AD,0x00B0,0x00B7,0x00F7,0x2013,0x2014,0x2018,0x2019,0x201A,0x201C,0x201D,0x201E,0x2022,0x2039,0x203A,0x2116);
    var C1251   = new Array(0x00A8,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF,0x00D0,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,0x00DF,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF,0x00F0,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,0x00FE,0x00FF,0x00B8,0x0020,0x0022,0x002A,0x002D,0x002F,0x004E,0x0050,0x0020,0x00A4,0x00A7,0x00A9,0x002D,0x00B0,0x0095,0x002F,0x0096,0x0097,0x0091,0x0092,0x0082,0x0093,0x0094,0x0084,0x0095,0x008B,0x009B,0x00B9);

    var result = '';
    var Slen = s.length;
    var Tlen = Unicode.length;
    for(i=0; i<Slen; i++) {
        var chrCode = s.charCodeAt(i);
        var chr = s.charAt(i);
        for(j=0; j<Tlen; j++) if(Unicode[j] == chrCode) chr = String.fromCharCode(C1251[j]);
        result += chr;
    }
    return result;
}    

function encrypt(str)   {
    return binl2hex(core(str2binl(UnicodeTo1251(str))));
}
