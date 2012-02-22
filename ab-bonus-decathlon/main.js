/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Бонусная программа Декатлон

Сайт оператора: http://www.decathlon.ru/RU/
Личный кабинет: http://customercard.decathlon.fr/netcard/index.jsp?language=RU&country=RU
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

function main(){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet("https://customercard.decathlon.fr/netcard/index.jsp?language=RU&country=RU");
    
    var addr = getParam(html, null, null, /<iframe[^>]*?id="ifrmIS"[^>]*?src="([^"]*)"/);

    html = AnyBalance.requestGet(addr);
    
    addr = getParam(html, null, null, /name="autoSubmitForm"[^>]*?action="([^"]*)"/);
    if(!addr){

    html = AnyBalance.requestPost('https://id.oxylane.com/idserver1/main/checkLogin.do', {
	webCommVer: getParam(html, null, null, /name="webCommVer"\s+value="([^"]*)"/),
	rpcode: getParam(html, null, null, /name="rpcode"\s+value="([^"]*)"/),
	callbackurl: getParam(html, null, null, /name="callbackurl"\s+value="([^"]*)"/),
	subSessionId: getParam(html, null, null, /name="subSessionId"\s+value="([^"]*)"/),
        login: prefs.login,
        password: prefs.password
    });
    }
    
    addr = getParam(html, null, null, /name="autoSubmitForm"[^>]*?action="([^"]*)"/);
    if(!addr){
      var errors = [];
      html.replace(/class="msgValidation"[^>]*>([\s\S]*?)<\/span>/g, function(str, p1){
        if(p1)
	  errors.push(p1.replace(/<[^>]*>/g, ''));
      });
      throw new AnyBalance.Error(errors.join(', ') || "Невозможно войти по неизвестной причине. Свяжитесь с автором.");
    }

    html = AnyBalance.requestPost(addr, {
	callbackevent: getParam(html, null, null, /name="callbackevent"\s+value="([^"]*)"/),
	webaccountid: getParam(html, null, null, /name="webaccountid"\s+value="([^"]*)"/),
	magic: getParam(html, null, null, /name="magic"\s+value="([^"]*)"/),
	data: getParam(html, null, null, /name="data"\s+value="([^"]*)"/),
	localelc: getParam(html, null, null, /name="localelc"\s+value="([^"]*)"/)
    });

    html = AnyBalance.requestGet('https://customercard.decathlon.fr/netcard/site/loadOxidAccount.do');

    var result = {success: true, balance: null};
   
    getParam(html, result, 'balance', /<p id="espace_perso_solde_phrase">.*?(\d+)/, null, parseInt);

    AnyBalance.setResult(result);
}

