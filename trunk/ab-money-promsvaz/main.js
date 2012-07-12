/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Промсвязьбанка, используя систему интернет-банк PSB-Retail.

Сайт оператора: http://www.psbank.ru/
Личный кабинет: https://retail.payment.ru/n/Default.aspx
*/

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

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getViewState1(html){
    return getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/);
}

function getEventValidation1(html){
    return getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/);
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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://retail.payment.ru";
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа в интернет-банк Промсвязбанка!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа в интернет-банк Промсвязбанка!");
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
      
    var html = AnyBalance.requestGet(baseurl + '/n/Default.aspx');
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + '/n/Default.aspx', {
        ctl00$ScriptManager: 'ctl00$right$RightPanelLogin$upLogin|ctl00$right$RightPanelLogin$btnLogin',
        __EVENTTARGET: '',
        __EVENTARGUMENT: '',
        __VIEWSTATE:viewstate,
        __VIEWSTATEENCRYPTED: '',
        __EVENTVALIDATION:eventvalidation,
        ctl00$right$RightPanelLogin$vtcUserName:prefs.login,
        ctl00$right$RightPanelLogin$vtcPassword:prefs.password,
        __ASYNCPOST:true,
        ctl00$right$RightPanelLogin$btnLogin:'Войти'
    });

    var error = getParam(html, null, null, /<div[^>]*class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    if(!/pageRedirect/i.test(html))
        throw new AnyBalance.Error("Не удаётся войти в интернет банк (внутренняя ошибка сайта)");
    
    if(/KeyAuth/i.test(html))
        throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");
    
    html = AnyBalance.requestGet(baseurl + '/n/Main/Home.aspx');

    if(/KeyAuth/i.test(html))
        throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");

    eventvalidation = getEventValidation(html);
    viewstate = getViewState(html);
    
    html = AnyBalance.requestPost(baseurl + '/n/Main/Home.aspx', {
        ctl00$ScriptManager:'ctl00$main$upCards|ctl00$main$cardList',
        __EVENTTARGET:'ctl00$main$cardList',
        __EVENTARGUMENT:'exp',
        __VIEWSTATE:viewstate,
        __EVENTVALIDATION:eventvalidation,
        __VIEWSTATEENCRYPTED:'',
        __ASYNCPOST:true
    });

    var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
    
    var $html = $('<div>' + html + '</div>');
    var $card = $html.find("div.cardListUnit").filter(function(){
        var num = $('.cardNumber', this).first().text();
        return new RegExp(lastdigits + '$').test(num);
    }).first();

    if($card.length <= 0)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не удаётся найти карту с последними цифрами " + lastdigits : "Не удаётся найти ни одной карты!");
    
    var result = {success: true};
    result.__tariff = $card.find(".cardNumber").text();
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = $card.find(".cardNumber").text();
    if(AnyBalance.isAvailable('type'))
        result.type = $card.find(".infoUnitInlineAddDesc").text();
    getParam($card.find("a.cardAccount").text(), result, 'accnum', /(.*)/, replaceTagsAndSpaces);
    getParam($card.find(".infoUnitAmount").text(), result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);
    getParam($card.find(".infoUnitAmount").text(), result, 'currency', /(.*)/, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('balance_own', 'blocked')){
        eventvalidation = getEventValidation1(html);
        viewstate = getViewState1(html);
        
        var href = $card.find('a.cardAccount').attr('href');
        html = AnyBalance.requestGet(baseurl + href);
        
        getParam(html, result, 'balance_own', /ctl00_main_lblAccountBalance[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'blocked', /ctl00_main_lblReserved[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
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


