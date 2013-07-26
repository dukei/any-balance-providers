/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для оператора  https://sgku.ru

Operator site: https://sgku.ru
Личный кабинет: https://sgku.ru
*/

function onChangeLocality(){
    var locality = AnyBalance.getPreference('locality');
    var surgut = (locality.get('value') == 'Сургут');

    AnyBalance.getPreference('street').set('visible', surgut);
    AnyBalance.getPreference('house').set('visible', surgut);
    AnyBalance.getPreference('flat').set('visible', surgut);
    AnyBalance.getPreference('account').set('visible', !surgut);
}

function main(){
    var baseurl = "https://sgku.ru/";
    AnyBalance.trace('sdfas');
    AnyBalance.addCallback('change#locality', onChangeLocality);
    onChangeLocality();
}
