/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Сахалинского провайдера ТТК-Сахалин
Сеть связи ТТК-Сахалин является составной частью магистральной цифровой сети связи компании ТТК. 

Сайт оператора: http://sakhttk.ru
Личный кабинет: https://issa.sakhttk.ru/
*/

function sumParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

        var total_value;
	html.replace(regexp, function(str, value){
		for (var i = 0; replaces && i < replaces.length; i += 2) {
			value = value.replace (replaces[i], replaces[i+1]);
		}
		if (parser)
			value = parser (value);
                if(typeof(total_value) == 'undefined')
                	total_value = value;
                else
                	total_value += value;
        });

    if(param && typeof(total_value) != 'undefined'){
      if(typeof(result[param]) == 'undefined')
      	result[param] = total_value;
      else 
      	result[param] += total_value;
    }else{
      return total_value;
    }
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s|\xA0/, "", ",", ""];

function parseBalance(text){
    var val = sumParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa.sakhttk.ru/';
    
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
        cmd:'login'
    });
    
    var error = sumParam(html, null, null, /<div class="?err"?>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error); 
        
    var result = {success: true};

    sumParam(html, result, 'balance', /Баланс:[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, '__tariff', /Тариф:[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
    sumParam(html, result, 'licschet', /л\/с:[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
    sumParam(html, result, 'timeleft', /примерно на[^<]*?(\d+)/i, null, parseInt);

    AnyBalance.setResult(result);
}

