/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseDate2(str){
    var matches = /(\d{2,4})-(\d{2})-(\d{2})/.exec(str);
    if(matches){
          var year = +matches[1];
          var date = new Date(year < 1000 ? 2000 + year : year, matches[2]-1, +(matches[3] || 1),  0,0,0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}


function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "http://stat.etelecom.ru";

    var html = AnyBalance.requestPost(baseurl + "/login", {
        login_name:prefs.login,
        login_pass:prefs.password,
        login_submit:'Войти'
    });

    if(!/Биллинговая панель Etelecom/i.test(html)){
        var error = getParam(html, null, null, /<div class="bad-msg err">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); 
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<td>Баланс<\/td>\s*?<td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<td>ФИО<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'tariff_name', /<td>Текущий тариф<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<td>Статус<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /<td>Кредит<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'block', /<td>Блокировка<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + '/info');

    getParam(html, result, 'tariff_cost', /<td>Абонентская плата<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'writeoff_date', /<td>Дата начала расчетного периода<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseDate2);
    getParam(html, result, 'tariff_speed', /<td>Скорость<\/td>\s+<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
