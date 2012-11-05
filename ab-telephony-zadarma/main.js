 /*
 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Zadarma IP-телефония
Сайт оператора: http://www.zadarma.com/
Личный кабинет: https://ss.zadarma.com/

*/

function main(){
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');

	var auth = AnyBalance.requestPost("https://ss.zadarma.com/auth/login/", {
		email: prefs.login,
		password: prefs.password
	});
	
	var info = AnyBalance.requestGet("https://ss.zadarma.com");

        if(!/\/auth\/logout\//i.test(info)){
            var error = getParam(auth, null, null, /<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }

	var balance = info.match(/<span class="balance">.*\$(-?\d+[\.,]\d+).*<\/span>/i);
	var tariff = info.match(/<p><strong>(.*)<\/strong>( \(стоимость \d+\.\d+.*\))<\/p>/i);

	if (balance) {
		var result = {success: true};
		result.balance = parseFloat(balance[1].replace(/,/g, '.'));
		if (tariff) {
        	    result.__tariff = tariff[1] + tariff[2];
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить текущий баланс");
	}
	
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
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
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

