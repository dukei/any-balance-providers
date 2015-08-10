/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Tambov GSM.
Провайдер получает текущий баланс и название тарифного плана онлайн, из Личного Кабинета. Для работы требуется указать в настройках логин (номер, 6 цифр) и пароль.

Сайт оператора: http://www.tambovgsm.com/
Личный кабинет: http://www.tambovgsm.com/PrivateOffice/PrivateOffice_main.php
*/

function main() {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet('http://www.tambovgsm.com/PrivateOffice/PrivateOffice_main.php?Login='+prefs.login+'&Password='+prefs.password+'&Auth=Auth');

    var r = new RegExp('<TD class="RB">\\s+(-?[0-9.]+)\\s');
    var matches=r.exec(html);

    var result = {
        success: true
    };

    if(matches==null) {
        throw new AnyBalance.Error('Невозможно получить данные. Проверьте логин и пароль.');
    } else {
        result.balance=parseFloat(matches[1]);
    }

    r = new RegExp('<TD class="TP">([\\s\\S]+?)</TD>');
    matches=r.exec(html);
    if(matches!=null) {
        matches[1]=matches[1].replace(/^\s+|\s+$/g,'');
        result.__tariff=matches[1];
    }

    AnyBalance.setResult(result);
}