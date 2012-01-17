/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Киевстар корпоративный (Украина).

Сайт оператора: http://my.kyivstar.ua/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "https://my.kyivstar.ua/";

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "tbmb/login/perform.do", {
        isSubmitted: "true",
        user: prefs.login,
        password: prefs.password
    });
    
    var matches = html.match(/<td class="redError">([\s\S]*?)<\/td>/i);
    if(matches){
        throw new AnyBalance.Error(matches[1]);
    }
    
    var hierarchy = AnyBalance.requestGet(baseurl + "tbmb/flash/hierarchy?action=hier");
    //<hh><h id='4199266' type='BILLING' name='Billing Hierarchy'><n i='4199267' t='1' v='Billing Hierarchy'><n i='8974631' t='1' virt='0' v='2802451'><n i='17496882' t='3' virt='0' v='4654037' c='' m='+380673401254'/></n></n></h></hh>
    var $hierarchy = $(hierarchy);
    var hierid = $hierarchy.find("h").attr('id');
    var nodeid_info = $hierarchy.find('n[m="'+prefs.login+'"]').attr('i');
    var nodeid_balance = $hierarchy.find('n[m="'+prefs.login+'"]').parent().attr('i');
    
    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance')){
        var balance_html = AnyBalance.requestGet(baseurl + "tbmb/flash/hierarchy?action=charges&nodeId=" + nodeid_balance + "&hierId=" + hierid);
        //<cc i='8974631'><c i='17496882' c='87.65'/></cc>
        var balance = $(balance_html).find('c').attr('c');
        if(balance)
            result.balance = balance;
    }

    //https://my.kyivstar.ua/tbmb/flash/hierarchy?action=mtninfo&hierId=4199266&nodeId=17496882&time=261
    var info_html = AnyBalance.requestGet(baseurl + "tbmb/flash/hierarchy?action=mtninfo&nodeId=" + nodeid_info + "&hierId=" + hierid);
    var $info = $(info_html);
    
    result.__tariff = $info.find('rp').text();
    
    if(AnyBalance.isAvailable('statuslock')){
        var val = $info.find('status').text();
        if(val)
            result.statuslock = val;
    }
    
    if(AnyBalance.isAvailable('min_left')){
        //bonuses bonus name:contains("Остаток минут для звонков на номера абонентов по Украине"), 
        var val = $info.find('bonuses bonus name:contains("Остаток минут для звонков на номера абонентов по Украине"),\n\
                              bonuses bonus name:contains("Залишок хвилин для дзвінків телефонні номери абонентів по Україні"),\n\
                              bonuses bonus name:contains("Balance of minutes for accomplishing of calls to the subscribers in Ukraine")').next().text();
        if(val){
            var matches = val.match(/(\d+)/);
            if(matches)
                result.min_left = parseInt(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('min_group')){
        var val = $info.find('bonuses bonus name:contains("Остаток минут для звонков внутри закрытой абонентской группы"),\n\
                              bonuses bonus name:contains("Залишок хвилин для дзвінків всередині закритої абонентської групи"),\n\
                              bonuses bonus name:contains("Balance of minutes for accomplishing of calls inside of the closed subscriber group")').next().text();
        if(val){
            var matches = val.match(/(\d+)/);
            if(matches)
                result.min_group = parseInt(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('traffic_left')){
        var val = $info.find('bonuses bonus name:contains("Остаток Internet GPRS"),\n\
                              bonuses bonus name:contains("Залишок Internet GPRS"),\n\
                              bonuses bonus name:contains("Internet GPRS balance")').next().text();
        if(val){
            var matches = val.match(/([\d\.]+)/);
            if(matches)
                result.traffic_left = parseFloat(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('sms_left')){
        var val = $info.find('bonuses bonus name:contains("Остаток SMS"),\n\
                              bonuses bonus name:contains("Залишок SMS"),\n\
                              bonuses bonus name:contains("Balance SMS")').next().text();
        if(val){
            var matches = val.match(/(\d+)/);
            if(matches)
                result.sms_left = parseInt(matches[1]);
        }
    }
    
    AnyBalance.setResult(result);
}
