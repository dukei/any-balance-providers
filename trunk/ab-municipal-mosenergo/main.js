/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для московского поставщика электроэнергии мосэнергосбыт

Сайт оператора: http://mosenergosbyt.ru
Личный кабинет: https://lkkbyt.mosenergosbyt.ru
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lkkbyt.mosenergosbyt.ru/";

    if(!/^\d{10}$/.test(prefs.login || ''))
        throw new AnyBalance.Error('Введите 10 цифр лицевого счета без пробелов и разделителей.');

    var parts = /^(\d{5})(\d{3})(\d{2})$/.exec(prefs.login);

    var html = AnyBalance.requestPost(baseurl + 'backLink.jsf?mode=auth', {
        book: parts[1],
	num: parts[2],
	kr: parts[3],
	psw:prefs.password,
        x: 37,
        y: 9
    }, g_headers);

//    var params = AnyBalance.getLastResponseParameters();
//    AnyBalance.trace(JSON.stringify(params));

    //Выход из кабинета
    if(!/&#1042;&#1099;&#1093;&#1086;&#1076; &#1080;&#1079; &#1082;&#1072;&#1073;&#1080;&#1085;&#1077;&#1090;&#1072;/i.test(html)){
        if(html.length < 5000 && AnyBalance.getLevel() < 5) //Обрезается по '\0'
            throw new AnyBalance.Error("К сожалению, из-за ошибки в Android 4.0+ этот провайдер не работает. Для исправления, пожалуйста, дождитесь следующей версии AnyBalance.");
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер счета или пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#1077;&#1090;&#1072;([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /№ лицевого счёта:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /№ лицевого счёта:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lastdate', /Информация о последнем платеже[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastcounter', /Информация о последнем платеже[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastsum', /Информация о последнем платеже[\s\S]*?<tbody[^>]*>[\s\S]*?Итого(?:[\s\S]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
