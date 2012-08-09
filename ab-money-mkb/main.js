/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт и кредитов Московского Кредитного Банка, используя систему Интернет-Банк.

Сайт оператора: http://mkb.ru/
Личный кабинет: https://online.mkb.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
		    value = typeof(value[1]) == 'undefined' ? value[0] : value[1];
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
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getViewState1(html){
    return getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation1(html){
    return getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /-?\d[\d\s.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    if(matches){
          var date = new Date(+matches[3], matches[2]-1, +matches[1]);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://online.mkb.ru";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + '/secure/login.aspx?newsession=1');
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + '/secure/login.aspx?newsession=1', {
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      __EVENTVALIDATION:eventvalidation,
      txtLogin:prefs.login,
      txtPassword:prefs.password,
      btnAtl:'Войти'
    });

    error = getParam(html, null, null, /<span[^>]*id="lblErrorMsg"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var logout = getParam(html, null, null, /(\/secure\/logout.aspx)/i);
    if(!logout)
        throw new AnyBalance.Error("Не удалось зайти в интернет банк. Неправильный логин-пароль или проблемы на сайте.");

    if(prefs.type == 'card')
        fetchCard(html, baseurl);
    else if(prefs.type == 'crd')
        fetchCredit(html, baseurl);
    else
        fetchCard(html, baseurl);
    
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите 4 последних цифры карты или не указывайте ничего, чтобы получить информацию по первой карте.");

    var $html = $(html);
    var $card = $html.find('tr.btnrscards' + (prefs.num ? ':has(td[title*="***' + prefs.num + '"])' : '')).first();
    if(!$card.size())
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти карту с последними цифрами " + prefs.num : "Не удалось найти ни одной карты!");

    var result = {success: true};
    
    getParam($card.find('td:first-child').attr('title'), result, 'cardnum', null, replaceTagsAndSpaces);
    getParam($card.find('td:first-child').text(), result, 'type', null, replaceTagsAndSpaces);
    getParam($card.find('td:first-child').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($card.find('td.money').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($card.find('td.money').text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);

    var href = $card.find('td:first-child a').attr('href');
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по карте');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'grace', 'gracetill', 'pct', 'credit', 'limit') && href){
        html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, 'needpay', /Обязательный платеж\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'needpaytill', /Обязательный платеж\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'gracepay', /Отчетная задолженность\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gracepaytill', /Отчетная задолженность\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'pct', /Срочные проценты[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credit', /Срочный Кредит[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'limit', /Установленный лимит задолженности[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}

function fetchCredit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^[\d\/\\]{2,}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите первые цифры (не менее 2) номера кредитного договора или не указывайте ничего, чтобы получить информацию по первому кредитному договору.");

    var $html = $(html);
    var $crd = $html.find('tr.btnrsloans' + (prefs.num ? ':has(td[title^="' + prefs.num + '"])' : '')).first();
    if(!$crd.size())
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти кредитный договор с первыми цифрами " + prefs.num : "Не удалось найти ни одного кредита!");

    var result = {success: true};
    
    var crdid = getParam($crd.find('td:first-child').attr('title'), null, null, null, replaceTagsAndSpaces);
    getParam($crd.find('td:first-child').attr('title'), result, 'cardnum', null, replaceTagsAndSpaces);
    getParam($crd.find('td:first-child').text(), result, 'type', null, replaceTagsAndSpaces);
    getParam($crd.find('td:first-child').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($crd.find('td.money').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($crd.find('td.money').text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);

    var href = $crd.find('td:first-child a').attr('href');
    AnyBalance.trace('Ссылка на подробную инфу о кредите: ' + href);
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по кредиту');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'pctcredit', 'limit', 'latedebt') && href){
        html = AnyBalance.requestGet(baseurl + href);
//        AnyBalance.trace(html);

        html = AnyBalance.requestPost(baseurl + '/secure/loans.aspx', {
            ctl00$ctl00$scripts:'ctl00$ctl00$scripts|ctl00$ctl00$SimpleContentPlaceHolder$MCPHolder$LoansProcessorTimer',
            ctl00_ctl00_scripts_HiddenField:'',
            __EVENTTARGET:'ctl00$ctl00$SimpleContentPlaceHolder$MCPHolder$LoansProcessorTimer',
            __EVENTARGUMENT:'',
            __VIEWSTATE:getViewState(html),
            __EVENTVALIDATION:getEventValidation(html),
            __ASYNCPOST:true
        }, {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1',
            'X-MicrosoftAjax':'Delta=true',
            'X-Requested-With':'XMLHttpRequest'
        });

//        AnyBalance.trace(html);

        $html = $('<div>' + html + '</div>');
        var $tr = $html.find('table.cardlist tr:contains("' + crdid + '")').first();
        AnyBalance.trace("Поиск информации о кредите " + crdid + ": найдено " + $tr.size());
        if(!$tr.size()){
            AnyBalance.trace("Не удалось найти расширенную информацию о кредите");
        }else{
            getParam($tr.find('td:nth-child(4)').text(), result, 'limit', null, replaceTagsAndSpaces, parseBalance);
            getParam($tr.find('td:nth-child(5)').text(), result, 'needpaytill', null, replaceTagsAndSpaces, parseDate);
            getParam($tr.find('td:nth-child(6)').text(), result, 'latedebt', null, replaceTagsAndSpaces, parseBalance);
   
            var crdid1 = $tr.find('td:first-child input[type="radio"]').val();
            if(!crdid1){
                AnyBalance.trace("Не удалось найти ещё более расширенную информацию о кредите");
            }else if(AnyBalance.isAvailable('accnum', 'needpay', 'pctcredit') && crdid1){
                html = AnyBalance.requestPost(baseurl + '/secure/loans.aspx', {
                    ctl00$ctl00$scripts:'ctl00$ctl00$SimpleContentPlaceHolder$MCPHolder$upLoansList|' + crdid1,
                    ctl00_ctl00_scripts_HiddenField:'',
                    rbgLoans:crdid1,
                    __EVENTTARGET:crdid1,
                    __EVENTARGUMENT:'',
                    __LASTFOCUS:'',
                    __VIEWSTATE:getViewState1(html),
                    __EVENTVALIDATION:getEventValidation1(html),
                    __ASYNCPOST:true
                }, {
                    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1',
                    'X-MicrosoftAjax':'Delta=true',
                    'X-Requested-With':'XMLHttpRequest'
                });

                getParam(html, result, 'accnum', /Лицевой счет №:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
                getParam(html, result, 'needpay', /Сумма ближайшего платежа:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, 'pctcredit', /процентная ставка по кредиту:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            }
        }

    }
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

