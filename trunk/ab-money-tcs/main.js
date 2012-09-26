/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя систему Интернет-Банк.

Сайт оператора: http://www.tcsbank.ru/
Личный кабинет: https://www.tcsbank.ru/authentication/?service=http%3A%2F%2Fwww.tcsbank.ru%2Fbank%2F
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

var userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1';

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.tcsbank.ru";
    AnyBalance.setDefaultCharset('utf-8');

    var headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'User-Agent': userAgent
    }

    var html;
    if(!prefs.__debug){ //Вход в отладчике глючит, поэтому входим вручную, а проверяем только извлечение счетчиков
//        html = AnyBalance.requestGet(baseurl + '/authentication/?service=http%3A%2F%2Fwww.tcsbank.ru%2Fbank%2F', headers);

        html = AnyBalance.requestPost('https://auth.tcsbank.ru/cas/login', {
            callback:'jQuery171018063926370814443_1348651876467',
            service: baseurl + '/bank/',
            _eventId:'submit',
            asyncAuthError: baseurl + '/service/auth_error/',
            username:prefs.login,
            password:prefs.password,
            async:true,
            _: new Date().getTime()
        }, headers);

//        AnyBalance.trace(html);
        var json = getParam(html, null, null, /^jQuery\w+\(\s*(.*)\)\s*$/i);
        if(json){
            var json = JSON.parse(json);
            if(json.resultCode == 'AUTHENTICATION_FAILED')
                throw new AnyBalance.Error(json.errorMessage || 'Авторизация прошла неуспешно. Проверьте логин и пароль.');
            if(json.resultCode != 'OK')
                throw new AnyBalance.Error("Вход в интернет банк не удался: " + json.resultCode);
        }else{
            var logout = getParam(html, null, null, /(\/authentication\/logout)/i);
            if(!logout)
                throw new AnyBalance.Error("Не удалось зайти в интернет банк. Неправильный логин-пароль?");
        }
    }
        
    var accounts = AnyBalance.requestGet(baseurl + '/service/accounts', {'X-Requested-With':'XMLHttpRequest', Referer: baseurl + '/bank/accounts/', 'User-Agent': userAgent});
    accounts = JSON.parse(accounts);

    if(accounts.resultCode != 'OK')
        throw new AnyBalance.Error('Не удалось получить список карт: ' + accounts.resultCode);

    var cards = null;
    for(var i=0; accounts.payload && i<accounts.payload.length; ++i){
        if((!prefs.type || prefs.type == 'card') && /карты/i.test(accounts.payload[i].name)){
            cards = accounts.payload[i].accounts;
            break;
        }
    }

    fetchCard(accounts.payload[i].accounts, baseurl);
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function isset(val) {
    return typeof(val) != 'undefined';
}

function fetchCard(accounts, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите 4 последних цифры карты или не указывайте ничего, чтобы получить информацию по первой карте.");

    if(!accounts || accounts.length == 0)
        throw new AnyBalance.Error("У вас нет ни одной карты!");

    var card = null;
    var cardNumber = 0;

    if(!prefs.num){
        card = accounts[0];
    }else{
        findcard: 
        for(var i=0; i<accounts.length; ++i){
            for(var j=0; j<accounts[i].cardNumbers.length; ++j){
                 if(endsWith(accounts[i].cardNumbers[j].value, prefs.num)){
                     card = accounts[i];
                     cardNumber = j;
                     break findcard;
                 }
            }
        }
    }
    
    if(!card)
        throw new AnyBalance.Error("Не удалось найти карту с последними цифрами " + prefs.num);

    var result = {success: true};
    
    var thiscard = card.cardNumbers[cardNumber];

    if(AnyBalance.isAvailable('balance'))
        result.balance = thiscard.availableBalance.value;
    if(AnyBalance.isAvailable('currency'))
        result.currency = card.moneyAmount.currency.name;
    if(AnyBalance.isAvailable('debt') && isset(card.debtAmount))
        result.debt = card.debtAmount.value;
    if(AnyBalance.isAvailable('minpay') && isset(card.currentMinimalPayment))
        result.minpay = card.currentMinimalPayment.value;
    
    if(AnyBalance.isAvailable('name'))
        result.name = thiscard.name;
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = thiscard.value;
    if(AnyBalance.isAvailable('accnum'))
        result.accnum = card.externalAccountNumber;
    result.__tariff = thiscard.name;

    if(AnyBalance.isAvailable('minpaytill', 'limit', 'freeaddleft')){
        var accinfo = AnyBalance.requestGet(baseurl + '/service/account_info?request=current&account=' + card.id, {'X-Requested-With':'XMLHttpRequest', Referer: baseurl + '/bank/accounts/', 'User-Agent': userAgent});
        accinfo = JSON.parse(accinfo);
        if(accinfo.resultCode == 'OK'){
            for(var i=0; i<accinfo.payload.length; ++i){
                var cat = accinfo.payload[i];
                for(var j=0; j<cat.fields.length; ++j){
                    var field = cat.fields[j];
                    if(field.label == 'Кредитный лимит' && AnyBalance.isAvailable('limit'))
                        result.limit = field.value.value;
                    if(field.label == 'Оплатить до' && AnyBalance.isAvailable('minpaytill'))
                        result.minpaytill = parseDate(field.value);
                    if(field.label == 'Осталось бесплатных пополнений' && AnyBalance.isAvailable('freeaddleft'))
                        result.freeaddleft = field.value;
                }
            }
        }else{
            AnyBalance.trace('Не удалось получить расширенную информацию по карте: ' + JSON.stringify(accinfo));
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

