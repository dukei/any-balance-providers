 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Skype IP-телефония
Сайт оператора: http://www.skype.com/
Личный кабинет: https://www.skype.com/

Не отлаживается в AnyBalanceDebugger из-за бага в webkit: 
http://code.google.com/p/chromium/issues/detail?id=96136
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
        //info = AnyBalance.requestGet('URL к залогиненому кабинету');
    }

    if(!/secure\.skype\.com\/account\/logout/i.test(info)){
        var error = getParam(info, null, null, /<div class="messageBody[^>]*>([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удается зайти в личный кабинет. Сайт изменен?");
    }
    var result = {success: true};
    var matches;

    //getParam(info, result, 'balance', /<a[^>]*class="credit(?:ATU)? icon[\s\S]*?<a[^>]*class="first[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'balance', /class="credit[\s\S]{1,50}icon[\s\S]*?class="first">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'currency', /class="credit[\s\S]{1,50}icon[\s\S]*?class="first">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('subscriptions')){
    	//getParam(info, result, 'subscriptions', /<li[^>]+class="subs"[^>]*>([\s\S]*?)<(?:ul|li)[^>]*>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'subscriptions', /class="subscriptions icon[\s\S]*?class="first"[\s\S]*?">([\s\S]*?)span>/i, replaceTagsAndSpaces, parseBalance);
		
        if(!result.subscriptions) result.subscriptions = 0;
    }
    sumParam(info, result, 'minsLeft', /<span[^>]+class="(?:minsLeft|link)"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'landline', /<li[^>]+class="landline"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'sms', /<li[^>]+class="sms"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'wifi', /<li[^>]+class="wifi"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    
    if(AnyBalance.isAvailable('inactivein')){
        getParam(info, result, 'inactivein', /Your Skype Credit becomes inactive in\s*([0-9]*)\s+day/i, replaceTagsAndSpaces, parseBalance);
        if(!result.inactivein){
            if(/Your Skype Credit becomes inactive tomorrow/i.test(info)){
                result.inactivein = 1;
            }else if(/Your Skype Credit becomes inactive today/i.test(info)){
                result.inactivein = 0;
            }else{
                result.inactivein = 180;
            }
        }
    }
	AnyBalance.setResult(result);
}