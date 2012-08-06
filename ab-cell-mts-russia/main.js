/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (центр). Вход через PDA-версию.
Вдохновение почерпано у http://mtsoft.ru

Сайт оператора: http://mts.ru/
Личный кабинет: https://ip.mts.ru/SELFCAREPDA/
*/
var regions = {
	auto: "https://ip.mts.ru/SELFCAREPDA/",
	center: "https://ip.mts.ru/SELFCAREPDA/",
	primorye: "https://ihelper.primorye.mts.ru/SelfCarePda/",
	nnov: "https://ip.nnov.mts.ru/selfcarepda/",
	nw: "https://ip.nw.mts.ru/SELFCAREPDA/",
	sib: "https://ip.sib.mts.ru/SELFCAREPDA/",
	ural: "https://ip.nnov.mts.ru/selfcarepda/", //Почему-то урал в конце концов переадресуется сюда
	ug: "https://ihelper.ug.mts.ru/SelfCarePda/"
};

var regionsOrdinary = {
	auto: "https://ihelper.mts.ru/selfcare/",
	center: "https://ihelper.mts.ru/selfcare/",
	primorye: "https://ihelper.primorye.mts.ru/selfcare/",
	nnov: "https://ihelper.nnov.mts.ru/selfcare/",
	nw: "https://ihelper.nw.mts.ru/selfcare/",
	sib: "https://ihelper.sib.mts.ru/selfcare/",
	ural: "https://ihelper.nnov.mts.ru/selfcare/", //Почему-то урал в конце концов переадресуется сюда
	ug: "https://ihelper.ug.mts.ru/SelfCare/"
};

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

