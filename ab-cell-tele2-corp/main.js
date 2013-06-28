/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Tele2 (Россия).

Сайт оператора: http://www.tele2.ru/
Личный кабинет: https://webcare.tele2.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://webcare.tele2.ru/";


    AnyBalance.setDefaultCharset('utf-8');
//    var html = AnyBalance.requestGet(baseurl + "c/portal/login?k=2");
//    AnyBalance.requestPost(baseurl + "PT_SML_AA_CALoginPortlet_v1.1-portlet/GetMode", {
//        u_name:prefs.login,
 //       u_password:prefs.password
  //  }, {Referer: baseurl + 'c/portal/login?k=2'});

    var html = AnyBalance.requestPost(baseurl + "c/portal/login?cmd=login&redirect=https://webcare.tele2.ru/c&fail_redirect=https://webcare.tele2.ru/group/public/login?p_p_id=AACALoginPortlet_WAR_PT_SML_AA_CALoginPortlet_v11portlet&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_count=1", {
        j_username: prefs.login,
        j_password: prefs.password,
        auth_type: 1
    });

    if(html.indexOf('/group/public/login') >= 0){
      //Не удалось войти
      throw new AnyBalance.Error('Не удалось войти. Неправильный логин-пароль или проблемы на сайте.');
    }

    html = AnyBalance.requestGet(baseurl + "c");
    
    var result = {success: true};
    
    getParam(html, result, 'balance', /Всего доступно средств:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_personal', /Персональные балансы:[\s\S]*?Итого доступно:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_corp', /Корпоративные балансы:[\s\S]*?Итого доступно:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    var eventid = getParam(html, null, null, /<a[^>]*?id="([^"]*)"[^>]*?><div><table cellpadding="0" cellspacing="0"><tr><td>Персональные данные/i);
    var shorteventid = eventid.replace(/\.\d+$/, '');
    var params = {
        'ice.submit.partial': true,
        'ice.event.target': '',
        'ice.event.captured': eventid,
        'ice.event.type':'onclick',
        'ice.event.alt':false,
        'ice.event.ctrl':false,
        'ice.event.shift':false,
        'ice.event.meta':false,
        'ice.event.x':549,
        'ice.event.y':341,
        'ice.event.left':false,
        'ice.event.right':false,
        '_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:_idcl': eventid.replace(/\.\d+$/, ''),
        '':'',
        '_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:_id_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:j_id88dropID':'',
        '_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:_id_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:j_id88status':'',
        '_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:balance_selectionHolder':''
    };

    params[shorteventid + ':corporate_balances_selectionHolder']='';
    params[shorteventid + ':personal_balances_selectionHolder']='';
    params['_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm:personalAccountFormTmp'] = 'tmp';
    params['javax.faces.RenderKitId'] = 'ICEfacesRenderKit';
    params['javax.faces.ViewState'] = 1;
    params['icefacesCssUpdates'] = '';
    params['_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm']='_WCPersonalAccount_WAR_PT_CC_WCPortlet_v1portlet_:personalAccountForm';
    params[eventid] = eventid;
    params['ice.session']= getParam(html, null, null, /session:\s*['"]([^'"]*)['"]/);
    params['ice.view']=1;
    params['ice.focus']='undefined';
    params['rand']=0.8372334879823029;
    
    var html = AnyBalance.requestPost(baseurl + "PT_CC_WCPortlet_v1-portlet/block/send-receive-updates", params);
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<span[^>]*>(.*?)<\/span>/i, [], html_entity_decode);
    getParam(html, result, 'company', /Наименование[\s\S]*?<span[^>]*>(.*?)<\/span>/i, [], html_entity_decode);
    getParam(html, result, 'userName', /Абонент\s*<[\s\S]*?<span[^>]*>(.*?)<\/span>/i, [], html_entity_decode);
    getParam(html, result, 'status', /Статус абонента[\s\S]*?<span[^>]*>(.*?)<\/span>/i, [], html_entity_decode);
    
    AnyBalance.setResult(result);
}
