/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение МТС
Сайт оператора: http://www.dom.mts.ru/
Личный кабинет (Москва): https://kabinet.mts.ru/
Личный кабинет (Ростов): http://pc.aaanet.ru
Личный кабинет (Новосибирск): https://my.citynsk.ru
*/

var regions = {
   moscow: getMoscow,
   rostov: getRostov,
   nsk: getNsk
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var region = prefs.region;
    if(!region || !regions[region])
      region = 'moscow';

    var func = regions[region];
    func();
}

function getRostov(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://pc.aaanet.ru/';

    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "cgi-bin/billing_auth.pl", {
        'new': 1,
    	login: prefs.login,
        password: prefs.password
    });

    var error = getParam(info, null, null, /"auth_error"[\s\S]*?"([^"]*)"/i);
    if(error)
        throw new AnyBalance.Error(error);

    var html = AnyBalance.requestGet(baseurl);

    var result = {success: true};

    if(AnyBalance.isAvailable('username')){
       var $parse = $(html);
       result.username = $parse.find('td.sidebar h3').text();
    }

    getParam(html, result, 'agreement', /Договор №(.*?)от/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Номер лицевого счета:(.*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс:\s*<[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);

    html = AnyBalance.requestGet(baseurl + 'account/resources');
    getParam(html, result, '__tariff', /"with-border">(?:[\s\S]*?<td[^>]*>){3}(.*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('abon')){
        html = AnyBalance.requestGet(baseurl + 'account/stat');
        getParam(html, result, 'abon', /Абон[а-я\.]* плата(?:[\s\S]*?<td[^>]*>){2}\s*(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    }

    AnyBalance.setResult(result);
}

function getMoscow(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://kabinet.mts.ru/zservice/';

    var info = AnyBalance.requestGet("https://login.mts.ru/amserver/UI/Login?service=stream&arg=newsession&goto=http%3A%2F%2Fkabinet.mts.ru%3A80%2Fzservice%2Fgo");
    var $parse = $(info);
    var xgoto = $parse.find('input[name="goto"]').attr('value');
    var xloginurl = $parse.find('input[name="loginURL"]').attr('value');

    // Заходим на главную страницу
    info = AnyBalance.requestPost("https://login.mts.ru/amserver/UI/Login", {
    	IDToken0: '',
    	IDToken1: prefs.login,
        IDToken2: prefs.password,
        'goto': xgoto,
        encoded: true,
        initialNumber: '',
        loginURL: xloginurl,
        gx_charset: 'UTF-8'
    });

//    info = AnyBalance.requestGet(baseurl);

    $parse = $(info);
    var error = $.trim($parse.find('div.logon-result-block>p').text());
    
    if(error)
    	throw new AnyBalance.Error(error);

//    AnyBalance.trace(info);
    
    // Находим ссылку "Счетчики услуг"
    var $url=$parse.find("A:contains('Счетчики услуг')").first();
    if ($url.length!=1)
    	throw new AnyBalance.Error("Невозможно найти ссылку на счетчики услуг");
    
    var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
    var result = {success: true};

    var matches;
    
    //Тарифный план
    if (matches=/Тарифный план:[\s\S]*?>(.*?)</.exec(html)){
    	result.__tariff=matches[1];
    }
    
    // Баланс
    if(AnyBalance.isAvailable('balance')){
	    if (matches=/customer-info-balance"><strong>\s*(.*?)\s/.exec(html)){
	        var tmpBalance=matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
	        tmpBalance=tmpBalance.replace(",", "."); // Заменяем запятую на точку
	        result.balance=parseFloat(tmpBalance);
	    }
    }

    // Лицевой счет
    if(AnyBalance.isAvailable('license')){
	    if (matches=/Лицевой счет:[\s\S]*?>(.*?)</.exec(html)){
	    	result.license=matches[1];
	    }
    }

    // Номер договора
    if(AnyBalance.isAvailable('agreement')){
	    if (matches=/Договор:[\s\S]*?>(.*?)</.exec(html)){
	    	result.agreement=matches[1];
	    }
    }

    // ФИО
    if(AnyBalance.isAvailable('username')){
	    if (matches=/<h3>([^<]*)<\/h3>/i.exec(html)){
	        result.username=matches[1];
	    }
    }
    
    if(AnyBalance.isAvailable('internet_cur')){
        // Находим ссылку "Счетчики услуг"
        matches = html.match(/<div class="gridium sg">\s*(<table>[\s\S]*?<\/table>)/i);
        if(matches){
        	var counter = $(matches[1]).find("tr.gm-row-item:contains('трафик')").find('td:nth-child(3)').first().text();
        	if(counter)
            	counter = $.trim(counter);
        	if(counter)
        		result.internet_cur = parseFloat(counter);
        }
    }
    
    if(AnyBalance.isAvailable('abon')){
        // Находим ссылку "Расход средств"
        var $url=$parse.find("A:contains('Расход средств')").first();
        if ($url.length!=1)
        	throw new AnyBalance.Error("Невозможно найти ссылку на Расход средств");
        
        var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
        getParam(html, result, 'abon', /Абон[а-я\.]*плата[\s\S]*?<span[^>]*>\s*(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    }
    
    AnyBalance.setResult(result);
}

function getNsk(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.citynsk.ru/csp/rkc/';

    var html = AnyBalance.requestGet(baseurl + 'index.csp');
    var href = getParam(html, null, null, /<form[^>]*action="(login[^"]*)"/i);
    if(!href)
        throw new AnyBalance.Error("Не удалось найти форму входа. Сайт изменен или проблемы на сайте");

    html = AnyBalance.requestPost(baseurl + href, {
        login:prefs.login,
        passwd:prefs.password
    });

    if(!getParam(html, null, null, /<input[^>]*type=["']submit["'][^>]*value=["'](Выход)["']/i)){
        var error = getParam(html, null, null, /FormFocus\s*\(\s*['"]([^'"]*)/i);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет");
    }

    href = getParam(html, null, null, /<iframe[^>]*name="PM"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (portmonetmain). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<iframe[^>]*name="PMUP"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (pmroles). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<A[^>]*href=['"](pmrolesmaincontract[^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (pmrolesmaincontract). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<iframe[^>]*name="PMMENU"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (pmmenucontract). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<a[^>]*href=['"](contractinfo[^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (contractinfo). Cайт изменен?");

    html = AnyBalance.requestGet(baseurl + href);
    href = getParam(html, null, null, /<iframe[^>]*name="frmContent"[^>]*src=['"]([^'"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Не удаётся найти очередную ссылку (contractinfonew). Cайт изменен?");

    var hrefipstat = getParam(html, null, null, /<a[^>]*href=['"](ipstat[^'"]*)/i);

    html = AnyBalance.requestGet(baseurl + href); //Совсем охренели так лк писать... Наконец-то добрались до баланса
    
    var result = {success: true};
                                                   
    getParam(html, result, 'agreement', /Договор[\s\S]*?<td[^>]*>([\s\S]*?)(?:от|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Номер связанного л[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Остаток на л[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', />(?:\s|&nbsp;)*АП(?:\s|&nbsp;)+([\d\.]+)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('internet_cur')){
        if(!hrefipstat){
            AnyBalance.trace("Не найдена ссылка на трафик!");
        }else{
            html = AnyBalance.requestGet(baseurl + hrefipstat);
            getParam(html, result, 'internet_cur', /Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        }
    }

    AnyBalance.setResult(result);
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, ''];


function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
    val = Math.round(val*100)/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTraffic(text){
    var val = parseBalance(text);
    val = Math.round(val/1024/1024*100)/100;
    AnyBalance.trace('Parsing traffic (' + val + 'Mb) from: ' + text);
    return val;
}

