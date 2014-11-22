/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у на лицевом счете корпоративного тарифа сотового оператора МТС. Вход через корпоративный личный кабинет.

Сайт оператора: http://mts.ru/
Личный кабинет: https://ihelper.mts.ru/Ncih/
*/

function getHierarchyId(html){
    var availableHierarchy = getParam(html, null, null, /availableHierarchy:\s*(\[[^\]]*\])/);
    if(!availableHierarchy){
        throw new AnyBalance.Error("Не удалось найти ни верхний уровень иерархии, ни информации по текущему пользователю.");
    }

    AnyBalance.trace("Найдены иерархии: " + availableHierarchy);
    
    try{      
        availableHierarchy = new Function("return " + availableHierarchy)();
    }catch(e){
        throw new AnyBalance.error("Не удалось получить иерархию");
    }

    var baseid;
    for(var i=0; i<availableHierarchy.length; ++i){
        var it = availableHierarchy[i];
        if(!baseid || it.name == 'Биллинговая')
            baseid = it.id;
    }

    if(!baseid)
        throw new AnyBalance.error("Иерархия, похоже, пуста!");
    
    //Теперь у нас в baseid лежит id иерархии
    return baseid;
}

function main(){
    var baseurl = "https://ihelper.mts.ru/Ncih/";
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
        Name:prefs.login,
        Password:prefs.password
    });
    
    //Проверим, залогинились ли
    if(!/Security.mvc\/LogOff/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="(?:b_error|b_warning)"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true}

    if(/\/Ncih\/OwnInfo.mvc\/GetCurrentUserInfo/i.test(html)){
        //Похоже, это страница сотрудника, просмотр иерархии запрещен.
        var json = AnyBalance.requestPost(baseurl + 'OwnInfo.mvc/GetCurrentUserInfo', {
            __LOCAL_DATETIME__: new Date().getTime()
        });

        var info = getJson(json);
        if(info.errorMessage)
            throw new AnyBalance.Error('Ошибка получения информации по текущему сотруднику: ' + info.errorMessage);

        html = info.infoHtml;
        getParam(html, result, 'account', /\bЛС:\s*(\d+)/);
        getParam(html, result, 'holding', /<div[^>]*class="hierarchy-path"[^>]*>([\s\S]*?)(?:&gt;|<)/i, replaceTagsAndSpaces);
        getParam(html, result, 'contract', /Сотрудник[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'phone', /Номер телефона[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'expences', /Израсходовано по номеру[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }else{
        var hierid = getHierarchyId(html);
        
        var findnum = prefs.num || prefs.login;
        var json = AnyBalance.requestPost(baseurl + 'Hierarchy.mvc/GetHierarchyNodes', {
            from:0,
            to:299,
            filter:findnum,
            hierarchyType:'Billing',
            'objectSubtypeCodesFilter[0]':'Mobile',
            id:hierid,
            markCurrentSelection:true,
            __LOCAL_DATETIME__:new Date().toISOString()
        });
        
        AnyBalance.trace('Got hierarchy nodes for ' + findnum + ': ' + json);
        var info = getJson(json);
        if(!info.totalCount){
            throw new AnyBalance.Error("Ошибка поиска информации по номеру или счету " + info);
        }
        
        var hasPhone = false;
        for(var i=0; i<info.totalCount; ++i){
            var node = info.nodes[i];
            if(node.data.type == 'TerminalDevice'){
                hasPhone = true;
            }
        }
        
        var accNode = null, phoneNode = null;
        for(var i=0; i<info.totalCount; ++i){
            var node = info.nodes[i];
            if(node.data.type == 'Holding' && AnyBalance.isAvailable('holding')){
                result.holding = node.text;
            }
            if(node.data.type == 'Account'){
                accNode = node;
                if(AnyBalance.isAvailable('Account'))
                    result.account = node.text;
                if(!hasPhone)
                    break; //Если телефонов нет, значит, получаем инфу об аккаунте
            }
            if(node.data.type == 'TerminalDevice'){
                phoneNode = node;
                if(AnyBalance.isAvailable('phone'))
                    result.phone = node.text;
                break; //только первый телефон получаем
            }
            if(node.data.type == 'Contract' && AnyBalance.isAvailable('contract')){
                result.contract = node.text;
            }
        }
        
        if(!accNode && !phoneNode)
            throw new AnyBalance.Error("Не найдено ни одного счета или телефона с номером " + findnum);
        
        if(accNode && AnyBalance.isAvailable('balance', 'billing', 'acc_expences', 'last_pay_date', 'last_pay', 'debt', 'promise', 'promiseDate')){
            var html = AnyBalance.requestPost(baseurl + 'ObjectInfo.mvc/PersonalAccount', {objectId:accNode.data.objectId});
            result.__tariff = accNode.text;
            if(/Получение запрошенной информации в данный момент недоступно/i.test(html))
                AnyBalance.trace("Проблемы получения информации по л/с " + accNode.text + ": МТС сообщает, что получение запрошенной информации в данный момент недоступно");
            getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'billing', /Метод расчетов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'acc_expences', /Израсходовано за период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'last_pay_date', /Дата последней оплаты счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'last_pay', /Сумма последней оплаты счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'debt', /Сумма по неоплаченным счетам[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'promise', /Сумма обещанного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'promiseDate', /Срок действия обещанного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        }
        
        if(phoneNode){
            var html = AnyBalance.requestPost(baseurl + 'ObjectInfo.mvc/Phone', {objectId:phoneNode.data.objectId});
            if(/Получение запрошенной информации в данный момент недоступно/i.test(html))
                AnyBalance.trace("Проблемы получения информации по номеру " + phoneNode.text + ": МТС сообщает, что получение запрошенной информации в данный момент недоступно");
            getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'expences', /Израсходовано по номеру[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }
   
    AnyBalance.setResult(result);
}
