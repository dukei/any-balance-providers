/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Life:) — GSM оператор мобильной связи.
Сайт оператора: http://www.life.com.ua/
Автоматическая Система Самообслуживания Абонентов (АССА): https://my.life.com.ua/web/login.jsp?locale=ua
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
	var prefs = AnyBalance.getPreferences();
        var html=AnyBalance.requestGet("https://my.life.com.ua/wap/jsps/myAccount.jsp?language=uk&srcpage=/wap/home.jsp");
        var frompage=getParam(html, null,null, /name="frompage" value="([^"]*)"/i);
	var html = AnyBalance.requestPost('https://my.life.com.ua/wap/servlet/aus?language=uk&srcpage=/wap/home.jsp', {
		frompage: frompage,
		topage: "/wap/jsps/balanceCheck/index.jsp",
		prefix: prefs.prefph,
		msisdn: prefs.phone,
		password: prefs.pass
	});
        var error = getParam(html, null, null, />([^>]*?):?\s*<form action="\/wap\/servlet\/aus/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);

	var result = {success: true};
	getParam(html, result, 'Mbalance', /(?:Ви маєте|у Вас есть) (-?\d[\d\.,\s]*) грн. (?:на основному та|на основном и)/i, replaceFloat, parseFloat);
	getParam(html, result, 'Bbalance', /грн. на (?:основному та|основном и) (-?\d[\d\.,\s]*) грн. на/i, replaceFloat, parseFloat);

        html = AnyBalance.requestGet("https://my.life.com.ua/wap/jsps/tariffs/index.jsp?language=uk&srcpage=/wap/jsps/myAccount.jsp");
	getParam(html, result, '__tariff', /(?:Ваш поточний тарифний план|Ваш текущий тарифный план): (.*)/i, replaceTagsAndSpaces);
	
        
        AnyBalance.setResult(result);
}