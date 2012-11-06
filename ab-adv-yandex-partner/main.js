/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает параметры рекламных партнерок Яндекса

Сайт оператора: http://partner.yandex.ru/
Личный кабинет: https://partner.yandex.ru/
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

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
          AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse date from value: ' + str);
}

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Сonnection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.52 Safari/536.5'
};

function getIdKey(html){
    return getParam(html, null, null, /<input[^>]*name="idkey"[^>]*value="([^"]*)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Введите логин!");
    if(!prefs.password)
        throw new AnyBalance.Error("Введите пароль!");
    if(prefs.cid && !/\d+/.test(prefs.cid))
        throw new AnyBalance.Error("Введите ID рекламной кампании, по которой вы хотите получить информацию. Он должен состоять только из цифр!");

    var baseurl = "https://passport.yandex.ru/passport?mode=auth";
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
    var idKey = getIdKey(html);
    if(!idKey)
        throw new AnyBalance.Error("Не удаётся найти ключ для входа в Яндекс. Процедура входа изменилась или проблемы на сайте.");
 
    var html = AnyBalance.requestPost(baseurl, {
        from:'passport',
        idkey:idKey,
        display:'page',
        login:prefs.login,
        passwd:prefs.password,
        timestamp:new Date().getTime()
    }, g_headers);

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
        }, g_headers);
    }

    var yandexuid = getParam(html, null, null, /passport\.yandex\.ru\/passport\?mode=logout&yu=(\d+)/);
    if(!yandexuid)
        throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");

    var result={success: true};

    html = AnyBalance.requestGet('https://partner.yandex.ru/widget/statistics', g_headers);
    if(/\?cmd=campaign_add/i.test(html))
        throw new AnyBalance.Error('У вас ещё не добавлен ни один сайт в качестве рекламной площадки.');

    if(!/\?cmd=campaign_list/i.test(html)){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся получить данные. Обратитесь к автору провайдера.');
    }

    getParam(html, result, 'balance', /(?:[\s\S]*?<td[^>]+class="b-widget-cost"[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'today', /(?:[\s\S]*?<td[^>]+class="b-widget-cost"[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'yesterday', /(?:[\s\S]*?<td[^>]+class="b-widget-cost"[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
