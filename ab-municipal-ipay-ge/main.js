/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает сумму долга за коммунальные услуги с сайта ipay.ge (Грузия)

Для пользования провайдером требуется знать только код плательщика (user number)

Личный кабинет: https://www.ipay.ge/navigateService.servlet?catId=category.utility.key&serId=bog-comp-telasi (Электроэнергия)
Личный кабинет: https://www.ipay.ge/navigateService.servlet?catId=category.utility.key&serId=bog-comp-cleanup (Мусор)
Личный кабинет: https://www.ipay.ge/navigateService.servlet?catId=category.utility.key&serId=bog-comp-tbilisiwater (Вода)
Личный кабинет: https://www.ipay.ge/navigateService.servlet?catId=category.tbilgazi.key&serId=bog-comp-tbilgazi-web (Газ)
*/

function checkError(html, name){
    var error = getParam(html, null, null, /<!-- Service.Error.start -->([\s\S]*?)<!-- Service.Error.end -->/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(name + ': ' + error);
    var error = getParam(html, null, null, /<!-- Parameter.Error.start -->([\s\S]*?)<!-- Parameter.Error.end -->/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(name + ': ' + error);
}

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.ipay.ge/executeService.servlet";

    if(!prefs.usernum && !prefs.gazusernum)
        throw new AnyBalance.Error('Please enter User number or User number/Check number!');

    if(prefs.lang == 'en'){
        AnyBalance.requestGet('https://www.ipay.ge/switchLanguage.servlet?language=en');
    }else if(prefs.lang == 'ka'){
        AnyBalance.requestGet('https://www.ipay.ge/switchLanguage.servlet?language=ka');
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('debtElec')){
        if(prefs.usernum){
            AnyBalance.trace('Getting electricity...');
            var html = AnyBalance.requestPost(baseurl + '?catId=category.utility.key&serId=bog-comp-telasi&serviceId=bog-telasi-customer-info', {
                'service.parameterBeans[0].inputs[0].value':prefs.usernum
            });
            checkError(html, 'Telasi');
            getParam(html, result, 'name', /<input[^>]+id="bog_comp_telasi_customerName[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'address', /<input[^>]+id="bog_comp_telasi_streetName[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'debtElec', /<input[^>]+id="bog_comp_telasi_estimateDebt[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Can not get electricity debts: you have not entered User Number!');
        }
    }

    if(AnyBalance.isAvailable('debtClean')){
        if(prefs.usernum){
            AnyBalance.trace('Getting cleanup...');
            var html = AnyBalance.requestPost(baseurl + '?catId=category.utility.key&serId=bog-comp-cleanup&serviceId=bog-cleanup-customer-info', {
                'service.parameterBeans[0].inputs[0].value':prefs.usernum
            });
            checkError(html, 'Cleanup');
            getParam(html, result, 'name', /<input[^>]+id="bog_comp_cleanup_customerName[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'address', /<input[^>]+id="bog_comp_cleanup_streetName[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'debtClean', /<input[^>]+id="bog_comp_cleanup_estimateDebt[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Can not get cleaning payments debts: you have not entered User Number!');
        }
    }

    if(AnyBalance.isAvailable('debtWater')){
        if(prefs.usernum){
            AnyBalance.trace('Getting water...');
            var html = AnyBalance.requestPost(baseurl + '?catId=category.utility.key&serId=bog-comp-tbilisiwater&serviceId=bog-tbilisiwater-customer-info', {
                'service.parameterBeans[0].inputs[0].value':prefs.usernum
            });
            checkError(html, 'Tbilisi water');
            getParam(html, result, 'name', /<input[^>]+id="bog_comp_tbilisiwater_name[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'address', /<input[^>]+id="bog_comp_tbilisiwater_address[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'debtWater', /<input[^>]+id="bog_comp_tbilisiwater_debt[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Can not get water debts: you have not entered User Number!');
        }
    }

    if(AnyBalance.isAvailable('debtGas')){
        if(prefs.gazusernum){
            AnyBalance.trace('Getting gas...');
            if(prefs.gazusernum && !/^\d{9}$/.test(prefs.gazusernum))
                throw new AnyBalance.Error('Please enter 6 digits of User number and 3 digits of Check number without spaces and delimiters!');

            var html = AnyBalance.requestPost(baseurl + '?catId=category.tbilgazi.key&serId=bog-comp-tbilgazi-web&serviceId=bog-tbilgazi-verify', {
                'service.parameterBeans[0].inputs[0].value':prefs.gazusernum.substr(0,6),
                'service.parameterBeans[0].inputs[1].value':prefs.gazusernum.substr(6)
            });
            checkError(html, 'Tbilgazi');
            getParam(html, result, 'name', /<input[^>]+id="bog_comp_tbilgazi_web_name[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'address', /<input[^>]+id="bog_comp_tbilgazi_web_address[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'debtGas', /<input[^>]+id="bog_comp_tbilgazi_web_debt[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Can not get gas debts: you have not entered User Number with Check number!');
        }
    }

    AnyBalance.setResult(result);
}