function sumParam (html, result, param, regexp, replaces, parser, do_replace) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param))){
            if(do_replace)
  	        return html;
            else
                return;
	}

        var total_value;
	var html_copy = html.replace(regexp, function(str, value){
		for (var i = 0; replaces && i < replaces.length; i += 2) {
			value = value.replace (replaces[i], replaces[i+1]);
		}
		if (parser)
			value = parser (value);
                if(typeof(total_value) == 'undefined')
                	total_value = value;
                else
                	total_value += value;
                return ''; //Вырезаем то, что заматчили
        });

    if(param){
      if(typeof(total_value) != 'undefined'){
          if(typeof(result[param]) == 'undefined')
      	      result[param] = total_value;
          else 
      	      result[param] += total_value;
      }
      if(do_replace)
          return html_copy;
    }else{
      return total_value;
    }
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function getViewState(html){
    return sumParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function parseBalance(text){
    var val = sumParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTraffic(text){
    var _text = text.replace(/\s+/, '');
    var val = sumParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    var units = sumParam(_text, null, null, /(kb|mb|gb|кб|мб|гб|байт|bytes)/i);
    switch(units.toLowerCase()){
      case 'bytes':
      case 'байт':
        val = Math.round(val/1024/1024*100)/100;
        break;
      case 'kb':
      case 'кб':
        val = Math.round(val/1024*100)/100;
        break;
      case 'gb':
      case 'гб':
        val = Math.round(val*1024);
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;

    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести 10 цифр номера, например, 9161234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }

    if(prefs.type == 'lk'){
        mainLK();
    }else if(prefs.type == 'mobile'){
        mainMobile();
    }else if(prefs.type == 'ordinary'){
        mainOrdinary();
    }else{
        try{
           if(!AnyBalance.isAvailable('bonus')){
                //Мобильный помощник, только если не нужны бонусные баллы
	        mainMobile(true);
                return;
           }else{
                AnyBalance.trace('Требуются бонусные баллы, мобильные не подходит...');
           }
        }catch(e){
           if(!e.allow_retry)
               throw e;
           AnyBalance.trace('С мобильным помощником проблема: ' + e.message + " Пробуем обычный...");
        }
        mainLK();
    }
}

function mainMobile(allowRetry){
    AnyBalance.trace("Entering mobile internet helper...");

    var headers = {
	Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control':'max-age=0',
	Connection:'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
    };

    var prefs = AnyBalance.getPreferences();

    if(!regions[prefs.region]){
	AnyBalance.trace("Unknown region: " + prefs.region + ", setting to auto");
        prefs.region = 'auto';
    }

    var baseurl = regions[prefs.region];


    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
        username: prefs.login,
        password: prefs.password
    }, headers);
    
    var regexp=/<form .*?id="redirect-form".*?action="[^"]*?([^\/\.]+)\.mts\.ru/, res, tmp;
    if (res=regexp.exec(html)){
        //Неправильный регион. Умный мтс нас редиректит
        //Только эта скотина не всегда даёт правильную ссылку, иногда даёт такую, которая требует ещё редиректов
        //Поэтому приходится вычленять из ссылки непосредственно нужный регион
        var newReg = res[1];

        if(!regions[newReg])
            throw new AnyBalance.Error("mts has redirected to unknown region: " + res[1]);
	
        baseurl = regions[newReg];
        AnyBalance.trace("Redirected, now trying to enter selfcare at address: " + baseurl);
        html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
    	    username: prefs.login,
            password: prefs.password
        }, headers);
    }
    
    
    regexp = /Security\.mvc\/LogOff/;
    if(!regexp.exec(html)){
        //Не вошли. Сначала пытаемся найти вразумительное объяснение этому факту...
        regexp=/<ul class="operation-results-error"><li>(.*?)<\/li>/;
        if (res=regexp.exec(html)){
            throw new AnyBalance.Error(res[1], allowRetry);
        }
        
        regexp=/<title>Произошла ошибка<\/title>/;
        if(regexp.exec(html)){
            throw new AnyBalance.Error("Мобильный интернет-помощник временно недоступен." + (prefs.region == 'auto' ? ' Попробуйте установить ваш Регион вручную в настройках провайдера.' : ''), allowRetry);
        }
        
        var error = sumParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
        if(error){
            throw new AnyBalance.Error(error, allowRetry);
        }
    
        AnyBalance.trace("Have not found logOff... Unknown other error. Please contact author.");
        throw new AnyBalance.Error("Не удаётся войти в мобильный интернет помощник. Возможно, проблемы на сайте." + (prefs.region == 'auto' ? ' Попробуйте установить ваш Регион вручную в настройках провайдера.' : ' Попробуйте вручную войти в помощник по адресу ' + baseurl), allowRetry);
    }

    AnyBalance.trace("It looks like we are in selfcare (found logOff)...");
    var result = {success: true};

    if(prefs.phone && prefs.phone != prefs.login){
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc", headers);
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc/Change?phoneNumber=7"+prefs.phone, headers);
        if(!html)
	    throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа"); 
        var error = sumParam(html, null, null, /<ul class="operation-results-error">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
	    throw new AnyBalance.Error(prefs.phone + ": " + error); 
    }

    // Тарифный план
    sumParam(html, result, '__tariff', /Тарифный план.*?>([^<]*)/i, replaceTagsAndSpaces);
    // Баланс
    sumParam (html, result, 'balance', /Баланс.*?>([-\d\.,\s]+)/i, replaceFloat, parseFloat);
    // Телефон
    sumParam (html, result, 'phone', /Ваш телефон:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    if (isAvailableStatus()) {

        AnyBalance.trace("Fetching status...");

        html = AnyBalance.requestGet(baseurl + "Account.mvc/Status", headers);

        fetchAccountStatus(html, result);
    }

    if (AnyBalance.isAvailable ('usedinprevmonth')) {

        AnyBalance.trace("Fetching history...");

        html = AnyBalance.requestPost (baseurl + 'Account.mvc/History', {periodIndex: 0}, headers);

        AnyBalance.trace("Parsing history...");

        // Расход за прошлый месяц
        sumParam (html, result, 'usedinprevmonth', /За период израсходовано .*?([\d\.,]+)/i, replaceFloat, parseFloat);
    }


    if (AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching traffic info...");

        html = AnyBalance.requestGet (baseurl + 'TariffChange.mvc', headers);

        AnyBalance.trace("Parsing traffic info...");

        // Ежемесячная плата
        sumParam (html, result, 'monthlypay', /Ежемесячная плата[^\d]*([\d\.,]+)/i, replaceFloat, parseFloat);
    }

    AnyBalance.setResult(result);

}

function parseTime(date){
    AnyBalance.trace("Trying to parse date from " + date);
    var dateParts = date.split(/[\.\/]/);
    var d = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
    return d.getTime();
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function mainOrdinary(){
    AnyBalance.trace("Entering ordinary internet helper...");
    
    var headers = {
	Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control':'max-age=0',
	Connection:'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
    };

    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(!regionsOrdinary[prefs.region]){
	AnyBalance.trace("Unknown region: " + prefs.region + ", setting to auto");
        prefs.region = 'auto';
    }

    var baseurl = regionsOrdinary[prefs.region];

//    var html = AnyBalance.requestGet(baseurl, headers);
//    var viewstate = getViewState(html);
//    if(!viewstate)
//	throw new AnyBalance.Error('Не найдена форма входа. Процедура входа изменена или проблемы на сайте.');

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + 'logon.aspx', {
            phoneNumber: '7' + prefs.login,
            password: prefs.password,
            submit: 'Go'
//        __VIEWSTATE: viewstate,
//        ctl00$MainContent$tbPhoneNumber: prefs.login,
//        ctl00$MainContent$tbPassword: prefs.password,
//        ctl00$MainContent$btnEnter: 'Войти'
    }, headers);
    
    var redirect=getParam(html, null, null, /<form .*?id="redirect-form".*?action="[^"]*?([^\/\.]+)\.mts\.ru/);
    if (redirect){
        //Неправильный регион. Умный мтс нас редиректит
        //Только эта скотина не всегда даёт правильную ссылку, иногда даёт такую, которая требует ещё редиректов
        //Поэтому приходится вычленять из ссылки непосредственно нужный регион
        if(!regionsOrdinary[redirect])
            throw new AnyBalance.Error("МТС перенаправила на неизвестный регион: " + redirect);
	
        baseurl = regionsOrdinary[redirect];
        AnyBalance.trace("Redirected, now trying to enter selfcare at address: " + baseurl);
        html = AnyBalance.requestPost(baseurl + "logon.aspx", {
            phoneNumber: '7' + prefs.login,
            password: prefs.password,
            submit: 'Go'
        }, headers);
    }
    
    if(!sumParam(html, null, null, /(amserver\/UI\/Logout)/i)){
        //Не вошли. Надо сначала попытаться выдать вразумительную ошибку, а только потом уже сдаться

        var error = sumParam(html, null, null, /<div class="b_error">([\s\S]*?)<\/div>/, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error(error);
        }
        
        var regexp=/<title>Произошла ошибка<\/title>/;
        if(regexp.exec(html)){
            throw new AnyBalance.Error("Обычный интернет-помощник временно недоступен." + (prefs.region == 'auto' ? ' Попробуйте установить ваш Регион вручную в настройках провайдера.' : ''));
        }
        
        var error = sumParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
        if(error){
            throw new AnyBalance.Error(error);
        }
    
        AnyBalance.trace("Have not found logOff... Unknown other error. Please contact author.");
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся войти в обычный интернет помощник. Возможно, проблемы на сайте." + (prefs.region == 'auto' ? ' Попробуйте установить ваш Регион вручную в настройках провайдера.' : ' Попробуйте вручную войти в помощник по адресу ' + baseurl));
    }

    AnyBalance.trace("It looks like we are in selfcare (found logOff)...");
    var result = {success: true};

    if(prefs.phone && prefs.phone != prefs.login){
        throw new AnyBalance.Error("Получение информации по другому номеру через обычный интернет-помощник пока не поддерживается (не на чем проверить). Напишите автору провайдера для исправления.");
    }
    
    // Тарифный план
    sumParam(html, result, '__tariff', /Тарифный план.*?>([^<]*)/i, replaceTagsAndSpaces);
    // Баланс
    sumParam (html, result, 'balance', /<span[^>]*id="customer-info-balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    // Телефон
    sumParam (html, result, 'phone', /Номер:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    // Статус блокировки, хрен с ним, на следующей странице получим лучше
    //sumParam (html, result, 'statuslock', /<li[^>]*class="lock-status[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);

    if (isAvailableStatus()) {

        AnyBalance.trace("Fetching status...");

        html = AnyBalance.requestGet(baseurl + "account-status.aspx", headers);

        fetchAccountStatus(html, result);
    }

    AnyBalance.setResult(result);
}

function isAvailableStatus(){
    return AnyBalance.isAvailable ('min_left','min_local','min_love','sms_left','mms_left','traffic_left','traffic_left_mb',
        'license','statuslock','credit','usedinthismonth', 'bonus_balance', 'min_left_mts', 'min_used_mts', 'min_used', 'debt',
        'pay_till');
}

function fetchAccountStatus(html, result){
    AnyBalance.trace("Parsing status...");
    
    //Территория МТС (3000 минут): Осталось 0 минут
    html = sumParam (html, result, 'min_left_mts', /Территория МТС.*?: Осталось\s*([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);
    html = sumParam (html, result, 'min_left_mts', /Осталось\s*([\d\.,]+)\s*мин\S* на МТС/ig, replaceFloat, parseFloat, true);
    html = sumParam (html, result, 'min_left_mts', /Остаток:?\s*([\d\.,]+)\s*мин\S* на МТС/ig, replaceFloat, parseFloat, true);

    //Срочный контракт (15%, 25% как 15%): Осталось 0 минут
    html = sumParam (html, result, 'min_left', /Срочный контракт.*?: Осталось\s*([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);

    // Пакет минут
    html = sumParam (html, result, 'min_left', /Остаток пакета минут:\s*([\d\.,]+)\./ig, replaceFloat, parseFloat, true);
    
    // Остаток бонуса
    html = sumParam (html, result, 'min_left', /Остаток бонуса:\s*([\d\.,]+?)\s*мин/ig, replaceFloat, parseFloat, true);

    // Остаток минут
    html = sumParam (html, result, 'min_left', /Осталось\s*([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);
    
    // Пакет минут Готовый офис: Остаток 149 минут
    // Остаток: минут
    html = sumParam (html, result, 'min_left', /Остаток:?\s*([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);

    // Остаток минут по тарифу "Готовый офис" - 194 минут
    html = sumParam (html, result, 'min_left', /Остаток мин.*?([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);

    // Остаток пакета: 24 минут
    html = sumParam (html, result, 'min_left', /Остаток пакета:?\s*([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);

    html = sumParam (html, result, 'min_left', /Пакет минут[^:]*:\s*Оста[^\d]*([\d\.,]+)\s*мин/ig, replaceFloat, parseFloat, true);

    // Использовано: 0 минут местных и мобильных вызовов.
    sumParam (html, result, 'min_local', /Использовано:\s*([\d\.,]+)\s*мин[^\s]* местных/ig, replaceFloat, parseFloat);

    // Использовано: 0 минут на любимые номера
    sumParam (html, result, 'min_love', /Использовано:\s*([\d\.,]+)\s*мин[^\s]* на любимые/ig, replaceFloat, parseFloat);

    //Использовано: 17 мин на МТС России 
    sumParam (html, result, 'min_used_mts', /Использовано:?\s*(\d+)\s*мин\S* на МТС/ig, [], parseInt);

    // Остаток СМС
    sumParam (html, result, 'sms_left', /(?:Осталось|Остаток)(?: пакета)? (?:sms|смс):\s*(\d+)/ig, [], parseInt);
    // Остаток СМС
    sumParam (html, result, 'sms_left', /(?:Осталось|Остаток)[^\d]*(\d+)\s*(?:sms|смс)/ig, [], parseInt);

    // Остаток ММС
    sumParam (html, result, 'mms_left', /(?:Осталось|Остаток)(?: пакета)? (?:mms|ммс):\s*(\d+)/ig, [], parseInt);
    sumParam (html, result, 'mms_left', /(?:Осталось|Остаток)[^\d]*(\d+)\s*(?:mms|ммс)/ig, [], parseInt);

    // Накоплено 54 мин. в текущем месяце
    sumParam (html, result, 'min_used', /Накоплено\s*(\d+)\s*мин[^\s]*/g, [], parseInt);

    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    sumParam (html, result, 'debt', /Сумма по неоплаченным счетам.*?([-\d\.,]+)/i, replaceFloat, parseFloat);

    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    sumParam (html, result, 'pay_till', /оплатить до\s*([\d\.,\/]+)/i, [",", "."], parseTime);

    // Остаток трафика
    sumParam (html, result, 'traffic_left', /(?:Осталось|Остаток)[^\d]*(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))/ig);
    
// Остаток трафика
    sumParam (html, result, 'traffic_left_mb', /(?:Осталось|Остаток)[^\d]*(\d+,?\d* *(kb|mb|gb|кб|мб|гб|байт|bytes))/ig, null, parseTraffic);

    // Лицевой счет
    sumParam (html, result, 'license', /№([\s\S]*?)[:<]/, replaceTagsAndSpaces);

    // Блокировка
    sumParam (html, result, 'statuslock', /class="account-status-lock".*>(Номер [^<]*)</i);

    // Сумма кредитного лимита
    sumParam (html, result, 'credit', /(?:Лимит|Сумма кредитного лимита)[\s\S]*?([-\d\.,]+)\s*\(?руб/i, replaceFloat, parseFloat);

    // Расход за этот месяц
    sumParam (html, result, 'usedinthismonth', /Израсходовано [^<]*?(?:<[^>]*>)?([\d\.,]+) \(?руб/i, replaceFloat, parseFloat);

    //Остаток бонуса 100 руб
    sumParam (html, result, 'bonus_balance', /Остаток бонуса:?\s*([\d\.,]+)\s*р/i, replaceFloat, parseFloat);
}


function isLoggedIn(html){
    return getParam(html, null, null, /(<meta[^>]*name="lkMonitorCheck")/i);
}

function parseJson(json){
    return json;
}

function mainLK(){
    AnyBalance.trace("Entering lk...");
    
    var headers = {
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:13.0) Gecko/20100101 Firefox/13.0.1'
    };

    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://lk.ssl.mts.ru';
    var baseurlLogin = 'https://login.mts.ru';
    //Чтобы сбросить автологин
    var html = AnyBalance.requestGet(baseurlLogin + "/amserver/UI/Login?service=lk&goto=" + baseurl + "/&auth-status=1", headers);

    if(isLoggedIn(html)){
         AnyBalance.trace("Уже залогинены, проверяем, что на правильный номер...");
         //Автоматом залогинились, надо проверить, что на тот номер
         var info = AnyBalance.requestPost(baseurl + '/GoodokServices/GoodokAjaxGetWidgetInfo/', '', headers);
         info = JSON.parse(info);
         if(info.MSISDN != prefs.login){  //Автоматом залогинились не на тот номер
             AnyBalance.trace("Залогинены на неправильный номер: " + prefs.MSISDN + ", выходим");
             html = AnyBalance.requestGet(baseurlLogin + "/amserver/UI/Logout?goto=" + baseurl, headers);
         }
    }

    if(!isLoggedIn(html)){
        AnyBalance.trace("Логинимся с заданным номером");
        var html = AnyBalance.requestPost(baseurlLogin + "/amserver/UI/Login", {
            IDToken0:'',
            IDToken1:prefs.login,
            IDToken2:prefs.password,
            IDButton:'+%D0%92%D1%85%D0%BE%D0%B4+%D0%B2+%D0%9B%D0%B8%D1%87%D0%BD%D1%8B%D0%B9+%D0%BA%D0%B0%D0%B1%D0%B8%D0%BD%D0%B5%D1%82+',
            'goto':'aHR0cHM6Ly9say5zc2wubXRzLnJ1Lw==',
            encoded:true,
            initialNumber:'',
            loginURL:'/amserver/UI/Login?auth-status=0&gx_charset=UTF-8&service=lk&goto=https%3A%2F%2Flk.ssl.mts.ru%2F',
            gx_charset:'UTF-8'
        });

        if(getParam(html, null, null, /(auth-status=0)/i))
            throw new AnyBalance.Error('Неверный логин или пароль. Повторите попытку или получите новый пароль на сайте https://lk.ssl.mts.ru/.');
    }

    if(!isLoggedIn(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Он изменился или проблемы на сайте.');
    }
    AnyBalance.trace("Мы в личном кабинете...");

    var info = AnyBalance.requestGet(baseurlLogin + '/profile/mobile/get?callback=parseJson', headers);
    info = new Function("return " + info)();

    var result = {success: true};
    if(AnyBalance.isAvailable('balance'))
        result.balance = Math.round(info.balance*100)/100;
    result.__tariff = info.tariff;
    if(AnyBalance.isAvailable('bonus'))
        result.bonus = info.bonus;

    if(isAvailableStatus()){
        var baseurlHelper = "https://ihelper.mts.ru/selfcare/"
        html = AnyBalance.requestGet(baseurlHelper, headers);
        var redirect=getParam(html, null, null, /<form .*?id="redirect-form".*?action="[^"]*?([^\/\.]+)\.mts\.ru/);
        if (redirect){
            //Неправильный регион. Умный мтс нас редиректит
            //Только эта скотина не всегда даёт правильную ссылку, иногда даёт такую, которая требует ещё редиректов
            //Поэтому приходится вычленять из ссылки непосредственно нужный регион
            if(!regionsOrdinary[redirect])
                throw new AnyBalance.Error("МТС перенаправила на неизвестный регион: " + redirect);
	
            var baseurlHelper = regionsOrdinary[redirect];
            AnyBalance.trace("Redirected, now trying to enter selfcare at address: " + baseurlHelper);
            html = AnyBalance.requestPost(baseurlHelper + "logon.aspx", {
                wasRedirected: '1',
                submit: 'Go'
            }, headers);
            
        }

        html = AnyBalance.requestGet(baseurlHelper + "account-status.aspx", headers);
//        AnyBalance.trace(html);
        fetchAccountStatus(html, result);
    }

    AnyBalance.setResult(result);
}

