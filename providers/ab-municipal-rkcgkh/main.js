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
	var baseurl = 'http://lc.rkcgkh.ru';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/logon', g_headers);
        
        if (!html || AnyBalance.getLastStatusCode() >= 400) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
        }
        
        var captchaCode;
        if(AnyBalance.getLevel() >= 7){
            AnyBalance.trace('Пытаемся ввести капчу');
            var captcha = AnyBalance.requestGet(baseurl + '/data/secpic/secpic.gif');
            captchaCode = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
            AnyBalance.trace('Капча получена: ' + captchaCode);
        } else {
            throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
        }

	html = AnyBalance.requestPost(baseurl + '/data/regs', {
            action: 7,
            'els[0][name]': 'form_name',
            'els[0][value]': 'logon',
            'els[1][name]': 'name',
            'els[1][value]': prefs.login,
            'els[2][name]': 'pass',
            'els[2][value]': prefs.password,
            'els[3][name]': 'capcha',
            'els[3][value]':	captchaCode
        }, AB.addHeaders({Referer: baseurl + '/logon', Origin: baseurl}));
        
        var loginResult = AB.getJson(html);
        
        if (loginResult[0] !== true) {
            throw new AnyBalance.Error(loginResult[1] || 'Ошибка авторизации', false, /логин|пароль/i.test(loginResult[1]));
        }

	html = AnyBalance.requestPost(baseurl + '/data/script', {
            action: '4',
            stext: '',
            hash: '#services'
        }, AB.addHeaders({Referer: baseurl + '/logon', Origin: baseurl}));
        
        var jsonObj = AB.getJson(html);
        if (jsonObj[0] !== true) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось получить сводку по услугам');
        }
        
        html = jsonObj[1];
	
        var result = { success: true };
	AB.sumParam(html, result, 'balance', />\s*(?:Долг|На счету):?\s*<\/span\s*>:?([^<]+)/ig, AB.replaceTagsAndSpaces, AB.parseBalance, AB.aggregate_sum);
	
        if (AB.isAvailable('all')) {
            result.all = '';
            var uslugi = AB.getElements(html, /<li\s[^>]*class="[^"]*?\bserv\b[^"]*"/ig);
                      
            for(var i = 0; i<uslugi.length; i++) {
                var balance = 0, usluga, uk = AB.getParam(uslugi[i], null, null, />\s*УК:?\s*<\/span\s*>:?([^<]+)/i, replaceTagsAndSpaces);
                if (uk) {
                    usluga = AB.getParam(uslugi[i], null, null, />\s*На:?\s*<\/span\s*>:?([^<]+)/i, replaceTagsAndSpaces);
                    balance = AB.getParam(uslugi[i], null, null, />\s*(?:Долг|На счету):?\s*<\/span\s*>:?([^<]+)/i, replaceTagsAndSpaces);
                    result.all += uk + '<br />' + usluga+ ': <br /><b>' + balance + (i < uslugi.length-1 ? '</b><br /><br />' :'</b>');
                } else {
                    uk = AB.getParam(uslugi[i], null, null, />УК\.*:\s+([^<]+)/i, replaceTagsAndSpaces);
                    usluga = AB.getParam(uslugi[i], null, null, />Услуга\.*:\s+([^<]+)/i, replaceTagsAndSpaces);
                    result.all += uk + '<br />' + usluga + (i < uslugi.length-1 ? '<br /><br />' :'');
                }
            }
        }
	
	AnyBalance.setResult(result);
}