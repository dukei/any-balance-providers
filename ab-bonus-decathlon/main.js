/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Бонусная программа Декатлон

Сайт оператора: http://www.decathlon.ru/RU/
Личный кабинет: http://customercard.decathlon.fr/netcard/index.jsp?language=RU&country=RU
*/

var g_headers = {
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection':'keep-alive',
  'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet("https://customercard.decathlon.fr/netcard/index.jsp?language=RU&country=RU", g_headers);
    
    var addr = getParam(html, null, null, /<iframe[^>]*?id="ifrmIS"[^>]*?src="([^"]*)"/);

    html = AnyBalance.requestGet(addr, g_headers);
    
    addr = getParam(html, null, null, /name="autoSubmitForm"[^>]*?action="([^"]*)"/);
    if(!addr){

        html = AnyBalance.requestPost('https://id.oxylane.com/idserver1/main/checkLogin.do', {
	    webCommVer: getParam(html, null, null, /name="webCommVer"\s+value="([^"]*)"/),
	    rpcode: getParam(html, null, null, /name="rpcode"\s+value="([^"]*)"/),
	    callbackurl: getParam(html, null, null, /name="callbackurl"\s+value="([^"]*)"/),
	    subSessionId: getParam(html, null, null, /name="subSessionId"\s+value="([^"]*)"/),
            login: prefs.login,
            password: prefs.password
        }, g_headers);
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
    }, g_headers);

    html = AnyBalance.requestGet('https://customercard.decathlon.fr/netcard/site/loadOxidAccount.do', g_headers);

    var result = {success: true, balance: null};
   
    getParam(html, result, 'balance', /<\w+ id="espace_perso_solde_(?:phrase|messages)">[\s\S]*?>[^<\d]*(\d+)[^>]*</, null, parseInt);
    
    AnyBalance.setResult(result);
}

