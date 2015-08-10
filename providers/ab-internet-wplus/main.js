/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у питерского оператора интернет Вэб Плас.

Сайт оператора: http://www.wplus.net
Личный кабинет: https://ccenter.wplus.net/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('koi8-r');

    var baseurl = "https://ccenter.wplus.net/";
    AnyBalance.setAuthentication(prefs.login, prefs.password);

    var html = AnyBalance.requestGet(baseurl + 'User/Room/main.php');

    if(!/<title>Биллинговая система Web-plus: Карточка клиента<\/title>/i.test(html)){
        if(/<TITLE>401 Authorization Required/i.test(html)){
            throw new AnyBalance.Error("Неверный логин или пароль");
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '2pay', /Рекомендуемая сумма к оплате:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'lastpaysum', /Последний платеж[^<]*на сумму([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastpaydate', /Последний платеж[^<]*на сумму[^<]*от([^<]*)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastpaydesc', /Последний платеж "([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'bonus_status', /Статусные баллы:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus_reg', /Регулярные баллы:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'agr', /<b[^>]*>Договор[\s\S]*?<b[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    var html = AnyBalance.requestGet(baseurl + 'User/Room/user_service.php');
    getParam(html, result, '__tariff', /<tr[^>]+id='tr_usl[^>]*>([\s\S]*?)(?:<\/tr>|<tr|<\/table>)/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
