/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и номер счета Яндекс.Деньги

Сайт оператора: http://money.yandex.ru/
Личный кабинет: https://money.yandex.ru/
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

function parseBalance(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function getIdKey(html){
    return getParam(html, null, null, /<input[^>]*name="idkey"[^>]*value="([^"]*)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login)
        throw new AnyBalance.Error("Введите логин!");
    if(!prefs.password)
        throw new AnyBalance.Error("Введите пароль!");

    var baseurl = "https://passport.yandex.ru/passport?mode=auth&from=money&retpath=https%3A%2F%2Fmoney.yandex.ru%2Findex.xml&msg=money";

    var html = AnyBalance.requestGet("https://money.yandex.ru");
    var headers = {
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection:'keep-alive',
//        Origin:'https://money.yandex.ru',
//        Referer:'https://money.yandex.ru/',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.52 Safari/536.5'
    };

    html = AnyBalance.requestPost(baseurl, {
      login: prefs.login,
      passwd:prefs.password,
      timestamp: new Date().getTime()
    }, headers);

    var error = getParam(html, null, null, /b\-login\-error[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    if(/Установить постоянную авторизацию на(?:\s|&nbsp;)+данном компьютере\?/i.test(html)){
        //Яндекс задаёт дурацкие вопросы.
        AnyBalance.trace("Яндекс спрашивает, нужно ли запоминать этот компьютер. Отвечаем, что нет... (idkey=" + getIdKey(html) + ")");
        html = AnyBalance.requestPost("https://passport.yandex.ru/passport?mode=auth", {
            filled:'yes',
            timestamp:new Date().getTime(),
            idkey:getIdKey(html), 
            no:1
        }, headers);
    }

    if(!/current\-user\-balance\-link/i.test(html))
        throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");

    var result={success: true};

    getParam(html, result, 'balance', /"current-user-balance-link"[^>]*>(.*?)</i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /"b-account__number__text"[^>]*>(.*?)</i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /"b-account__number__text"[^>]*>(.*?)</i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
