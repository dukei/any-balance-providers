/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение МТС
Сайт оператора: http://www.dom.mts.ru/
Личный кабинет (Москва): https://kabinet.mts.ru/
Личный кабинет (Ростов): http://pc.aaanet.ru
Личный кабинет (Новосибирск): https://my.citynsk.ru
Личный кабинет (Пермь, Екатеринбург): https://bill.utk.ru/uportf/arm.pl
Личный кабинет (Киров): https://lk.kirovnet.net
*/

var regions = {
   moscow: getMoscow,
   rostov: getRostov,
   nsk: getNsk,
   prm: getPrm,
   ekt: getPrm,
   krv: getKrv,
   nnov: getNnov
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var region = prefs.region;
    if(!region || !regions[region])
      region = 'moscow';

    var func = regions[region];
    AnyBalance.trace('Регион: ' + region);
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
    var baseloginurl = "https://login.mts.ru/amserver/UI/Login?service=stream&arg=newsession&goto=http%3A%2F%2Fkabinet.mts.ru%3A80%2Fzservice%2Fgo";

    var info = AnyBalance.requestGet(baseloginurl);

    var form = getParam(info, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form)
        throw new AnyBalance.Error("Не удаётся найти форму входа!");

    var params = createFormParams(form, function(params, input, name, value){
        var undef;
        if(name == 'IDToken1')
            value = prefs.login;
        else if(name == 'IDToken2')
            value = prefs.password;
        else if(name == 'noscript')
            value = undef; //Снимаем галочку
        else if(name == 'IDButton')
            value = '+%C2%F5%EE%E4+%E2+%CB%E8%F7%ED%FB%E9+%EA%E0%E1%E8%ED%E5%F2+';
       
        return value;
    });

    // Заходим на главную страницу
    info = AnyBalance.requestPost(baseloginurl, params);
    $parse = $(info);

    if(!/src=exit/i.test(info)){
        var error = $.trim($parse.find('div.logon-result-block>p').text());
        if(!error)
            error = getParam(info, null, null, /<label[^>]+validate="IDToken1"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
        if(!error)
            error = getParam(info, null, null, /<label[^>]+validate="IDToken2"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);

        if(error)
            throw new AnyBalance.Error(error);

        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Неверный логин-пароль или сайт изменен.");
    }

//    info = AnyBalance.requestGet(baseurl);


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

function getPrm(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('koi8-r');

    var baseurl = 'https://bill.utk.ru/uportf/arm.pl';

    var html = AnyBalance.requestPost(baseurl, {
        do_login:1,
        id_menu:1,
        login:prefs.login,
        passwd:prefs.password,
        ctl00$MainContent$btnEnter:'Войти'
    });

    if(!getParam(html, null, null, /(do_logout=1)/i)){
        var error = getParam(html, null, null, /<div[^>]*class="b_warning[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Номер договора:([\s\S]*?)(?:\(|<\/li>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Код лицевого счета:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<br[^>]*>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', /абон\. плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'username', /class="customer-info"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);


    if(AnyBalance.isAvailable('internet_cur')){
        var href = getParam(html, null, null, /<a[^>]*href="arm.pl([^"]*)"[^>]*>Отчет по трафику/i);
        if(!href){
            AnyBalance.trace("Не найдена ссылка на трафик!");
        }else{
            html = AnyBalance.requestGet(baseurl + href);
            getParam(html, result, 'internet_cur', /ИТОГО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficPerm);
        }
    }

    if(AnyBalance.isAvailable('balance_tv')){
        if(AnyBalance.getLevel() < 4){
            AnyBalance.trace('Для получения баланса ТВ необходима версия AnyBalance 2.8+');
        }else{
            AnyBalance.setCookie('bill.utk.ru', 'service', 2);
            html = AnyBalance.requestGet(baseurl);
            getParam(html, result, 'balance_tv', /Баланс:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

    AnyBalance.setResult(result);
}

function getKrv(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://lk.kirovnet.net/';

    var html = AnyBalance.requestPost(baseurl + 'auth?return=/index', {
        username:prefs.login,
        password:prefs.password,
        timestamp:Math.round(new Date().getTime()/1000)
    });

    if(!getParam(html, null, null, /(\/auth\/logout)/i)){
        var error = getParam(html, null, null, /<div[^>]*id="auth-failed[^>]*>([\s\S]*?)(?:<br[^>]*>|<\/div>)/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Договор:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'license', /Лицевой счёт:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Сейчас на вашем счёте:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентcкая плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'username', /Клиент:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'daysleft', /Этой суммы вам хватит[\s\S]*?<span[^>]+class="imp"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);


    if(AnyBalance.isAvailable('internet_cur')){
        html = AnyBalance.requestGet(baseurl + 'charges');
        getParam(html, result, 'internet_cur', /Входящий интернет трафик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficPerm);
    }

    AnyBalance.setResult(result);
}

function getNnov(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = 'http://stat.nnov.comstar-r.ru';
    AnyBalance.setAuthentication(prefs.login, prefs.password);

    var html = AnyBalance.requestGet(baseurl);

    if(!/Текущий остаток:/i.test(html))
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильные логин, пароль?");

    var result = {success: true};

    getParam(html, result, 'license', /Лицевой счёт([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий остаток:([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентcкая плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    getParam(html, result, 'username', /Лицевой счёт[^<]*(?:<[^>]*>\s*)*([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'daysleft', /Этой суммы вам хватит[\s\S]*?<span[^>]+class="imp"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance2);

    var url = getParam(html, null, null, /<a[^>]+href="([^"]*)"[^>]*>Информация об услугах/i, null, html_entity_decode);
    if(!url){
        AnyBalance.trace("Не удалось найти ссылку на информацию об услугах.");
    }else{
        html = AnyBalance.requestGet(baseurl + url);
        var tr = getParam(html, null, null, /Активные услуги(?:[\s\S](?!<\/table>))*?<tr[^>]*>\s*(<td[^>]*>\s*<a[\s\S]*?)<\/tr>/i);
        if(!tr){
            AnyBalance.trace("Не удалось найти ссылку на информацию об интернет.");
        }else{
            url = getParam(tr, null, null, /<a[^>]+href="([^"]*)/i, null, html_entity_decode);
            html = AnyBalance.requestGet(baseurl + url);
            getParam(html, result, 'agreement', /Договор:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, '__tariff', /Описание услуги:[\s\S]*?<td[^>]*>(?:\s*<b[^>]*>[^<]*<\/b>)?([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'internet_cur', /IP трафик[\s\S]*?<small[^>]*>([\s\S]*?)<\/small>/i, replaceTagsAndSpaces, parseBalance2);
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
var replaceFloat2 = [/\s+/g, '', /,/g, '.'];


function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
    val = Math.round(val*100)/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseBalance2(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat2, parseFloat);
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

function parseTrafficPerm(text){
    var val = getParam(text, null, null, /([\d\.,]+)/, replaceFloat);
    if(typeof(val) != 'undefined'){
        val = Math.round(parseFloat(val)*100)/100;
    }
    
    AnyBalance.trace('Parsing traffic (' + val + 'Mb) from: ' + text);
    return val;
}


function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>/ig, function(str, name){
        var value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode);
        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        params[name] = value;
    });
    return params;
}

