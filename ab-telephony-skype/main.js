 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Skype IP-телефония
Сайт оператора: http://www.skype.com/
Личный кабинет: https://www.skype.com/
*/
function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseLogin = 'https://login.skype.com/login?application=account&intcmp=sign-in&return_url=https%3A%2F%2Fsecure.skype.com%2Faccount%2Flogin', info='';
    
    if(!prefs.__dbg){
        info = AnyBalance.requestGet(baseLogin);
        var form = getParam(info, null, null, /<form[^>]+id="LoginForm[^>]*>([\s\S]*?)<\/form>/i);
        if(!form)
            throw new AnyBalance.Error("Не удаётся найти форму входа. Сайт изменен или проблемы на сайте.");
        
        var params = createFormParams(form, function(params, input, name, value){
            var undef;
            if(name == 'username')
                value = prefs.login;
            else if(name == 'password')
                value = prefs.password;
           
            return value;
        });
        
        info = AnyBalance.requestPost(baseLogin, params);
    }else{
        info = AnyBalance.requestGet('https://secure.skype.com/portal/overview');
    }

    if(!/secure\.skype\.com\/account\/logout/i.test(info)){
        var error = getParam(info, null, null, /class="messageBody[^>]*>([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удается зайти в личный кабинет. Сайт изменен?");
    }
    var result = {success: true, subscriptions:0};

	getParam(info, result, 'balance', /class="credit(?:[\s\S]*?<span[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', 'balance'], /class="credit(?:[\s\S]*?<span[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(info, result, 'subscriptions', /asideSkypeSubscription[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);    
    sumParam(info, result, 'minsLeft', /<span[^>]+class="(?:minsLeft|link)"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    getParam(info, result, 'landline', /<li[^>]+class="landline"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'sms', /<li[^>]+class="sms"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'wifi', /<li[^>]+class="wifi"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    
    if(AnyBalance.isAvailable('inactivein','inactivedate')){
        info = AnyBalance.requestGet('https://secure.skype.com/account/credit-reactivate?setlang=ru');
        var date = getParam(info, null, null, /<span[^>]+class="expiryDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
        if(date){
            if(AnyBalance.isAvailable('inactivedate'))
                result.inactivedate = date;
            if(AnyBalance.isAvailable('inactivein'))
                result.inactivein = Math.ceil((date - (new Date().getTime()))/86400/1000);
        }else{
            AnyBalance.trace('Не удалось получить дату инактивации денег на счету');
        }
    }

    AnyBalance.setResult(result);
}

function parseCurrencyMy(text){
	var match = /(\S*?)\s*-?\d[\d.,]*\s*(\S*)/i.exec(text);
	if(match){
		var first = match[1];
		var second = match[2];
	}else {
		AnyBalance.trace('Couldn`t parse currency from: ' + text);
		return text;
	}
	
	var val = getParam(first ? first : second, null, null, null, replaceTagsAndSpaces);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}