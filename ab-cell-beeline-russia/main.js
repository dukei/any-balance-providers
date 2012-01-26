/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Билайн (Россия).
Вдохновение почерпано у http://mtsoft.ru

Сайт оператора: http://beeline.ru/        
Личный кабинет: https://uslugi.beeline.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://uslugi.beeline.ru/"
    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "loginPage.do", {
    	ecareAction: 'login',
      userName: prefs.login,
      password: prefs.password,
      _stateParam: 'eCareLocale.currentLocale=ru_RU__Russian'
    });

    var regexp=/<span class="warn">[\s]*([\s\S]*?)[\s]*<\/span>/, res, tmp;
    if (res=regexp.exec(html)){
        //Ошибка какая-то случилась... Может, пароль неправильный
      	throw new AnyBalance.Error(res[1].replace(/<[^<>]+\/?>/g, ''));
    }

    var result = {success: true};

    AnyBalance.trace("It looks like we are in selfcare...");

    // ФИО
    getParam (html, result, 'userName', /Владелец договора[\s\S]*?<td[^>]*>(.*?)</);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Состояние номера[\s\S]*?<td[^>]*>(.*?)</);

    // Номер договора
    getParam (html, result, 'license', /Номер договора[\s\S]*?<td[^>]*>(.*?)</);
    
    AnyBalance.trace("Fetching finantial info...");

    html = AnyBalance.requestPost(baseurl + "VIPLoadPrepaidCtnFinancialInfoAction.do", '');

    AnyBalance.trace("Parsing finantial info...");
    
    var alltransformations = [/[\s\xA0]/, "", ",", "."];

    // Тарифный план
    result.__tariff = getParam (html, null, null, /Текущий тарифный план[\s\S]*?<td>([\s\S]*?)</, [/&nbsp;/g, ' ', /^\s+|\s+$/g, '']);

    // Баланс
    getParam (html, result, 'balance', /Основной баланс[\s\S]*?'tab(?:text|red)'>([\-\d,\s]+)</, alltransformations, parseFloat);
    
    // Бонус-баланс
    getParam (html, result, 'bonus_balance', /Бонус-баланс[\s\S]*?'tabtext'>([\d,\s]+)</, alltransformations, parseFloat);
    
    if(AnyBalance.isAvailable('sms_left')){
      result.sms_left = 0;
      
      // SMS-баланс
      var sms = getParam(html, null, null, /SMS-баланс[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.sms_left += sms || 0;
      
      // SMS в подарок
      sms = getParam(html, null, null, /SMS в подарок[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.sms_left += sms || 0;
      
      // Бесплатные SMS
      sms = getParam(html, null, null, /Бесплатные SMS[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.sms_left += sms || 0;
    }
    
    // MMS в подарок
    getParam (html, result, 'mms_left', /MMS в подарок[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);

    if(AnyBalance.isAvailable('min_left')){
      result.min_left = 0;
      
      // Бесплатные секунды
      var sms = getParam(html, null, null, /Бесплатные секунды[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.min_left += sms || 0;
      
      // Время в подарок
      sms = getParam(html, null, null, /Время в подарок[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.min_left += sms || 0;
      
      // БОНУС_СЕКУНДЫ
      sms = getParam(html, null, null, /БОНУС_СЕКУНДЫ[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.min_left += sms || 0;
    }

    AnyBalance.setResult(result);

}

