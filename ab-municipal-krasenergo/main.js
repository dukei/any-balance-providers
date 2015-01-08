/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о последнем платеже в КрасноярскЭнергоСбыт.

Сайт оператора: http://krsk-sbit.ru
Личный кабинет: http://krsk-sbit.ru/quasar.php
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://krsk-sbit.ru/quasar.php";
    var now = new Date();
    var threeMonthsAgo = new Date(now.getFullYear(), now.getMonth()-3, 1);
    var html = AnyBalance.requestPost(baseurl, {
        abonentid:prefs.login,
        fam:prefs.password,
		SendCounter:'Передача фактических показаний прибора учета',
        qm:threeMonthsAgo.getMonth(),
        qy:threeMonthsAgo.getFullYear(),
        //ShowState:'Просмотреть состояние счета, оплаты, начисления ...'
    }, g_headers);

    //Ссылка на печать квитанции
    if(!/Лицевой cчет N/i.test(html)){
        var error = getParam(html, null, null, [/<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, /<\/form>(?:\s+|<br[^>]*>)*<strong[^>]*>([\s\S]*?)<\/strong>/i], replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Введены некорректные данные/i.test(html));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер счета или фамилия?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /Абонент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой cчет N:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /((?:Переплата|Задолженность):[\s\S]*?<td[^>]*>[\s\S]*?)<\/td>/i, [/Задолженность:/ig, '-', replaceTagsAndSpaces], parseBalance);
	getParam(html, result, 'indication', /<th>\s*Предыдущее показание(?:[\s\S]*?<td[^>]*>){4}([\s\d]+)/i, replaceTagsAndSpaces, parseBalance);
	
    var tr = getParam(html, null, null, /История платежей:(?:[\s\S](?!<\/table>))*?(<tr[^>]*>(?:[\s\S](?!<\/tr>|<\/table>))*?[\s\S]<\/tr>)\s*<\/table>/i);
    if(tr){
        getParam(tr, result, 'lastpaydate', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(tr, result, 'lastpaysum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    tr = getParam(html, null, null, /История начислений:(?:[\s\S](?!<\/table>))*?(<tr[^>]*>(?:[\s\S](?!<\/tr>|<\/table>))*?[\s\S]<\/tr>)\s*<\/table>/i);
    if(tr){
        getParam(tr, result, 'lastbilldate', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(tr, result, 'indication', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'cons_ind', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'cost_ind', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'cons_com', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'cost_com', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'cons_tot', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'cost_tot', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}