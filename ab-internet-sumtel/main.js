/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по Федеральному интернет провайдеру Сумма Телеком, представленному 
в городах Санкт-Петербург, Нижний Новгород, Тула, Орел, Воронеж, Липецк, Ростов-на-Дону, Тверь, Краснодар, Махачкала, Каспийск

Сайт оператора: http://www.sumtel.ru
Личный кабинет: http://my.sumtel.ru/
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

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    //По санкт-петербургу пока старый кабинет. Новый стал с капчей
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.sumtel.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + 'Default.aspx', {
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      __EVENTVALIDATION: eventvalidation,
      ctl00$txtLogin:prefs.login,
      ctl00$txtPassword:prefs.password,
      ctl00$btnLogin:'ВОЙТИ'
    });

    if(!/ctl00_btnLogout/i.test(html)){
        var error = getParam(html, null, null, /lblError[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        if(/MAIN_FORM_NAME/.test(html))
            throw new AnyBalance.Error("Для вашего региона личный кабинет находится по адресу http://my.sumtel.ru. AnyBalance не может в него зайти, потому что на входе необходимо вводить циферки с картинки.");
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /lblOstatok[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /lblStatus[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /lblTarifName[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', /lblTarifCost[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /lblClientName[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function mainMy(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://my.sumtel.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);

    AnyBalance.trace('Authenticating');
    html = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php', {
        LOGIN:prefs.login,
        PASSWORD:prefs.password});

    AnyBalance.trace('Got result from service guide: ' + html);

    var matches;
    if(matches = html.match(/<ERROR_ID>(.*?)<\/ERROR_ID>/i)){
        var errid = matches[1];
        AnyBalance.trace('Got error from sg: ' + errid);
        //Случилась ошибка, может быть мы можем даже увидеть её описание
        if(matches = html.match(/<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i)){
            AnyBalance.trace('Got error message from sg: ' + matches[1]);
            throw new AnyBalance.Error(matches[1]);
        }

        errid = "js.login.error." + Math.abs(parseInt(errid));
        if(GlbLoginJSPhrases[errid])
            throw new AnyBalance.Error(GlbLoginJSPhrases[errid]);

        AnyBalance.trace('Got unknown error from sg');
        throw new AnyBalance.Error(GlbLoginJSPhrases['js.login.error.0']);
    }

    if(!(matches = html.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/i))){
        throw new AnyBalance.Error('Не удалось получить сессию');
    }

    var result = {success: true};
    var S = matches[1];

    html = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO', {
        SESSION_ID:S,
        CHANNEL:'WWW'});

    getParam(html, result, 'fio', /<div[^>]*class="group-client"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    //Баланс
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Текущий тарифный план
    getParam(html, result, '__tariff', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    //Абонентская плата по услугам
    getParam(html, result, 'abon', /&#1040;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1089;&#1082;&#1072;&#1103; &#1087;&#1083;&#1072;&#1090;&#1072; &#1087;&#1086; &#1091;&#1089;&#1083;&#1091;&#1075;&#1072;&#1084;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Статус абонента
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1072;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

var GlbLoginJSPhrases = {};
GlbLoginJSPhrases['js.login.error.1'] = 'Введите логин!';
GlbLoginJSPhrases['js.login.error.2'] = 'Введите пароль!';
GlbLoginJSPhrases['js.login.error.3'] = 'Введите защитный код!';
GlbLoginJSPhrases['js.login.error.4'] = 'Неверный префикс.';
GlbLoginJSPhrases['js.login.error.5'] = 'Защитный код устарел.';
GlbLoginJSPhrases['js.login.error.6'] = 'Введен неверный защитный код.';
GlbLoginJSPhrases['js.login.error.7'] = 'Выберите контрольный вопрос.';
GlbLoginJSPhrases['js.login.error.8'] = 'Введите ответ на контрольный вопрос.';
GlbLoginJSPhrases['js.login.error.9'] = 'Вам недоступен список контрольных вопросов.';
GlbLoginJSPhrases['js.login.error.10'] = 'Передан неизвестный параметр.';
GlbLoginJSPhrases['js.login.error.11'] = 'Ваш ответ слишком короткий.';
GlbLoginJSPhrases['js.login.error.12'] = 'Не заполнено поле со старым паролем.';
GlbLoginJSPhrases['js.login.error.13'] = 'Не заполнено поле с новым паролем.';
GlbLoginJSPhrases['js.login.error.14'] = 'Не заполнено поле подтверждения пароля.';
GlbLoginJSPhrases['js.login.error.100'] = 'Вход в систему самообслуживания. Пожалуйста подождите.';
GlbLoginJSPhrases['js.login.error.200'] = 'Ошибка запроса на сервер. Обратитесь, пожалуйста, в службу поддержки.';
GlbLoginJSPhrases['js.login.error.0'] = 'Ошибка. Сервис недоступен. Обратитесь, пожалуйста, в службу поддержки.';
