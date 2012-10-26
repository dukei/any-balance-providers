 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Skype IP-телефония
Сайт оператора: http://www.skype.com/
Личный кабинет: https://www.skype.com/

Не отлаживается в AnyBalanceDebugger из-за бага в webkit: 
http://code.google.com/p/chromium/issues/detail?id=96136
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
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

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}


var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = html_entity_decode(text.replace(/\s+/, ''));
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = html_entity_decode(text.replace(/\s+/, '')).replace(/[\-\d\.,]+/,'');
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
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

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseLogin = 'https://secure.skype.com/login?application=account&intcmp=sign-in&return_url=https%3A%2F%2Fsecure.skype.com%2Faccount%2Flogin';
    
    var info = AnyBalance.requestGet(baseLogin);
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

    if(!/secure\.skype\.com\/account\/logout/i.test(info)){
        var error = getParam(info, null, null, /<div class="messageBody[^>]*>([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удается зайти в личный кабинет. Сайт изменен?");
    }
     
    
    var result = {
        success: true
    };

    var matches;

    getParam(info, result, 'balance', /<a[^>]*class="first"[^>]*store.buy.skypecredit[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'currency', /<a[^>]*class="first"[^>]*store.buy.skypecredit[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('subscriptions')){
    	getParam(info, result, 'subscriptions', /<li[^>]+class="subs"[^>]*>([\s\S]*?)<(?:ul|li)[^>]*>/i, replaceTagsAndSpaces, parseBalance);
        if(!result.subscriptions) result.subscriptions = 0;
    }
		
    sumParam(info, result, 'minsLeft', /<span[^>]+class="(?:minsLeft|link)"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'landline', /<li[^>]+class="landline"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'sms', /<li[^>]+class="sms"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'wifi', /<li[^>]+class="wifi"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

