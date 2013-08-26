/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для оператора  https://sgku.ru

Operator site: https://sgku.ru
Личный кабинет: https://sgku.ru
*/
/*
function onChangeLocality(){
    var locality = AnyBalance.getPreference('locality');
    var surgut = (locality.get('value') == 'Сургут');

    AnyBalance.getPreference('street').set('visible', surgut);
    AnyBalance.getPreference('house').set('visible', surgut);
    AnyBalance.getPreference('flat').set('visible', surgut);
    AnyBalance.getPreference('account').set('visible', !surgut);
}
*/

/**
 *  Проверяет, является ли объект массивом
    Эта функция требуется в API но по случайности там не определена. На всякий случай определяем здесь.
 */
function isArray(arr){
	return Object.prototype.toString.call( arr ) === '[object Array]';
}

function onChangeLocality(){
    var props = AnyBalance.getPreferenceProperties({
        locality: {
            value: ''
        }
    });

    var surgut = (props.locality.value == 'Сургут');

    AnyBalance.setPreferenceProperties({
        street: {visible: surgut},
        house: {visible: surgut},
        flat: {visible: surgut},
        account: {visible: !surgut},
    });

//    AnyBalance.requestGet('http://bing.com/', null, {callback: onGetURL});
}

function onGetURL(info){
    delete info.content;
    AnyBalance.trace(AnyBalance.getLastUrl() + ":" + JSON.stringify(info));
}

function main(){
    var baseurl = "https://sgku.ru/";
    AnyBalance.addCallback('change#locality', onChangeLocality);

//    AnyBalance.requestPost('http://ya.ru/', {test: 1}, null, {callback: onGetURL});
//    AnyBalance.requestGet('https://google.ru/', null, {callback: onGetURL});
    
    onChangeLocality();
}
