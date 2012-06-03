/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение МТС
Сайт оператора: http://www.dom.mts.ru/
Личный кабинет (Москва): https://kabinet.mts.ru/
Личный кабинет (Ростов): http://pc.aaanet.ru
*/

var regions = {
   moscow: getMoscow,
   rostov: getRostov
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

    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "go", {
    	action: 'startup',
    	logname: prefs.login,
        password: prefs.password
    });

//    info = AnyBalance.requestGet(baseurl);

    var $parse = $(info);
    var error = $.trim($parse.find('div.logon-result-block>p').text());
    
    if(error)
    	throw new AnyBalance.Error(error);
    
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
        getParam(html, result, 'abon', /Абон[а-я\.]* плата[\s\S]*?<span[^>]*>\s*(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

