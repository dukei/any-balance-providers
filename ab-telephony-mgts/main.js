 /*
 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Московская Городская Телефонная Сеть
Сайт оператора: http://www.mgts.ru/
Личный кабинет: https://lk.mgts.ru

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
        if(result && param)
            return result[param] = value;
        else
            return value;
	}
}

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function main(){
    AnyBalance.setDefaultCharset("windows-1251");
    
    var baseurl = "https://lk.mgts.ru/";
	var prefs = AnyBalance.getPreferences();
    
    var html = AnyBalance.requestGet(baseurl + "start.aspx");
    var viewstate = getViewState(html);

    var pin = prefs.password.substr(0, 8); //Слишком длинные пины тупо не воспринимаются
    
	html = AnyBalance.requestPost(baseurl + "start.aspx", {
        __VIEWSTATE: viewstate,
		txtPhone: prefs.login,
		txtPIN: pin,
        btnEnter: "Вход"
    });
    
    $html = $(html);
    var error = $.trim($html.find("#lblError").text());
    if(error)
        throw new AnyBalance.Error(error);
    
    var result = {success: true};
    if(AnyBalance.isAvailable('balance','fio','licschet')){
        html = AnyBalance.requestGet(baseurl + "CustomerInfo.aspx");
        $html = $(html);
        if(AnyBalance.isAvailable('balance')){
            result.balance = parseFloat($html.find('#lblBalance').first().text().replace(/,/g, '.').replace(/\s+/g, ''));
        }
        if(AnyBalance.isAvailable('fio')){
            result.fio = $html.find('#lblCustomerName').first().text();
        }
        if(AnyBalance.isAvailable('licschet')){
            result.licschet = parseFloat($html.find('#lblUniqueNumber').first().text());
        }
    }
    
    var html = AnyBalance.requestGet(baseurl + "CustomerDeviceList.aspx");
    var $html = $(html);
    result.__tariff = $html.find("td.pageEnterText:contains('Тарифный план:')").next().text().replace(/\s*Категория:.*/i, '');
    
    AnyBalance.setResult(result);
}