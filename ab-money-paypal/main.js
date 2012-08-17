/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток в PayPal

Сайт оператора: https://www.paypal.com/ru
Личный кабинет: https://www.paypal.com/ru
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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login)
        throw new AnyBalance.Error("Enter e-mail!");
    if(!prefs.password)
        throw new AnyBalance.Error("Enter password!");

    var baseurl = "https://www.paypal.com/webapps/mpp/home";

    var html = AnyBalance.requestGet(baseurl);

    var href = getParam(html, null, null, /<form[^>]*action="([^"]+)"[^>]*name="login_form"/i);
    var csrfModel = getParam(html, null, null, /<input[^>]*name="csrfModel.returnedCsrf"[^>]*value="([^"]+)"/i);
    if(!href || !csrfModel)
        throw new AnyBalance.Error("Can not find login form! Site is changed?");

    html = AnyBalance.requestPost(href, {
      "csrfModel.returnedCsrf": csrfModel,
      login_email: prefs.login,
      login_password:prefs.password,
      "submit.x": "Log in"
    });

    var error = getParam(html, null, null, /<div[^"]*class="[^"]*error[^"]*">\s*<h2[^>]*>[^<]*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    href = getParam(html, null, null, /"([^"]*_login-done[^"]*)/i);
    if(!href)
        throw new AnyBalance.Error("Can not log in. Wrong login, password or site is changed.");

    html = AnyBalance.requestGet(href);

    var result={success: true};

    getParam(html, result, 'balance', /<span[^>]*class="balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
